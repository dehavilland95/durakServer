const UserManager = require('./userManager');
const userManager = new UserManager();
const { authValidate, registerValidate  } = require('./validator');

const httpRoutes = {
    auth: (res, data) =>{
        const error = authValidate(data);
        if(error) return res.end(JSON.stringify({ status: 'data-error', message: error.message }))
        userManager.authorization(data);
        res.end(JSON.stringify({status: 'ok'}))
    },
    register: (res, data) =>{
        const error = registerValidate(data);
        if(error) return res.end(JSON.stringify({ status: 'data-error', message: error.message }))
        userManager.registration(data);
        res.end(JSON.stringify({status: 'ok'}))
    }
}

module.exports = httpRoutes;