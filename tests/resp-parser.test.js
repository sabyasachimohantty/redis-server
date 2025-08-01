import {parse} from "../resp-parser.js"

// "$-1\r\n"
// "*1\r\n$4\r\nping\r\n”
// "*2\r\n$4\r\necho\r\n$11\r\nhello world\r\n”
// "*2\r\n$3\r\nget\r\n$3\r\nkey\r\n”
// "+OK\r\n"
// "-Error message\r\n"
// "$0\r\n\r\n"
// "+hello world\r\n”

describe('Redis RESP Parser', () => {
    test('should parse a null bulk string ("$-1\\r\\n") as null.', () => {
        const message = '$-1\r\n';
        const result = parse(message);
        expect(result).toBeNull()
    })

    test('should parse a null bulk string ("$-1\\r\\n") as null.', () => {
        const message = "*1\r\n$4\r\nping\r\n";
        const result = parse(message);
        expect(result).toEqual(['ping'])
    })

    test('should parse a null bulk string ("$-1\\r\\n") as null.', () => {
        const message = "*2\r\n$4\r\necho\r\n$11\r\nhello world\r\n";
        const result = parse(message);
        expect(result).toEqual(['echo', 'hello world'])
    })
})