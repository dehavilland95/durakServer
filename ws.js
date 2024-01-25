const wss = require('./server');

wss.on('connection', (ws) => {
    console.log('socket connected');
    ws.on('message', async (data) => {
        const inputData = JSON.parse(data);
        console.log(inputData.data)
    });
    ws.on('close', () =>{
        console.log('socket disconnected');
    })
})