const UserManager = require('./userManager');
const userManager = new UserManager();
const captcha = require('./captcha');
const { authValidate, registerValidate, activateAccountValidate  } = require('./validator');

const httpRoutes = {
    auth: async (res, data) =>{
        const error = authValidate(data);
        if(error) return res.end(JSON.stringify({ status: 'data-error', message: error.message }))
        const captchaResult = captcha.checkCaptcha(data.captchaId, data.answer);
        if(!captchaResult) return res.end(JSON.stringify({ status: 'captcha-error', message: 'Неправильно введена капча' }))
        const result = await userManager.authorization(data);
        res.end(JSON.stringify(result))
    },
    register: async (res, data) =>{
        const error = registerValidate(data);
        if(error) return res.end(JSON.stringify({ status: 'data-error', message: error.message }))
        const captchaResult = captcha.checkCaptcha(data.captchaId, data.answer);
        if(!captchaResult) return res.end(JSON.stringify({ status: 'captcha-error', message: 'Неправильно введена капча' }))
        const result = await userManager.registration(data);
        res.end(JSON.stringify(result))
    },
    getCaptcha: (res) =>{
        const newCaptcha = captcha.createCaptcha();
        res.end(JSON.stringify({ captcha: newCaptcha.data, id: newCaptcha.id }));
    },
    activateAccount: async (res, data) =>{
        const error = activateAccountValidate(data);
        if(error) return res.end(JSON.stringify({ status: 'data-error', message: error.message }))
        const result = await userManager.activateAccount(data);
        res.end(JSON.stringify(result))
    },
}

module.exports = httpRoutes;