import net from 'net';
import {parse} from './resp-parser.js';
import saveRDB from './save.js';

const dictionary = new Map();
const server = net.createServer((socket) => {
    socket.on('data', (data) => {
        const command = parse(data.toString());
        const [cmd, ...args] = command;
        console.log(cmd)

        if (!cmd) {
            return sendError(socket, `Empty command`)
        }

        switch (cmd) {
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
                    else sendBulkString(socket, '');
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
                
        }

        if (command.length === 1 && command[0] === 'PING') {
            socket.write('+PONG\r\n')
        } else if (command.length === 2 && command[0] === 'ECHO') {
            socket.write(`\$${command[1].length}\r\n${command[1]}\r\n`)
        } else if (command.length === 3 && command[0] === 'SET') {
            dictionary.set(command[1], command[2])
            socket.write(`+OK\r\n`)
        } else if (command.length === 2 && command[0] === 'GET') {
            if (dictionary.has(command[1])){
                const val = dictionary.get(command[1])
                socket.write(`\$${val.length}\r\n${val}\r\n`)
            } else {
                socket.write(`+INVALID KEY\r\n`)
            }
        } else if (command.length === 5 && command[0] === 'SET') {
            if (command[3] === 'EX') {
                dictionary.set(command[1], command[2])
                setTimeout(() => {
                    dictionary.delete(command[1])
                }, command[4] * 1000)
                socket.write(`+OK\r\n`)
            } else if (command[3] === 'PX') {
                dictionary.set(command[1], command[2])
                setTimeout(() => {
                    dictionary.delete(command[1])
                }, command[4])
                socket.write(`+OK\r\n`)
            } else if (command[3] === 'EXAT') {
                dictionary.set(command[1], command[2])
                setTimeout(() => {
                    dictionary.delete(command[1])
                }, command[4] * 1000 - Date.now())
                socket.write(`+OK\r\n`)
            } else if (command[3] === 'PXAT') {
                dictionary.set(command[1], command[2])
                setTimeout(() => {
                    dictionary.delete(command[1])
                }, command[4] - Date.now())
                socket.write(`+OK\r\n`)
            } else {
                socket.write(`+INVALID OPTION\r\n`)
            }
        } else if (command.length === 2 && command[0] === 'EXISTS') {
            if (dictionary.has(command[1])) {
                socket.write(`:1\r\n`)
            } else {
                socket.write(`:0\r\n`)
            }
        } else if (command.length >= 2 && command[0] === 'DEL') {
            command.slice(1).forEach((key) => {
                dictionary.delete(key)
            })
            socket.write(`+OK\r\n`)
        } else if (command.length === 2 && command[0] === 'INCR') {
            if (dictionary.has(command[1]) && Number.isInteger(dictionary.get(command[1])) ) {
                let val = dictionary.get(command[0])
                dictionary.set(command[1], val++)
                socket.write(`:${val}\r\n`)
            } else {
                socket.write(`+INVALID KEY\r\n`)
            }
        } else if (command.length === 2 && command[0] === 'DECR') {
            if (dictionary.has(command[1]) && Number.isInteger(dictionary.get(command[1])) ) {
                let val = dictionary.get(command[0])
                dictionary.set(command[1], val--)
                socket.write(`:${val}\r\n`)
            } else {
                socket.write(`+INVALID KEY\r\n`)
            }
        } else if (command.length >= 3 && command[0] === 'RPUSH') {
            if (!dictionary.has(command[1])) {
                dictionary.set(command[1], [])
            }
            if (Array.isArray(dictionary.get(command[1]))) {
                command.slice(2).forEach((val) => {
                    dictionary.get(command[1]).push(val)
                })
                socket.write(`:${dictionary.get(command[1]).length}\r\n`)
            } else {
                socket.write(`-TYPEERROR INVALID FUNcTION`)
            }
        } else if (command.length >= 3 && command[0] === 'LPUSH') {
            if (!dictionary.has(command[1])) {
                dictionary.set(command[1], [])
            }
            if (Array.isArray(dictionary.get(command[1]))) {
                command.slice(2).forEach((val) => {
                    dictionary.get(command[1]).unshift(val)
                })
                socket.write(`:${dictionary.get(command[1]).length}\r\n`)
            } else {
                socket.write(`-TYPEERROR INVALID FUNcTION`)
            }
        } else if (command.length === 1 && command[0] === 'SAVE') {
            saveRDB(dictionary)
            
        } else {
            socket.write('+INVALID COMMAND\r\n')
        }
    })

    socket.on('end', () => {
        console.log('Client disconnected')
    })

    socket.on('error', (err) => {
        console.log(`Socket error: ${err.message}`)
    })
})



const PORT = process.env.PORT || 8080
server.listen(PORT, (err) => {
    if (err) {
        console.log(`Error while running server: ${err.message}`)
        return
    }
    console.log(`REDIS SERVER is successfully running on ${PORT}`)
})

// Reply Helpers
function sendSimpleString(socket, str) {
    socket.write(`+${str}\r\n`);
}

function sendBulkString(socket, str) {
    socket.write(`\$${str.length}\r\n${str}\r\n`);
}

function sendInteger(socket, int) {
    socket.write(`:${int}\r\n`);
}

function sendError(socket, msg) {
    socket.write(`-ERR ${msg}\r\n`);
}