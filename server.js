const { createServer } = require('http');
const WebSocket = require('ws');
const PORT = 80;

const server = createServer();

server.listen(PORT, () => console.log('Server listen at port: ', PORT));

const ws = new WebSocket.Server({ server });

module.exports = ws;