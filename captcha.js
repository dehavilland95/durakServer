const svgCaptcha = require('svg-captcha');
const utils = require('./utils');
const CAPTCHA_TIME_LIVES = 1000 * 60 * 10;
class Captcha{
    captchas = {};
    #clearCaptchasList(){
        const now = Date.now();
        for(const id in this.captchas){
            if(now - this.captchas[id].time > CAPTCHA_TIME_LIVES) delete this.captchas[id];
        }
    }
    createCaptcha(){
        const captcha = svgCaptcha.createMathExpr({
            mathMin: 10,
            mathMax: 50,
            mathOperator: '+',
            noise: 4
        });
        const id = utils.generateId();
        this.captchas[id] = {
            time: Date.now(),
            answer: captcha.text
        }
        return { id, data: captcha.data };
    }
    checkCaptcha(id, answer){
        this.#clearCaptchasList();
        if(!this.captchas[id]) return false;
        if(parseInt(this.captchas[id].answer) !== answer) return false;
        delete this.captchas[id];
        return true;
    }
}


const captcha = new Captcha();
module.exports = captcha;