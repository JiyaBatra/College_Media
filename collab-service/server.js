const WebSocket = require('ws');
const http = require('http');
const { setupWSConnection } = require('y-websocket/bin/utils');
const { LeveldbPersistence } = require('y-leveldb');
const { setPersistence } = require('y-websocket/bin/utils');
const Y = require('yjs');

// 1. Setup Persistence (LevelDB)
const ldb = new LeveldbPersistence('./storage');

setPersistence({
    bindState: async (docName, ydoc) => {
        // Load from LevelDB into various Y.Doc
        const persistedYdoc = await ldb.getYDoc(docName);
        const newUpdates = Y.encodeStateAsUpdate(persistedYdoc);
        Y.applyUpdate(ydoc, newUpdates);

        // Listen for updates and save to LevelDB
        ydoc.on('update', (update) => {
            ldb.storeUpdate(docName, update);
        });
    },
    writeState: async (docName, ydoc) => {
        // Typically redundant if we listen to 'update', but good for cleanup
        await ldb.storeUpdate(docName, Y.encodeStateAsUpdate(ydoc));
    }
});

// 2. HTTP Server
const server = http.createServer((request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/plain' });
    response.end('Real-Time Collaboration Service (Yjs + LevelDB)');
});

// 3. WebSocket Server
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (conn, req, { docName = req.url.slice(1) } = {}) => {
    // Use y-websocket default handler
    setupWSConnection(conn, req, { docName });
});

// 4. Upgrade Handling
server.on('upgrade', (request, socket, head) => {
    // Parse URL to get docname or logic
    // e.g. ws://localhost:1234/my-document-id
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

const PORT = process.env.PORT || 1234;
server.listen(PORT, () => {
    console.log(`✍️  Collab Service running on http://localhost:${PORT}`);
    console.log(`💾 Persistence: LevelDB (./storage)`);
});
