const { Client } = require('pg');

const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'durak',
    password: 'qwerty123',
    port: 5432
});

// CREATE TABLE users (
//     id SERIAL PRIMARY KEY,
//     nickname VARCHAR(255),
//     password VARCHAR(255),
//     matches INT DEFAULT 0,
//     win INT DEFAULT 0,
//     money INT DEFAULT 0,
//     account_type VARCHAR(255),
//     account_id VARCHAR(255),
//     email VARCHAR(255),
//     activated BOOLEAN DEFAULT TRUE,
//     activate_code INT DEFAULT 0,
//     send_activate_code_time TIMESTAMP DEFAULT NOW()
// )

client.connect();

const db = {
    checkEmailExistence: async (email) =>{
        const query = 'SELECT EXISTS (SELECT 1 FROM users WHERE email = $1) AS "exists"';
        try{
            const result = await client.query(query, [email]);
            return result.rows[0].exists;
        }catch(e){
            console.error(e);
            throw new Error(e);
        }
    },
    checkNicknameExistence: async (nickname) =>{
        const query = 'SELECT EXISTS (SELECT 1 FROM users WHERE nickname = $1) AS "exists"';
        try{
            const result = await client.query(query, [nickname]);
            return result.rows[0].exists;
        }catch(e){
            console.error(e);
            throw new Error(e);
        }
    },
    createUser: async (nickname, password, email, number) =>{
        const query = 'INSERT INTO users (nickname, password, email, account_type, activated, activate_code) VALUES ($1, $2, $3, $4, $5, $6)';
        try{
            await client.query(query, [nickname, password, email, 'default', false, number]);
        }catch(e){
            console.error(e);
        }
    },
    getUserByEmail: async (email) =>{
        const query = 'SELECT * FROM users WHERE email = $1';
        try{
            const result = await client.query(query, [email]);
            return result.rows[0];
        }catch(e){
            console.error(e);
            return null;
        }
    },
    getUserById: async (id) =>{
        const query = 'SELECT * FROM users WHERE id = $1';
        try{
            const result = await client.query(query, [id]);
            return result.rows[0];
        }catch(e){
            console.error(e);
            return null;
        }
    },
    activateAccount: async (id) =>{
        const query = `UPDATE users SET activated='true' WHERE id=$1;`;
        try{
            await client.query(query, [id]);
        }catch(e){
            console.error(e);
        }
    },
}

module.exports = db;