const crypto = require('crypto');
const db = require('../db/db'); 
const { config } = require('../config/dotenvConfig');
// Beimportáljuk az új modell függvényeket is
const { getBookappointments, checkAppointmentOverlap, createAppointment, getAppointmentByToken, activateAppointment } = require('../models/appointmentModels');
const { sendBookingConfirmationEmail } = require('../utils/sendEmail'); 

async function booked(req, res) {
   try {
        const appointments = await getBookappointments();
        const BookedSlots = appointments.map(row => row.start_time);
        return res.status(200).json(BookedSlots);
    } catch (err) {
        console.error("Hiba a foglalt időpontok lekérésekor:", err);
        return res.status(500).json({ error: 'Szerver hiba az időpontok lekérésekor' });
    }
}

async function bookAppointment(req, res) {
  try {
        const { date, time, serviceName } = req.body;

        if (!date || !time || !serviceName) {
            return res.status(400).json({ error: 'Mingen mezőt tölts ki!' });
        }

        const userId = req.user ? req.user.user_id : req.body.userId;
        const userEmail = req.user ? req.user.email : null; 

        if (!userEmail) {
            return res.status(400).json({ error: 'A foglaláshoz be kell jelentkezni!' });
        }

        let durationMinutes = 90;
        const nameLower = serviceName.toLowerCase();
        if (nameLower.includes('családállítás') || nameLower.includes('csaladallitas')) {
            durationMinutes = 120;
        } else if (nameLower.includes('hangtál') || nameLower.includes('hangtal') || nameLower.includes('access') || nameLower.includes('bars')) {
            durationMinutes = 60;
        }

        const startTimeStr = `${date} ${time}:00`;
        const startDate = new Date(`${date}T${time}:00`);
        const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

        const year = endDate.getFullYear();
        const month = String(endDate.getMonth() + 1).padStart(2, '0');
        const day = String(endDate.getDate()).padStart(2, '0');
        const hours = String(endDate.getHours()).padStart(2, '0');
        const minutes = String(endDate.getMinutes()).padStart(2, '0');
        
        const endTimeStr = `${year}-${month}-${day} ${hours}:${minutes}:00`;

        const hasOverlap = await checkAppointmentOverlap(startTimeStr, endTimeStr);
        if (hasOverlap) {
            return res.status(409).json({ error: `Ez az idősáv ütközik egy már meglévő AKTIVÁLT foglalással!` });
        }

        const bookingToken = crypto.randomBytes(32).toString('hex');

        const result = await createAppointment(userId, startTimeStr, endTimeStr, serviceName, bookingToken);

        await sendBookingConfirmationEmail(userEmail, {
            date,
            time,
            service_name: serviceName,
            token: bookingToken
        });

        return res.status(201).json({ 
            message: 'Időpont ideiglenesen lefoglalva! Kérjük, erősítsd meg a foglalásodat az e-mailben kapott linken!', 
            appointment_id: result.insertId
        });

    } catch (err) {
        console.error("Időpontfoglalási hiba:", err);
        return res.status(500).json({ error: 'Szerver hiba az időpont mentésekor' });
    }
}

// JAVÍTVA: 2 órás lejárat + Aktiváláskori ütközésvizsgálat (Gyorsasági verseny)
// JAVÍTVA: Biztonságos formázás + Átirányítás az új idopont-aktivacio oldalra
async function verifyAppointment(req, res) {
    try {
        const { token } = req.params;
        
        // 1. Megkeressük a foglalást a token alapján
        const appointment = await getAppointmentByToken(token);
        
        if (!appointment) {
            // Nem létező vagy már felhasznált token
            return res.redirect('http://localhost:5173/idopont-aktivacio?status=error&message=invalid');
        }

        // 2. IDŐKORLÁT ELLENŐRZÉSE (120 perc = 2 óra)
        const now = new Date();
        const createdAt = new Date(appointment.created_at);
        const diffInMinutes = (now - createdAt) / 1000 / 60;

        if (diffInMinutes > 120) {
            return res.redirect('http://localhost:5173/idopont-aktivacio?status=error&message=expired');
        }

        // 3. JAVÍTVA: Biztonságos dátum formázás az ütközésvizsgálathoz (az ISOString törlése helyett)
        const formatMySQLDate = (dateObj) => {
            const d = new Date(dateObj);
            return d.getFullYear() + '-' +
                String(d.getMonth() + 1).padStart(2, '0') + '-' +
                String(d.getDate()).padStart(2, '0') + ' ' +
                String(d.getHours()).padStart(2, '0') + ':' +
                String(d.getMinutes()).padStart(2, '0') + ':00';
        };

        const startStr = formatMySQLDate(appointment.start_time);
        const endStr = formatMySQLDate(appointment.end_time);

        // 4. AKTIVÁLÁSKORI ÜTKÖZÉS ELLENŐRZÉSE
        const hasOverlap = await checkAppointmentOverlap(startStr, endStr);
        if (hasOverlap) {
            // Valaki más gyorsabb volt és már aktiválta ezt az idősávot!
            return res.redirect('http://localhost:5173/idopont-aktivacio?status=error&message=overlap');
        }

        // 5. SIKER: Ha minden rendben, aktiváljuk az adatbázisban
        await activateAppointment(appointment.appointment_id);
        
        // Sikeres aktiválás után az új oldalra dobunk success státusszal
        return res.redirect('http://localhost:5173/idopont-aktivacio?status=success');
        
    } catch (err) {
        console.error("Időpont aktiválási hiba:", err);
        return res.redirect('http://localhost:5173/idopont-aktivacio?status=error');
    }
}

module.exports = { booked, bookAppointment, verifyAppointment };