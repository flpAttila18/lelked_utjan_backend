const db = require('../db/db');

async function findByEmail(email) {
    const [rows] = await db.query('SELECT * FROM Users WHERE email = ?', [email]);
    return rows[0];
}

async function createUser(email, first_name, last_name, hash, phone_number, token) {
    const sql = `INSERT INTO Users (email, first_name, last_name, psw, verify, role, phone_number, verification_token) VALUES (?, ?, ?, ?, 0, 'user', ?, ?)`;
    const [result] = await db.query(sql, [email, first_name, last_name, hash, phone_number, token]);
    return { insertId: result.insertId };
}

module.exports = { findByEmail, createUser };