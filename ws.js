const wss = require('./server');
const UserManager = require('./userManager');
const userManager = new UserManager();
const Game = require('./game');
const game = new Game();

const SentToClient = (ws, route, data = null) =>{
    ws.send(JSON.stringify({ route, data }));
}

const userAuth = (ws, token) =>{
    if(token === null){
        SentToClient(ws, 'error', 'Войдите в аккаунт или зарегистрируйтесь');
        return ws.close();
    }
    const user = userManager.verifyToken(token);
    if(user === null){
        SentToClient(ws, 'error', 'Войдите в аккаунт или зарегистрируйтесь');
        return ws.close();
    }
    ws.user = user.data;
}

wss.on('connection', (ws) => {
    console.log('socket connected');
    ws.on('message', async (data) => {
        const inputData = JSON.parse(data);
        if(inputData.route === 'auth'){
          //userAuth(ws, inputData.data);
          ws.user = { id: inputData.data };
          console.log('auth');
          console.log(ws.user)
        }else{
            //console.log(`From ${ws.user.nickname} with id - ${ws.user.id}`);
            game.getMessage(ws, inputData.route, inputData.data);
        }
    });
    ws.on('close', () =>{
        console.log('socket disconnected');
    })
});