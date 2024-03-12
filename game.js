const config  = require('./config');
const utils = require('./utils');
// spades (пики)
// hearts (червы)
// diamonds (бубны) 
// clubs (трефы)
// trump (козырь)
class Game{
    constructor(){
        this.initRooms({ x2: 2, x3: 3, x4: 2, x5: 1, x6: 1 });
        this.timer();
    } 
    rooms = {};
    actions = {
        sitDown: (ws, { placeNumber, roomId }) =>{
            console.log({roomId})
            if(!this.rooms[roomId]) 
                return ws.send(JSON.stringify({ route: 'error', data: 'Некорректно указана комната' }));
            if(placeNumber < 1 || placeNumber > this.rooms[roomId].playersCount)
                return ws.send(JSON.stringify({ route: 'error', data: 'Некорректно указано место' }));
            const place = `player${placeNumber}`;
            if(this.rooms[roomId][place])
                return ws.send(JSON.stringify({ route: 'error', data: 'Место занято' }));
            this.rooms[roomId][place] = {
                position: placeNumber,
                playerLeft: '',
                playerRight: '',
                socket: ws,
                cards: [],
                playerId: ws.user.id,
                sayIPickUp: false
            };
            ws.user.roomId = roomId;
            this.rooms[roomId][ws.user.id] = place;
            if(this.areAllPlacesFilled(roomId)){
                this.startGame(roomId);
            }
            ws.send(JSON.stringify({ route: 'youSatDown' }));
        },
        attack: (ws, cardTitle) =>{ // хожу или подкидываю
            const roomId = ws.user.roomId;
            const position = this.rooms[roomId][ws.user.id];
            if(!position)
                return ws.send(JSON.stringify({ route: 'error', data: 'Вы не находитесь за столом' }));
            if(this.rooms[roomId].action !== 'attack')
                return ws.send(JSON.stringify({ route: 'error', data: 'Сейчас нельзя атаковать' }));
            if(this.rooms[roomId].whoseAttack !== position)
                return ws.send(JSON.stringify({ route: 'error', data: 'Сейчас не вы ходите' }));
            const card = this.takeCard(position, cardTitle, roomId);
            if(card === null)
                return ws.send(JSON.stringify({ route: 'error', data: 'Невозможно походить этой картой' }));
            const result = this.canIUseThisCard(card, roomId);
            if(result === false)
                return ws.send(JSON.stringify({ route: 'error', data: 'Вы не можете ходить этой картой' }));
            this.rooms[roomId].cardsAttack.push(card);
            if(this.isGameOver(roomId)){
                const looser = this.playerWithCards(roomId);
                return this.gameOver(looser, roomId);
            }
            if(!this.rooms[roomId][this.rooms[roomId].whoseDefense].sayIPickUp) 
                this.rooms[roomId].action = 'defense';
            this.updateTimer(roomId);
            this.sendNewInfoForAllInRoom(roomId);
            this.rooms[roomId][position].socket.send(JSON.stringify({
                route: 'cardsUpdate', data: this.rooms[roomId][position].cards }));
        },
        defense: (ws, cardTitle) =>{ // бью
            const roomId = ws.user.roomId;
            const position = this.rooms[roomId][ws.user.id];
            if(!position)
                return ws.send(JSON.stringify({ route: 'error', data: 'Вы не находитесь за столом' }));
            if(this.rooms[roomId].action !== 'defense')
                return ws.send(JSON.stringify({ route: 'error', data: 'Сейчас не бьются' }));
            if(this.rooms[roomId].whoseDefense !== position)
                return ws.send(JSON.stringify({ route: 'error', data: 'Сейчас не вы бьетесь' }));
            if(this.rooms[roomId][position].iPickUp)
                return ws.send(JSON.stringify({ route: 'error', data: 'Невозможно побить, вы уже нажали взять' }));
            
            const card = this.takeCard(position, cardTitle, roomId);
            if(card === null)
                return ws.send(JSON.stringify({ route: 'error', data: 'У вас нет этой карты' }));

            if(!this.canFirstCardBeatSecond(
                card, this.rooms[roomId].cardsAttack[this.rooms[roomId].cardsAttack.length - 1], roomId)){
                this.rooms[roomId][position].cards.push(card);
                return ws.send(JSON.stringify({ route: 'error', data: 'Ваша карта не бьет эту карту' }));
            }
            this.rooms[roomId].cardsDefense.push(card);
            if(this.isGameOver(roomId)) {
                const looser = this.playerWithCards(roomId);
                return this.gameOver(looser, roomId);
            }
            const outOfCards = this.rooms[roomId][position].cards.length === 0 
                || (this.rooms[roomId][this.rooms[roomId][position].playerLeft].cards.length === 0 
                    && this.rooms[roomId][this.rooms[roomId][position].playerRight].cards.length === 0);
            if(outOfCards || this.isMaxCardsCountInTable(roomId)){
                const first = this.rooms[roomId][this.rooms[roomId].whoseDefense].playerRight;
                const second = this.rooms[roomId][this.rooms[roomId].whoseDefense].playerLeft;
                const third = this.rooms[roomId].whoseDefense;
                this.nextRound(this.rooms[roomId].whoseDefense, [first, second, third], roomId);
            }else{
                this.rooms[roomId].action = 'attack';
                if(this.rooms[roomId][this.rooms[roomId].whoseAttack].cards.length === 0){
                    this.rooms[roomId].whoseAttack = this.rooms[roomId][position].playerLeft;
                }else{
                    this.rooms[roomId].whoseAttack = this.rooms[roomId][position].playerRight;
                }
                this.updateTimer(roomId);
                this.sendNewInfoForAllInRoom(roomId);
                this.rooms[roomId][position]
                    .socket.send(JSON.stringify({route: 'cardsUpdate', data: this.rooms[roomId][position].cards }));    
            }
        },
        beat: (ws) =>{ // бито
            const roomId = ws.user.roomId;
            const position = this.rooms[roomId][ws.user.id];
            if(!position)
                return ws.send(JSON.stringify({ route: 'error', data: 'Вы не находитесь за столом' }));
            if(this.rooms[roomId].action !== 'attack')
                return ws.send(JSON.stringify({ route: 'error', data: 'Сейчас нельзя атаковать' }));
            if(this.rooms[roomId].whoseAttack !== position)
                return ws.send(JSON.stringify({ route: 'error', data: 'Сейчас не вы ходите' }));
            if(this.rooms[roomId][this.rooms[roomId].whoseDefense].sayIPickUp)
                return ws.send(JSON.stringify({ route: 'error', data: 'Игрок нажал "беру"' }));
           this.beat(roomId, position, ws);
        },
        iPickUp: (ws) =>{ // беру
            const roomId = ws.user.roomId;
            const position = this.rooms[roomId][ws.user.id];
            if(!position)
                return ws.send(JSON.stringify({ route: 'error', data: 'Вы не находитесь за столом' }));
            if(this.rooms[roomId].action !== 'defense')
                return ws.send(JSON.stringify({ route: 'error', data: 'Сейчас не бьются' }));
            if(this.rooms[roomId].whoseDefense !== position)
                return ws.send(JSON.stringify({ route: 'error', data: 'Сейчас не вы бьетесь' })); 
            this.rooms[roomId][position].sayIPickUp = true;
            this.rooms[roomId].whoseAttack = this.rooms[roomId][position].playerRight;
            this.rooms[roomId].action = 'attack';
            this.updateTimer(roomId);
            this.sendNewInfoForAllInRoom(roomId);
        },
        skip: (ws) =>{
            const roomId = ws.user.roomId;
            const position = this.rooms[roomId][ws.user.id];
            if(!position)
                return ws.send(JSON.stringify({ route: 'error', data: 'Вы не находитесь за столом' }));
            if(this.rooms[roomId].action !== 'attack')
                return ws.send(JSON.stringify({ route: 'error', data: 'Сейчас нельзя атаковать' }));
            if(this.rooms[roomId].whoseAttack !== position)
                return ws.send(JSON.stringify({ route: 'error', data: 'Сейчас не вы ходите' }));
            if(!this.rooms[roomId][this.rooms[roomId].whoseDefense].sayIPickUp)
                return ws.send(JSON.stringify({ route: 'error', data: 'Игрок не нажал "беру"' }));
            this.skip(roomId, position);
        }

    }
    skip(roomId, position){
        if(this.rooms[roomId][this.rooms[roomId].whoseDefense].playerLeft === position){
            this.rooms[roomId][this.rooms[roomId].whoseDefense].cards = 
                [...this.rooms[roomId][this.rooms[roomId].whoseDefense].cards, 
                ...this.rooms[roomId].cardsAttack, 
                ...this.rooms[roomId].cardsDefense]; 
            this.rooms[roomId][this.rooms[roomId].whoseDefense]
                .socket.send(JSON.stringify({
                    route: 'cardsUpdate', data: this.rooms[roomId][this.rooms[roomId].whoseDefense].cards }));
            const first = this.rooms[roomId][this.rooms[roomId].whoseDefense].playerRight;
            const second = this.rooms[roomId][this.rooms[roomId].whoseDefense].playerLeft;
            this.nextRound(second, [first, second], roomId); 
        }else{
            this.rooms[roomId].action = 'attack';
            this.rooms[roomId].whoseAttack = this.rooms[roomId][this.rooms[roomId].whoseDefense].playerLeft;
            this.updateTimer(roomId);
            this.sendNewInfoForAllInRoom(roomId);
        }
    }
    beat(roomId, position){
        if(position === this.rooms[roomId][this.rooms[roomId].whoseDefense].playerLeft){
            const first = this.rooms[roomId][this.rooms[roomId].whoseDefense].playerRight;
            const second = this.rooms[roomId][this.rooms[roomId].whoseDefense].playerLeft;
            const third = this.rooms[roomId].whoseDefense;
            this.nextRound(this.rooms[roomId].whoseDefense, [first, second, third], roomId);
        }else{
            this.rooms[roomId].action = 'attack';
            this.rooms[roomId]
                .whoseAttack = this.rooms[roomId][this.rooms[roomId].whoseDefense].playerLeft;
            this.updateTimer(roomId);
            this.sendNewInfoForAllInRoom(roomId);
        }
    }
    canIUseThisCard(card, roomId){
        if(this.rooms[roomId].cardsAttack.length === 0) return true;
        for(let i = 0; i < this.rooms[roomId].cardsAttack.length; i++){
            if(this.rooms[roomId].cardsAttack[i].power === card.power) return true;
        }
        for(let i = 0; i < this.rooms[roomId].cardsDefense.length; i++){
            if(this.rooms[roomId].cardsDefense[i].power === card.power) return true;
        }
        return false;
    }
    startGame(roomId){
        this.rooms[roomId].deck = utils.shuffleArray([
            { title: 's6', suit: 's',  power: 6   }, { title: 's7', suit: 's',  power: 7 }, 
            { title: 's8', suit: 's',  power: 8   }, { title: 's9', suit: 's',  power: 9 },
            { title: 's10', suit: 's', power: 10  }, { title: 'sj', suit: 's',  power: 11 },
            { title: 'sq', suit: 's',  power: 12  }, { title: 'sk', suit: 's',  power: 13 },
            { title: 'sa', suit: 's',  power: 14  },
            { title: 'h6', suit: 'h',  power: 6   }, { title: 'h7', suit: 'h',  power: 7 }, 
            { title: 'h8', suit: 'h',  power: 8   }, { title: 'h9', suit: 'h',  power: 9 },
            { title: 'h10', suit: 'h', power: 10  }, { title: 'hj', suit: 'h',  power: 11 },
            { title: 'hq', suit: 'h',  power: 12  }, { title: 'hk', suit: 'h',  power: 13 },
            { title: 'ha', suit: 'h',  power: 14  },
            { title: 'd6', suit: 'd',  power: 6   }, { title: 'd7', suit: 'd',  power: 7 }, 
            { title: 'd8', suit: 'd',  power: 8   }, { title: 'd9', suit: 'd',  power: 9 },
            { title: 'd10', suit: 'd', power: 10  }, { title: 'dj', suit: 'd',  power: 11 },
            { title: 'dq', suit: 'd',  power: 12  }, { title: 'dk', suit: 'd',  power: 13 },
            { title: 'da', suit: 'd',  power: 14  },
            { title: 'c6', suit: 'c',  power: 6   }, { title: 'c7', suit: 'c',  power: 7 }, 
            { title: 'c8', suit: 'c',  power: 8   }, { title: 'c9', suit: 'c',  power: 9 },
            { title: 'c10', suit: 'c',  power: 10 }, { title: 'cj', suit: 'c',  power: 11 },
            { title: 'cq', suit: 'c',  power: 12  }, { title: 'ck', suit: 'c',  power: 13 },
            { title: 'ca', suit: 'c',  power: 14  }
        ]);
        this.rooms[roomId].status = 'playing';
        this.rooms[roomId].trump = this.getRandomTrump();
        this.takeCards(roomId);
        this.whoFirstAttack(roomId);
        this.updateLeftRightPlayers(roomId);
        this.updateTimer(roomId);
        this.sendNewInfoForAllInRoom(roomId);
    }
    whoFirstAttack(roomId){
        let firstPlayerNumber = -1;
        let lowestTrump = 15;
        for(let i = 1; i <= this.rooms[roomId].playersCount; i++){
            for(let j = 0; j < this.rooms[roomId][`player${i}`].cards.length; j++){
                if(this.rooms[roomId][`player${i}`].cards[j].suit === this.rooms[roomId].trump){
                    if(this.rooms[roomId][`player${i}`].cards[j].power < lowestTrump){
                        lowestTrump = this.rooms[roomId][`player${i}`].cards[j].power;
                        firstPlayerNumber = i;
                    }
                }
            }
        }
        if(firstPlayerNumber === -1){
            this.rooms[roomId].whoseAttack = 'player1';
            this.rooms[roomId].whoseDefense = 'player2';
        }else{
            this.rooms[roomId].whoseAttack = `player${firstPlayerNumber}`;
            if(this.rooms[roomId][`player${firstPlayerNumber + 1}`]){
                this.rooms[roomId].whoseDefense = `player${firstPlayerNumber + 1}`;
            }else{
                this.rooms[roomId].whoseDefense = 'player1';
            }
        }
    }
    whoNextAttack(attack, roomId){
        let index = 0;
        for(let i = 1; i <= this.rooms[roomId].playersCount; i++){
            if(attack === `player${i}`) {
                index = i;
                break;
            }
        }
        let sequence = [];
        for(let j = index; j <= this.rooms[roomId].playersCount; j++){
            sequence.push(j);
        }
        for(let j = 1; j <= index - 1; j++){
            sequence.push(j);
        }
        for(let j = 0; j < sequence.length; j++){
            if(this.rooms[roomId][`player${sequence[j]}`].cards.length !== 0){
                return `player${sequence[j]}`;
            }
        }
    }
    isMaxCardsCountInTable(roomId){
        if(this.rooms[roomId].isFirstRound)
            if(this.rooms[roomId].cardsDefense.length === 5) return true;
        if(this.rooms[roomId].cardsDefense.length === 6) return true;
        return false;
    }
    nextRound(attack, whoToUpCards, roomId){
        if(this.rooms[roomId].isFirstRound) this.rooms[roomId].isFirstRound = false;
        this.clearTable(roomId);
        this.toUpCards(whoToUpCards, roomId);
        this.updateLeftRightPlayers(roomId);
        this.rooms[roomId].action = 'attack';
        const whoCanAttack = this.whoNextAttack(attack, roomId);
        this.rooms[roomId][this.rooms[roomId].whoseDefense].sayIPickUp = false;
        this.rooms[roomId].whoseAttack = whoCanAttack;
        this.rooms[roomId].whoseDefense = this.rooms[roomId][this.rooms[roomId].whoseAttack].playerLeft;
        this.updateTimer(roomId);
        this.sendNewInfoForAllInRoom(roomId);
    }
    toUpCards(players, roomId){
        for(let i = 0; i < players.length; i++){
            this.rooms[roomId][players[i]]
                .cards = [...this.rooms[roomId][players[i]].cards, 
                          ...this.getCardsFromDeck(6 - this.rooms[roomId][players[i]].cards.length, roomId)];
            this.rooms[roomId][players[i]]
                .socket.send(JSON.stringify({ route: 'cardsUpdate', data: this.rooms[roomId][players[i]].cards }));
        }
    }
    clearTable(roomId){
        this.rooms[roomId].cardsAttack.splice(0, this.rooms[roomId].cardsAttack.length);
        this.rooms[roomId].cardsDefense.splice(0, this.rooms[roomId].cardsDefense.length);
    }
    getRandomTrump(){
        return ['s', 'h', 'd', 'c'][utils.getRandomInt(4)];
    }
    getCardsFromDeck(desiredCount, roomId){
        let newCards = [];
        const count = this.rooms[roomId].deck.length >= desiredCount ? desiredCount : this.rooms[roomId].deck.length;
        for(let i = 0; i < count; i++){
            newCards.push(this.rooms[roomId].deck.pop());
        }
        return newCards;
    }
    takeCards(roomId){
        for(let i = 1; i <= this.rooms[roomId].playersCount; i++){
            this.rooms[roomId][`player${i}`].cards = this.getCardsFromDeck(6, roomId);
            this.rooms[roomId][`player${i}`].socket.send(JSON.stringify({
                route: 'cardsUpdate', data: this.rooms[roomId][`player${i}`].cards }));
        }
    }
    gameOver(looser, roomId){
        this.rooms[roomId].status = 'gameOver';
        console.log('Game Over');
        console.log(`В комате ${roomId} проиграл игрок ${looser}`);
    }
    areAllPlacesFilled(roomId){
        for(let i = 1; i <= this.rooms[roomId].playersCount; i++){
            if(!this.rooms[roomId][`player${i}`]) return false;
        }
        return true;
    }
    updateLeftRightPlayers(roomId){
        for(let i = 1; i <= this.rooms[roomId].playersCount; i++){
            if(this.rooms[roomId][`player${i}`].cards.length !== 0){
                let sequence = [];
                for(let j = i + 1; j <= this.rooms[roomId].playersCount; j++){
                    sequence.push(j);
                }
                for(let j = 1; j <= i - 1; j++){
                    sequence.push(j);
                }
                for(let j = 0; j < sequence.length; j++){
                    if(this.rooms[roomId][`player${sequence[j]}`].cards.length !== 0){
                        this.rooms[roomId][`player${i}`].playerLeft = `player${sequence[j]}`;
                        break;
                    }
                }
                for(let j = sequence.length - 1; j >= 0; j--){
                    if(this.rooms[roomId][`player${sequence[j]}`].cards.length !== 0){
                        this.rooms[roomId][`player${i}`].playerRight = `player${sequence[j]}`;
                        break;
                    }
                }

            }
        }
    }
    playerWithCards(roomId){
        for(let i = 1; i <= this.rooms[roomId].playersCount; i++){
            if(this.rooms[roomId][`player${i}`].cards.length > 0) return `player${i}`;
        }
        return null;
    }
    isGameOver(roomId){
        let playersWithZeroCardCount = 0;
        for(let i = 1; i <= this.rooms[roomId].playersCount; i++){
            if(this.rooms[roomId][`player${i}`].cards.length === 0) playersWithZeroCardCount++;
        }
        if(playersWithZeroCardCount >= this.rooms[roomId].playersCount - 1) return true;
        return false;
    }
    canFirstCardBeatSecond(card1, card2, roomId){
        if(card1.suit === card2.suit && card1.power > card2.power) return true;
        if(card1.suit === this.rooms[roomId].trump && card2.suit !== this.rooms[roomId].trump) return true;
        return false;
    }
    updateTimer(roomId){
        this.rooms[roomId].time = Date.now();
    }
    sendNewInfoForAllInRoom(roomId){
        for(let i = 1; i <= this.rooms[roomId].playersCount; i++){
            this.rooms[roomId][`player${i}`].socket.send(JSON.stringify({ route: 'update', 
            data: { 
                action: this.rooms[roomId].action, whoseAttack: this.rooms[roomId].whoseAttack, 
                whoseDefense: this.rooms[roomId].whoseDefense, 
                cardsOnTable: { attack: this.rooms[roomId].cardsAttack, defense: this.rooms[roomId].cardsDefense },
                trump: this.rooms[roomId].trump, cardsInDeckCount: this.rooms[roomId].deck.length,
                sayIPickUp: this.rooms[roomId][this.rooms[roomId].whoseDefense].sayIPickUp,
                time:  this.rooms[roomId].time
            }}));
        }
    }
    takeCard(player, cardTitle, roomId){
        for(let i = 0; i < this.rooms[roomId][player].cards.length; i++){
            if(this.rooms[roomId][player].cards[i].title === cardTitle){
                const card = this.rooms[roomId][player].cards[i];
                this.rooms[roomId][player].cards = this.rooms[roomId][player].cards.filter(c => c.title !== cardTitle);
                return card;
            }
        }
        return null;
    } 
    initRooms(roomsConfig){
        for(let i = 2; i <= 6; i++){
            for(let j = 1; j <= roomsConfig[`x${i}`]; j++){
                this.rooms[`x${i}id${j}`] = {
                    status: 'waiting',
                    time: null,
                    isFirstRound: true,
                    playersCount: i,
                    trump: '',
                    deck: null,
                    action: 'attack',
                    whoseAttack: '',
                    whoseDefense: '',
                    cardsAttack: [],
                    cardsDefense: []
                }
            }
        }
    }
    getMessage(ws, action, data){
        if(this.actions[action]) this.actions[action](ws, data);
    }
    timer(){
        setInterval(() =>{
            for(const roomId in this.rooms){
                if(this.rooms[roomId].status === 'playing' && Date.now() - this.rooms[roomId].time > config.roundTime){
                    if(this.rooms[roomId].action === 'attack'){
                        const position = this.rooms[roomId].whoseAttack;
                        if(this.rooms[roomId].cardsAttack.length === 0){
                            this.gameOver(this.rooms[roomId].whoseAttack, roomId);
                        }else{
                            if(this.rooms[roomId][this.rooms[roomId].whoseDefense].sayIPickUp){
                                this.skip(roomId, position);
                            }else{
                                this.beat(roomId, position);
                            }
                        }
                    }else{
                        this.gameOver(this.rooms[roomId].whoseDefense, roomId);
                    }
                }
            }
        }, 1000);
    }
}

module.exports = Game;