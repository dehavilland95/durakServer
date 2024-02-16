const UserManager = require('./userManager');
const userManager = new UserManager();
const { authValidate, registerValidate  } = require('./validator');

const httpRoutes = {
    auth: async (res, data) =>{
        const error = authValidate(data);
        if(error) return res.end(JSON.stringify({ status: 'data-error', message: error.message }))
        const result = await userManager.authorization(data);
        res.end(JSON.stringify(result))
    },
    register: async (res, data) =>{
        const error = registerValidate(data);
        if(error) return res.end(JSON.stringify({ status: 'data-error', message: error.message }))
        const result = await userManager.registration(data);
        res.end(JSON.stringify(result))
    }
}

module.exports = httpRoutes;