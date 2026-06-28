const db = require('../db/db');

async function getBookappointments() {
    // Csak azokat a jövőbeli időpontokat kérjük le, amik már aktiválva vannak (verify = 1)
    const sql = `SELECT 
    DATE_FORMAT(start_time, '%Y-%m-%d %H:%i') AS start_time 
FROM appointments 
WHERE start_time >= CURDATE() AND verify = 1;`;
    const [rows] = await db.query(sql);
    return rows;
}

// Csak azokkal az időpontokkal nézzük az ütközést, amik már aktiválva vannak (verify = 1)
async function checkAppointmentOverlap(startTimeStr, endTimeStr) {
    const sql = `
        SELECT * FROM appointments 
        WHERE ? < end_time AND ? > start_time AND verify = 1
    `;
    const [rows] = await db.query(sql, [startTimeStr, endTimeStr]);
    return rows[0]; 
}

// Létrehozásnál a verify alapértelmezetten 0, bekerül a token
async function createAppointment(userId, startTimeStr, endTimeStr, type, token) {
    const sql = 'INSERT INTO appointments (user_id, start_time, end_time, type, verify, verification_token) VALUES (?, ?, ?, ?, 0, ?)';
    const [result] = await db.query(sql, [userId, startTimeStr, endTimeStr, type, token]);
    return { insertId: result.insertId };
}

// ÚJ FÜGGVÉNY: Lekéri a foglalást a token alapján az idő és az átfedés ellenőrzéséhez
async function getAppointmentByToken(token) {
    const sql = 'SELECT * FROM appointments WHERE verification_token = ?';
    const [rows] = await db.query(sql, [token]);
    return rows[0];
}

// ÚJ FÜGGVÉNY: Ha minden ellenőrzés sikeres volt, ez véglegesíti a foglalást
async function activateAppointment(appointmentId) {
    const sql = 'UPDATE appointments SET verify = 1, verification_token = NULL WHERE appointment_id = ?';
    await db.query(sql, [appointmentId]);
}

module.exports = {
    getBookappointments,
    checkAppointmentOverlap,
    createAppointment,
    getAppointmentByToken, // Frissítve
    activateAppointment    // Frissítve
};