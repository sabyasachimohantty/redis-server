import { createClient } from 'redis';
import { spawn } from 'child_process';
import net from 'net';

const TEST_PORT = 3000;
let serverProcess;
let client;

function waitForPort(port, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const check = () => {
            const socket = net.createConnection({ port }, () => {
                socket.destroy();
                resolve();
            });
            socket.on('error', () => {
                if (Date.now() - start >= timeout) {
                    reject(new Error('Timeout waiting for server to start'));
                } else {
                    setTimeout(check, 100);
                }
            });
        };
        check();
    });
}

beforeAll(async () => {
    // Set timeout for this hook only
    test.setTimeout?.(15000); // ✅ only if 'jest' is not globally defined

    serverProcess = spawn('node', ['server.js'], {
        env: { ...process.env, PORT: TEST_PORT },
        stdio: 'inherit',
    });

    await waitForPort(TEST_PORT);

    client = createClient({ socket: { port: TEST_PORT } });
    await client.connect();
});

afterAll(async () => {
    if (client) await client.quit();
    if (serverProcess) serverProcess.kill();
});

test('PING command should return PONG', async () => {
    const result = await client.ping();
    expect(result).toBe('PONG');
});
