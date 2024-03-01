const { createServer } = require('http');
const WebSocket = require('ws');
const routes = require('./httpRoutes');
const utils = require('./utils');
const PORT = 80;

const server = createServer((req, res) =>{
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if(req.method === 'OPTIONS'){
        res.writeHead(200);
        res.end();
    }else if(req.method === 'POST'){
        let body = '';
        req.on('data', chunk => { body += chunk });
        req.on('end', async () =>{
            try{
                const inputData = body.slice(body.indexOf('?') + 1);
                const data = utils.extractJsonData(inputData);
                const route = req.url.slice(1);
                if(routes[route]) await routes[route](res, data);
            }catch(e){
                console.log(e);
            }
        })
    }
});

server.listen(PORT, () => console.log('Server listen at port: ', PORT));

const ws = new WebSocket.Server({ server });

module.exports = ws;