
// + String
// - Error
// $ Bulk String
// * Array
// : Integer

function parse(message) {
    let i = 0
    return parseRedisMessage(message)

    function parseRedisMessage(message) {
        const type = message[i]
        i++
        switch (type) {
            case '*':
                return parseArray(message)
            case '$':
                return parseBulkString(message)
            case '+':
                return parseString(message)
            case ':':
                return parseInteger(message)
            case '-':
                return parseError(message)
            default:
                return 'Invalid message'
        }
    }

    function parseArray(message) {
        if (message[i] === '-') return null
        let size = 0
        while (message[i] !== '\r') {
            size *= 10
            size += parseInt(message[i])
            i++
        }
        i++
        if (message[i] !== '\n') return 'Invalid message'
        i++
        let ret = []
        while (size > 0) {
            ret.push(parseRedisMessage(message))
            size--
            i += 2
        }

        return ret
    }

    function parseBulkString(message) {
        if (message[i] === '-') return null
        let size = 0
        while (message[i] !== '\r') {
            size *= 10
            size += parseInt(message[i])
            i++
        }
        i++
        if (message[i] !== '\n') return 'Invalid message'
        i++
        let ret = message.slice(i, i + size)
        i += size
        return ret
    }

    function parseString(message) {
        let ret = ''
        while (message[i] !== '\r') {
            ret += message[i]
            i++
        }
        return ret
    }

    function parseInteger(message) {
        let ret = 0
        let sign = 1
        if (message[i] === '-') {
            sign = -1
            i++
        } else if (message[i] === '+') {
            i++
        }

        while (message[i] !== '\r') {
            ret *= 10
            ret += parseInt(message[i])
            i++
        }

        return sign * ret
    }

    function parseError(message) {
        return message.slice(i, message.length - 2)
    }

}

// console.log(parse('*1\r\n$7\r\nCOMMAND\r\n'))

export {
    parse
}