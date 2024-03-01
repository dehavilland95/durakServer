const config = require('./config');
const db = require('./db');
const bcrypt = require('bcrypt');
const utils = require('./utils');
const jwt = require('jsonwebtoken');
const Mail = require('./mail');
const mail = new Mail();
class UserManager{
    async authorization(data){
        const user = await db.getUserByEmail(data.email);
        if(user === null) return { status: 'error', message: 'Ошибка, пользователь не найден'};
        const result = this.#verifyPassword(data.password, user.password);
        if(result === null) return { status: 'error', message: 'Ошибка, повторит позже'};
        if(result === false) return { status: 'error', message: 'Ошибка, неправильный пароль'};
        const token = this.generateToken({ id: user.id, nickname: user.nickname });
        if(token === null) return { status: 'error', message: 'Не удалось получить токен'};
        return {
            status: 'ok',
            data: {
                token: token,
                nickname: user.nickname
            }
        }
    }
    async registration(data){ 
        let emailExists, nicknameExists;
        try{
            [emailExists, nicknameExists] = await Promise
                .all([db.checkEmailExistence(data.email), db.checkNicknameExistence(data.nickname)]);
        }catch(e){
            return { status: 'error', message: 'Ошибка, повторите позже'};
        }
        if(emailExists) return { status: 'error', message: 'Такой email уже используется'};
        if(nicknameExists) return { status: 'error', message: 'Такой никнейм уже используется'};
        const hash = await this.#hashPassword(data.password);
        if(hash === null) return { status: 'error', message: 'Ошибка, повторите позже' };
        const number = utils.getRandomeFiveDigitNumber();
        await db.createUser(data.nickname, hash, data.email, number);
        const user = await db.getUserByEmail(data.email);
        if(user === null) return { status: 'error', message: 'Ошибка, повторите позже'};
        const text = `Ваш проверочный код ${number}`;
        await mail.send(data.email, 'Подтверждение регистрации', text);
        const token = this.generateToken({ id: user.id, nickname: user.nickname });
        if(token === null) return { status: 'error', message: 'Не удалось получить токен'};
        return {
            status: 'ok',
            data: {
                token: token,
                nickname: user.nickname
            }
        }
    }
    async activateAccount(data){
        const decoded = this.verifyToken(data.token);
        if(decoded === null) return { status: 'error', message: 'Ошибка, повторите позже' };
        const user = await db.getUserById(decoded.data.id);
        if(user === null) return { status: 'error', message: 'Ошибка, пользователь не найден' };
        if(data.code !== user.activate_code) return { status: 'error', message: 'Неправильный код' };
        await db.activateAccount(user.id);
        return { status: 'ok' };
    }
    generateToken(user){
        try{
            const token = jwt.sign({data: user}, config.tokenSecretKey, { expiresIn: '1h' });
            return token;
        }catch(e){
            console.error(e);
            return null;
        }
    }
    verifyToken(token){
        try{
            const user = jwt.verify(token, config.tokenSecretKey);
            return user;
        }catch(e){
            //console.error(e);
            return null;
        }
    }
    async #hashPassword(password){
        try{
            const salt = await bcrypt.genSalt(config.saltRounds);
            const hash = await bcrypt.hash(password, salt);
            return hash;
        }catch(e){
            console.error(e);
            return null;
        }
    }
    async #verifyPassword(password, hash){
        try{    
            const match = await bcrypt.compare(password, hash);
            return match;
        }catch(e){
            console.log(e);
            return null;
        }
    }
}

module.exports = UserManager;