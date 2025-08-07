import net from 'net';
import { parse } from './resp-parser.js';
import saveRDB from './save.js';
import loadRDB from './restore.js';

const server = net.createServer((socket) => {
    socket.on('data', async (data) => {
        const command = parse(data.toString());
        const [cmd, ...args] = command;

        if (!cmd) {
            return sendError(socket, `Empty command`)
        }

        switch (cmd.toUpperCase()) {
            case 'PING':
                if (args.length === 0) sendSimpleString(socket, 'PONG');
                else sendError(socket, 'Wrong number of arguments for PING');
                break;

            case 'ECHO':
                if (args.length === 1) sendBulkString(socket, args[0]);
                else sendError(socket, 'Wrong number of arguments for ECHO');
                break;

            case 'SET':
                if (args.length === 2) {
                    dictionary.set(args[0], args[1]);
                    sendSimpleString(socket, 'OK');
                } else if (args.length === 4) {
                    const [key, value, option, time] = args;
                    dictionary.set(key, value);

                    let timeout;
                    if (option === 'EX') timeout = parseInt(time) * 1000;
                    else if (option === 'PX') timeout = parseInt(time);
                    else if (option === 'EXAT') timeout = parseInt(time) * 1000 - Date.now();
                    else if (option === 'PXAT') timeout = parseInt(time) - Date.now();
                    else return sendError(socket, 'Invalid expiration option');

                    setTimeout(() => dictionary.delete(key), timeout);
                    sendSimpleString(socket, 'OK');
                } else {
                    sendError(socket, 'Wrong number of arguments for SET');
                }
                break;

            case 'GET':
                if (args.length === 1) {
                    const val = dictionary.get(args[0]);
                    if (val !== undefined) sendBulkString(socket, String(val));
                    else sendBulkString(socket, null);
                } else {
                    sendError(socket, 'Wrong number of arguments for GET')
                }
                break;

            case 'EXISTS':
                if (args.length === 1) sendInteger(socket, dictionary.has(args[0]) ? 1 : 0);
                else sendError(socket, 'Wrong number of argument for EXISTS');
                break;

            case 'DEL':
                if (args.length >= 1) {
                    args.forEach((key) => dictionary.delete(key));
                    sendSimpleString(socket, 'OK');
                } else {
                    sendError(socket, 'Wrong number of arguments for DEL');
                }
                break;

            case 'INCR':
            case 'DECR':
                if (args.length === 1) {
                    let val = dictionary.get(args[0]);

                    if (val === undefined) val = 0;
                    else val = parseInt(val);

                    if (!Number.isInteger(val)) {
                        return sendError(socket, 'Value is not an integer');
                    }

                    val = cmd === 'INCR' ? val + 1 : val - 1;
                    dictionary.set(args[0], val);
                    sendInteger(socket, val);
                } else {
                    sendError(socket, `Wrong number of arguments for ${cmd}`);
                }
                break;

            case 'RPUSH':
            case 'LPUSH':
                if (args.length >= 2) {
                    const [key, ...values] = args;

                    if (!dictionary.get(key)) dictionary.set(key, []);
                    const list = dictionary.get(key);

                    if (!Array.isArray(list)) return sendError(socket, 'Key is not a list');

                    if (cmd === 'RPUSH') values.forEach(val => list.push(val));
                    else values.forEach(val => list.unshift(val));

                    sendInteger(socket, list.length);
                } else {
                    sendError(socket, `Wroung number of arguments for ${cmd}`);
                }
                break;

            case 'SAVE':
                if (args.length === 0) {
                    await saveRDB(dictionary);
                    sendSimpleString(socket, 'OK');
                } else {
                    sendError(socket, 'Wrong number of arguments for SAVE');
                }
                break;

            default:
                sendError(socket, `Unknown command ${cmd}`);
                break;

        }
    })

    socket.on('end', async () => {
        await saveRDB(dictionary);
        console.log('Client disconnected');
    })

    socket.on('error', (err) => {
        console.log(`Socket error: ${err.message}`);
    })
})



const PORT = process.env.PORT || 8080;
const dictionary = new Map(Object.entries(await loadRDB()));
server.listen(PORT, (err) => {
    if (err) {
        console.log(`Error while running server: ${err.message}`);
        return
    }
    console.log(`REDIS SERVER is successfully running on ${PORT}`);
})

// Reply Helpers
function sendSimpleString(socket, str) {
    socket.write(`+${str}\r\n`);
}

function sendBulkString(socket, str) {
    if (str === null) socket.write(`$-1\r\n`);
    else socket.write(`\$${str.length}\r\n${str}\r\n`);
}

function sendInteger(socket, int) {
    socket.write(`:${int}\r\n`);
}

function sendError(socket, msg) {
    socket.write(`-ERR ${msg}\r\n`);
}