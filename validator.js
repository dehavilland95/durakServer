const validator = require('validator');

const authValidate = (data) =>{
    if(typeof data !== 'object') return { message: 'Некорректные данные'};
    //email
    if(!data.email) return { message: 'Введите email'};
    if(!validator.isEmail(data.email)) return { message: 'Некорретный email'};
    //password
    if(!data.password) return { message: 'Введите пароль'};
    if(!validator.isLength(data.password, { min: 8, max: 30 })) return { message: 'Пароль должен быть от 8 до 30 символов'};
    //answer
    if(!data.answer) return { message: 'Введите ответ на капчу' };
    //captcha id 
    if(!data.captchaId) return { message: 'Ошибка капчи, обратитесь к администратору' };
    return false;
}

const registerValidate = (data) =>{
    if(typeof data !== 'object') return { message: 'Некорректные данные'};
    //email
    if(!data.email) return { message: 'Введите email'};
    if(!validator.isEmail(data.email)) return { message: 'Некорретный email'};
    //password
    if(!data.password) return { message: 'Введите пароль'};
    if(!validator.isLength(data.password, { min: 8, max: 30 })) return { message: 'Пароль должен быть от 8 до 30 символов'};
    //nickname
    if(!data.nickname) return { message: 'Введите никнейм'};
    if(!validator.isLength(data.nickname, { min: 4, max: 30 })) return { message: 'Никнейм должен быть от 4 до 30 символов'};
    //answer
    if(!data.answer) return { message: 'Введите ответ на капчу' };
    //captcha id 
    if(!data.captchaId) return { message: 'Ошибка капчи, обратитесь к администратору' };
    return false;
}

const activateAccountValidate = (data) =>{
    if(typeof data !== 'object') return { message: 'Некорректные данные'};
    //token
    if(!data.token) return { message: 'Войдите в аккаунт'};
    if(!validator.isJWT(data.token)) return { message: 'Войдите в аккаунт' };
    //code
    if(!data.code) return { message: 'Введите код'};
    return false;
}

module.exports = { authValidate, registerValidate, activateAccountValidate };