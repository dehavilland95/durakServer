const utils = require('./utils');
// spades (пики)
// hearts (червы)
// diamonds (бубны) 
// clubs (трефы)
// trump (козырь)
class Game{
    room = null;
    actions = {
        sitDown: (ws, placeNumber) =>{
            if(placeNumber < 1 || placeNumber > this.room.playersCount)
                return ws.send(JSON.stringify({ route: 'error', data: 'Некорректно указано место' }));
            const place = `player${placeNumber}`;
            if(this.room[place])
                return ws.send(JSON.stringify({ route: 'error', data: 'Место заныто' }));
            this.room[place] = {
                position: placeNumber,
                playerLeft: '',
                playerRight: '',
                socket: ws,
                cards: [],
                playerId: ws.user.id,
                sayIPickUp: false
            };
            this.room[ws.user.id] = place;
            if(this.areAllPlacesFilled()){
                this.startGame();
            }
            ws.send(JSON.stringify({ route: 'youSatDown' }));
        },
        attack: (ws, cardTitle) =>{ // хожу или подкидываю
            const position = this.room[ws.user.id];
            if(!position)
                return ws.send(JSON.stringify({ route: 'error', data: 'Вы не находитесь за столом' }));
            if(this.room.action !== 'attack')
                return ws.send(JSON.stringify({ route: 'error', data: 'Сейчас нельзя атаковать' }));
            if(this.room.whoseAttack !== position)
                return ws.send(JSON.stringify({ route: 'error', data: 'Сейчас не вы ходите' }));
            const card = this.takeCard(position, cardTitle);
            if(card === null)
                return ws.send(JSON.stringify({ route: 'error', data: 'Невозможно походить этой картой' }));
            const result = this.canIUseThisCard(card);
            if(result === false)
                return ws.send(JSON.stringify({ route: 'error', data: 'Вы не можете ходить этой картой' }));
            this.room.cardsAttack.push(card);
            if(this.isGameOver()) return this.gameOver();
            if(!this.room[this.room.whoseDefense].sayIPickUp) this.room.action = 'defense';
            this.sendNewInfoForAllInRoom();
            this.room[position].socket.send(JSON.stringify({
                route: 'cardsUpdate', data: this.room[position].cards }));
        },
        defense: (ws, cardTitle) =>{ // бью
            const position = this.room[ws.user.id];
            if(!position)
                return ws.send(JSON.stringify({ route: 'error', data: 'Вы не находитесь за столом' }));
            if(this.room.action !== 'defense')
                return ws.send(JSON.stringify({ route: 'error', data: 'Сейчас не бьются' }));
            if(this.room.whoseDefense !== position)
                return ws.send(JSON.stringify({ route: 'error', data: 'Сейчас не вы бьетесь' }));
            if(this.room[position].iPickUp)
                return ws.send(JSON.stringify({ route: 'error', data: 'Невозможно побить, вы уже нажали взять' }));
            
            const card = this.takeCard(position, cardTitle);
            if(card === null)
                return ws.send(JSON.stringify({ route: 'error', data: 'У вас нет этой карты' }));

            if(!this.canFirstCardBeatSecond(card, this.room.cardsAttack[this.room.cardsAttack.length - 1])){
                this.room[position].cards.push(card);
                return ws.send(JSON.stringify({ route: 'error', data: 'Ваша карта не бьет эту карту' }));
            }
            this.room.cardsDefense.push(card);
            if(this.isGameOver()) return this.gameOver();
            const outOfCards = this.room[position].cards.length === 0 
                || (this.room[this.room[position].playerLeft].cards.length === 0 
                    && this.room[this.room[position].playerRight].cards.length === 0);
            if(outOfCards || this.isMaxCardsCountInTable()){
                const first = this.room[this.room.whoseDefense].playerRight;
                const second = this.room[this.room.whoseDefense].playerLeft;
                const third = this.room.whoseDefense;
                this.nextRound(this.room.whoseDefense, [first, second, third]);
            }else{
                this.room.action = 'attack';
                if(this.room[this.room.whoseAttack].cards.length === 0){
                    this.room.whoseAttack = this.room[position].playerLeft;
                }else{
                    this.room.whoseAttack = this.room[position].playerRight;
                }
                this.sendNewInfoForAllInRoom();
                this.room[position].socket.send(JSON.stringify({route: 'cardsUpdate', data: this.room[position].cards }));    
            }
        },
        beat: (ws) =>{ // бито
            const position = this.room[ws.user.id];
            if(!position)
                return ws.send(JSON.stringify({ route: 'error', data: 'Вы не находитесь за столом' }));
            if(this.room.action !== 'attack')
                return ws.send(JSON.stringify({ route: 'error', data: 'Сейчас нельзя атаковать' }));
            if(this.room.whoseAttack !== position)
                return ws.send(JSON.stringify({ route: 'error', data: 'Сейчас не вы ходите' }));
            if(this.room[this.room.whoseDefense].sayIPickUp)
                return ws.send(JSON.stringify({ route: 'error', data: 'Игрок нажал "беру"' }));
            if(position === this.room[this.room.whoseDefense].playerLeft){
                const first = this.room[this.room.whoseDefense].playerRight;
                const second = this.room[this.room.whoseDefense].playerLeft;
                const third = this.room.whoseDefense;
                this.nextRound(this.room.whoseDefense, [first, second, third]);
            }else{
                this.room.action = 'attack';
                this.room.whoseAttack = this.room[this.room.whoseDefense].playerLeft;
                this.sendNewInfoForAllInRoom();
            }
        },
        iPickUp: (ws) =>{ // беру
            const position = this.room[ws.user.id];
            if(!position)
                return ws.send(JSON.stringify({ route: 'error', data: 'Вы не находитесь за столом' }));
            if(this.room.action !== 'defense')
                return ws.send(JSON.stringify({ route: 'error', data: 'Сейчас не бьются' }));
            if(this.room.whoseDefense !== position)
                return ws.send(JSON.stringify({ route: 'error', data: 'Сейчас не вы бьетесь' })); 
            this.room[position].sayIPickUp = true;
            this.room.whoseAttack = this.room[position].playerRight;
            this.room.action = 'attack';
            this.sendNewInfoForAllInRoom();
        },
        skip: (ws) =>{
            const position = this.room[ws.user.id];
            if(!position)
                return ws.send(JSON.stringify({ route: 'error', data: 'Вы не находитесь за столом' }));
            if(this.room.action !== 'attack')
                return ws.send(JSON.stringify({ route: 'error', data: 'Сейчас нельзя атаковать' }));
            if(this.room.whoseAttack !== position)
                return ws.send(JSON.stringify({ route: 'error', data: 'Сейчас не вы ходите' }));
            if(!this.room[this.room.whoseDefense].sayIPickUp)
                return ws.send(JSON.stringify({ route: 'error', data: 'Игрок не нажал "беру"' }));
            if(this.room[this.room.whoseDefense].playerLeft === position){
                this.room[this.room.whoseDefense].cards = 
                    [...this.room[this.room.whoseDefense].cards, ...this.room.cardsAttack, ...this.room.cardsDefense]; 
                this.room[this.room.whoseDefense]
                    .socket.send(JSON.stringify({route: 'cardsUpdate', data: this.room[this.room.whoseDefense].cards }));
                const first = this.room[this.room.whoseDefense].playerRight;
                const second = this.room[this.room.whoseDefense].playerLeft;
                this.nextRound(second, [first, second]); 
            }else{
                this.room.action = 'attack';
                this.room.whoseAttack = this.room[this.room.whoseDefense].playerLeft;
                this.sendNewInfoForAllInRoom();
            }
        }

    }
    constructor(){
        this.initRoom();
    } 
    canIUseThisCard(card){
        if(this.room.cardsAttack.length === 0) return true;
        for(let i = 0; i < this.room.cardsAttack.length; i++){
            if(this.room.cardsAttack[i].power === card.power) return true;
        }
        for(let i = 0; i < this.room.cardsDefense.length; i++){
            if(this.room.cardsDefense[i].power === card.power) return true;
        }
        return false;
    }
    startGame(){
        this.room.deck = utils.shuffleArray([
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
        this.room.trump = this.getRandomTrump();
        this.takeCards();
        this.whoFirstAttack();
        this.updateLeftRightPlayers();
        this.sendNewInfoForAllInRoom();
    }
    whoFirstAttack(){
        let firstPlayerNumber = -1;
        let lowestTrump = 15;
        for(let i = 1; i <= this.room.playersCount; i++){
            for(let j = 0; j < this.room[`player${i}`].cards.length; j++){
                if(this.room[`player${i}`].cards[j].suit === this.room.trump){
                    if(this.room[`player${i}`].cards[j].power < lowestTrump){
                        lowestTrump = this.room[`player${i}`].cards[j].power;
                        firstPlayerNumber = i;
                    }
                }
            }
        }
        if(firstPlayerNumber === -1){
            this.room.whoseAttack = 'player1';
            this.room.whoseDefense = 'player2';
        }else{
            this.room.whoseAttack = `player${firstPlayerNumber}`;
            if(this.room[`player${firstPlayerNumber + 1}`]){
                this.room.whoseDefense = `player${firstPlayerNumber + 1}`;
            }else{
                this.room.whoseDefense = 'player1';
            }
        }
    }
    whoNextAttack(attack){
        let index = 0;
        for(let i = 1; i <= this.room.playersCount; i++){
            if(attack === `player${i}`) {
                index = i;
                break;
            }
        }
        let sequence = [];
        for(let j = index; j <= this.room.playersCount; j++){
            sequence.push(j);
        }
        for(let j = 1; j <= index - 1; j++){
            sequence.push(j);
        }
        for(let j = 0; j < sequence.length; j++){
            if(this.room[`player${sequence[j]}`].cards.length !== 0){
                return `player${sequence[j]}`;
            }
        }
    }
    isMaxCardsCountInTable(){
        if(this.room.isFirstRound)
            if(this.room.cardsDefense.length === 5) return true;
        if(this.room.cardsDefense.length === 6) return true;
        return false;
    }
    nextRound(attack, whoToUpCards){
        if(this.room.isFirstRound) this.room.isFirstRound = false;
        this.clearTable();
        this.toUpCards(whoToUpCards);
        this.updateLeftRightPlayers();
        this.room.action = 'attack';
        const whoCanAttack = this.whoNextAttack(attack);
        this.room[this.room.whoseDefense].sayIPickUp = false;
        this.room.whoseAttack = whoCanAttack;
        this.room.whoseDefense = this.room[this.room.whoseAttack].playerLeft;
        this.sendNewInfoForAllInRoom();
    }
    toUpCards(players){
        for(let i = 0; i < players.length; i++){
            this.room[players[i]]
                .cards = [...this.room[players[i]].cards, 
                          ...this.getCardsFromDeck(6 - this.room[players[i]].cards.length)];
            this.room[players[i]].socket.send(JSON.stringify({ route: 'cardsUpdate', data: this.room[players[i]].cards }));
        }
    }
    clearTable(){
        this.room.cardsAttack.splice(0, this.room.cardsAttack.length);
        this.room.cardsDefense.splice(0, this.room.cardsDefense.length);
    }
    getRandomTrump(){
        return ['s', 'h', 'd', 'c'][utils.getRandomInt(4)];
    }
    getCardsFromDeck(desiredCount){
        let newCards = [];
        const count = this.room.deck.length >= desiredCount ? desiredCount : this.room.deck.length;
        for(let i = 0; i < count; i++){
            newCards.push(this.room.deck.pop());
        }
        return newCards;
    }
    takeCards(){
        for(let i = 1; i <= this.room.playersCount; i++){
            this.room[`player${i}`].cards = this.getCardsFromDeck(6);
            this.room[`player${i}`].socket.send(JSON.stringify({
                route: 'cardsUpdate', data: this.room[`player${i}`].cards }));
        }
    }
    gameOver(){
        console.log('Game Over');
        for(let i = 1; i <= this.room.playersCount; i++){
            if(this.room[`player${i}`].cards.length > 0){
                console.log(`Проиграл игрок "player${i}"`);
            }
        }
    }
    areAllPlacesFilled(){
        for(let i = 1; i <= this.room.playersCount; i++){
            if(!this.room[`player${i}`]) return false;
        }
        return true;
    }
    updateLeftRightPlayers(){
        for(let i = 1; i <= this.room.playersCount; i++){
            if(this.room[`player${i}`].cards.length !== 0){
                let sequence = [];
                for(let j = i + 1; j <= this.room.playersCount; j++){
                    sequence.push(j);
                }
                for(let j = 1; j <= i - 1; j++){
                    sequence.push(j);
                }
                for(let j = 0; j < sequence.length; j++){
                    if(this.room[`player${sequence[j]}`].cards.length !== 0){
                        this.room[`player${i}`].playerLeft = `player${sequence[j]}`;
                        break;
                    }
                }
                for(let j = sequence.length - 1; j >= 0; j--){
                    if(this.room[`player${sequence[j]}`].cards.length !== 0){
                        this.room[`player${i}`].playerRight = `player${sequence[j]}`;
                        break;
                    }
                }

            }
        }
    }
    isGameOver(){
        let playersWithZeroCardCount = 0;
        for(let i = 1; i <= this.room.playersCount; i++){
            if(this.room[`player${i}`].cards.length === 0) playersWithZeroCardCount++;
        }
        if(playersWithZeroCardCount >= this.room.playersCount - 1) return true;
        return false;
    }
    canFirstCardBeatSecond(card1, card2){
        if(card1.suit === card2.suit && card1.power > card2.power) return true;
        if(card1.suit === this.room.trump && card2.suit !== this.room.trump) return true;
        return false;
    }
    sendNewInfoForAllInRoom(){
        for(let i = 1; i <= this.room.playersCount; i++){
            this.room[`player${i}`].socket.send(JSON.stringify({ route: 'update', 
            data: { 
                action: this.room.action, whoseAttack: this.room.whoseAttack, 
                whoseDefense: this.room.whoseDefense, 
                cardsOnTable: { attack: this.room.cardsAttack, defense: this.room.cardsDefense },
                trump: this.room.trump, cardsInDeckCount: this.room.deck.length,
                sayIPickUp: this.room[this.room.whoseDefense].sayIPickUp
            }}));
        }
    }
    takeCard(player, cardTitle){
        for(let i = 0; i < this.room[player].cards.length; i++){
            if(this.room[player].cards[i].title === cardTitle){
                const card = this.room[player].cards[i];
                this.room[player].cards = this.room[player].cards.filter(c => c.title !== cardTitle);
                return card;
            }
        }
        return null;
    }  
    initRoom(){
        console.log('initRoom')
        this.room = {
            isFirstRound: true,
            playersCount: 2,
            trump: '',
            deck: null,
            action: 'attack',
            whoseAttack: '',
            whoseDefense: '',
            cardsAttack: [],
            cardsDefense: []
        }
    }
    getMessage(ws, action, data){
        if(this.actions[action]) this.actions[action](ws, data);
    }
}

module.exports = Game;