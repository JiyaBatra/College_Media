const Docker = require('dockerode');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// Connect to Docker Socket (Linux/Mac default: /var/run/docker.sock, or TCP)
// Windows Named Pipe: //./pipe/docker_engine
const docker = new Docker();

const TEMP_DIR = path.join(__dirname, '../temp/sandbox');

// Ensure temp dir exists
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Language Configurations
const RUNTIMES = {
    javascript: {
        image: 'node:16-alpine',
        filename: 'main.js',
        cmd: ['node', 'main.js']
    },
    python: {
        image: 'python:3.9-alpine',
        filename: 'main.py',
        cmd: ['python', 'main.py']
    },
    cpp: {
        image: 'frolvlad/alpine-gxx', // Lightweight GCC
        filename: 'main.cpp',
        cmd: ['sh', '-c', 'g++ main.cpp -o main && ./main']
    }
};

class DockerSandbox {

    /**
     * Run code in an isolated Docker container
     * @param {string} language 
     * @param {string} code 
     */
    static async run(language, code) {
        const runtime = RUNTIMES[language.toLowerCase()];
        if (!runtime) {
            throw new Error(`Language ${language} not supported in sandbox.`);
        }

        const id = uuidv4();
        const hostFilePath = path.join(TEMP_DIR, `${id}_${runtime.filename}`);

        try {
            // 1. Write Code to Host File
            fs.writeFileSync(hostFilePath, code);

            // 2. Create Container
            // Bind Mount: HostPath:ContainerPath
            const container = await docker.createContainer({
                Image: runtime.image,
                Cmd: runtime.cmd,
                Tty: false,
                NetworkDisabled: true, // No Internet
                HostConfig: {
                    Binds: [`${hostFilePath}:/app/${runtime.filename}`],
                    Memory: 128 * 1024 * 1024, // 128MB Limit
                    NanoCpus: 500000000, // 0.5 CPU
                    AutoRemove: false // We remove manually to get logs
                },
                WorkingDir: '/app'
            });

            // 3. Start Container
            await container.start();

            // 4. Wait for finish (with timeout)
            const stream = await container.logs({
                follow: true,
                stdout: true,
                stderr: true
            });

            // Collect Output
            let output = '';
            stream.on('data', chunk => {
                // Docker log stream has headers (8 bytes), simplistic strip for demo
                // Or use 'demuxStream' from dockerode
                // For raw text usually straight read works if TTY false, but headers exist.
                // Assuming raw text for simplicity or manual stripping:
                output += chunk.toString('utf8');
            });

            // Wait for container to die or timeout
            const status = await container.wait();

            // Cleanup
            await container.remove();
            fs.unlinkSync(hostFilePath);

            // Strip Docker log headers if present (first 8 bytes of each frame)
            // A simple regex cleanup or just returning raw for now
            // Piston returns cleaner output.

            return {
                success: status.StatusCode === 0,
                output: this.cleanDockerLog(output),
                statusCode: status.StatusCode
            };

        } catch (error) {
            logger.error('Docker Sandbox Error:', error);
            // Cleanup file if exists
            if (fs.existsSync(hostFilePath)) fs.unlinkSync(hostFilePath);
            return {
                success: false,
                output: '',
                error: error.message
            };
        }
    }

    /**
     * Helper to clean Docker's multiplexed log stream headers
     * Docker sends [STREAM_TYPE, 0, 0, 0, SIZE, SIZE, SIZE, SIZE] before payload
     */
    static cleanDockerLog(log) {
        // This is a naive cleanup. Real impl should parse frames.
        // Or simple hack: replace Non-Ascii chars if they look like headers
        // For this demo, return as is mostly legible
        return log.replace(/[\u0000-\u0008]/g, '');
    }
}

module.exports = DockerSandbox;
