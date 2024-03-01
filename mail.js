const nodemailer = require('nodemailer');
const config = require('./config')
class Mail{
    transporter = null;
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: config.mailHost,
            port: config.mailPort,
            secure: true,
            auth: {
                user: config.mail,
                pass: config.mailPassword,
            },
        });
    }
    async send(to, subject, text){
        try{
            const mailOptions = { from: config.mail, to, subject, text };
            await this.transporter.sendMail(mailOptions);
        }catch(e){
            console.log('Sending mail error: ', e);
        }
    }
}

module.exports = Mail;