import { parse } from "../resp-parser.js"

// "$-1\r\n"
// "*1\r\n$4\r\nping\r\n”
// "*2\r\n$4\r\necho\r\n$11\r\nhello world\r\n"
// "*2\r\n$3\r\nget\r\n$3\r\nkey\r\n"
// "+OK\r\n"
// "-Error message\r\n"
// "$0\r\n\r\n"
// "+hello world\r\n"

describe('Redis RESP Parser', () => {
    describe('Bulk strings', () => {
        test('should pass a null bulk string "$-1\\r\\n" as null', () => {
            const message = '$-1\r\n';
            const result = parse(message);
            expect(result).toBeNull();
        });

        test('should pass an empty bulk string "$0\\r\\n\\r\\n" as an empty string', () => {
            const message = '$0\r\n\r\n';
            const result = parse(message);
            expect(result).toBe('');
        });
    });

    describe('Arrays', () => {
        test('should parse "*1\\r\\n$4\\r\\nping\\r\\n" as ["ping"]', () => {
            const message = "*1\r\n$4\r\nping\r\n";
            const result = parse(message);
            expect(result).toEqual(['ping']);
        });

        test('should parse "*2\\r\\n$4\\r\\necho\\r\\n$11\\r\\nhello world\\r\\n" as ["echo", "hello world"]', () => {
            const message = "*2\r\n$4\r\necho\r\n$11\r\nhello world\r\n";
            const result = parse(message);
            expect(result).toEqual(['echo', 'hello world']);
        });
    });

    describe('Simple Strings', () => {
        test('should parse "+OK\\r\\n" as "OK"', () => {
            const message = "+OK\r\n";
            const result = parse(message);
            expect(result).toBe('OK');
        });

        test('should parse "+hello world\\r\\n" as "hello world"', () => {
            const message = "+hello world\r\n";
            const result = parse(message);
            expect(result).toBe('hello world');
        });
    });

    describe('Errors', () => {
        test('should parse "-Error message\\r\\n" as an Error message', () => {
            const message = "-Error message\r\n";
            const result = parse(message);
            expect(result.message).toBe('Error message');
        });
    });
});