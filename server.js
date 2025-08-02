import net from 'net'
import {parse} from './resp-parser.js'

const dictionary = new Map()
const server = net.createServer((socket) => {
    socket.on('data', (data) => {
        const command = parse(data.toString())
        console.log(command[0])
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