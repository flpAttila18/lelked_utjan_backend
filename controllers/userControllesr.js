const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // JAVÍTVA: Beépített modul a token generáláshoz
const emailValidator = require('node-email-verifier');
const db = require('../db/db'); // JAVÍTVA: Kell a verifyEmail SQL-hez
const { config } = require('../config/dotenvConfig');
const { findByEmail, createUser } = require('../models/userModells');
const { sendVerificationEmail } = require('../utils/sendEmail'); // JAVÍTVA: E-mail küldő importja
const { path } = require('../app');

const cookieOPts = {
    httpOnly: true,
    // JAVÍTVA: használjuk a meglévő config objektumot a process.env helyett, ha már létrehoztad
    secure: process.env.NODE_ENV === 'production', 
    sameSite: 'lax',
    path: '/',
    maxAge: 1000 * 60 * 60 * 24 * 14 // 14 nap
};
async function register(req, res) {
    try {
        const { email, first_name, last_name, psw, phone_num } = req.body; 

        if (!email || !first_name || !last_name || !psw || !phone_num) {
            return res.status(400).json({ error: 'Minden mezőt tölts ki!' });
        }

        if(!(psw.length >=8)){
             return res.status(400).json({ error: 'Az jelszó legyen 8 vagy annál több karakter!' });
        }

        const isValid = await emailValidator(email);
        if (!isValid) {
            return res.status(400).json({ error: "Az email formátuma nem megfelelő!" });
        }

        const exist = await findByEmail(email);
        if (exist) {
            return res.status(409).json({ error: 'Ez az email cím már foglalt!' });
        }

        const hash = await bcrypt.hash(psw, 12);
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // JAVÍTÁS: A phone_num-ot behelyeztük a hash és a verificationToken közé, 
        // pontosan úgy, ahogy a createUser függvény várja a modellben.
        await createUser(email, first_name, last_name, hash, phone_num, verificationToken);
        
        await sendVerificationEmail(email, verificationToken);

        return res.status(201).json({ message: 'Sikeres regisztráció! Kérjük, ellenőrizd az e-mail fiókodat a hitelesítéshez!' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Ez az email már foglalt!' });
        }
        console.error("Regisztrációs hiba:", err);
        return res.status(500).json({ error: 'Szerver hiba regisztrációnál' });
    }
}
async function login(req, res) {
    try {
        // JAVÍTVA: A frontendről 'password' néven érkezik a jelszó, így itt is azt kérjük el
        const { email, psw } = req.body; 

        if (!email || !psw) {
            return res.status(400).json({ error: 'Kérjük, add meg az emailt és a jelszót!' });
        }

        const userSQL = await findByEmail(email);

        if (!userSQL) {
            return res.status(401).json({ error: 'Hibás email cím vagy jelszó!' });
        }

        if (userSQL.verify === 0 || !userSQL.verify) {
            return res.status(403).json({ error: 'Kérjük, előbb igazold vissza az e-mail címedet!' });
        }

        // JAVÍTVA: A 'password' változót hasonlítjuk össze a hash-eléssel
        const ok = await bcrypt.compare(psw, userSQL.psw);
        if (!ok) {
            return res.status(401).json({ error: 'Hibás email cím vagy jelszó!' });
        }

        if (!config.JWT_SECRET || !config.COOKIE_NAME) {
            console.error("HIBA: Hiányzik a JWT_SECRET vagy a COOKIE_NAME a konfigurációból!");
            return res.status(500).json({ error: "Szerver konfigurációs hiba!" });
        }

        const token = jwt.sign(
            { 
                user_id: userSQL.user_id, 
                email: userSQL.email, 
                first_name: userSQL.first_name, 
                last_name: userSQL.last_name, 
                role: userSQL.role,
                verify :userSQL.verify
            },
            config.JWT_SECRET,
            { expiresIn: config.JWT_EXPIRES_IN || '1d' }
        );

        res.cookie(config.COOKIE_NAME, token, cookieOPts);
        
        // JAVÍTVA: A 'message' mellé visszaküldjük a user nevét is, hogy a frontend ki tudja írni!
        return res.status(200).json({ 
            message: 'Sikeres bejelentkezés!',
            first_name: userSQL.first_name,
            last_name: userSQL.last_name
        });

    } catch (err) {
        console.error("Login hiba részletei:", err); 
        return res.status(500).json({ error: 'Bejelentkezési hiba', details: err.message });
    }
}

async function verifyEmail(req, res) {
    try {
        const { token } = req.params;

        const [users] = await db.query('SELECT * FROM Users WHERE verification_token = ?', [token]);
        
        if (users.length === 0) {
            // JAVÍTVA: HTML helyett átirányítás a frontend loginra hibaüzenettel
            return res.redirect('http://localhost:5173/login?error=expired');
        }

        await db.query('UPDATE Users SET verify = 1, verification_token = NULL WHERE verification_token = ?', [token]);

        // JAVÍTVA: HTML helyett átirányítás a frontend loginra sikeres jelzéssel
        return res.redirect('http://localhost:5173/login?verified=true');

    } catch (err) {
        console.error("Verify hiba:", err);
        // JAVÍTVA: Szerverhiba esetén is küldjük vissza a frontend loginra hibaüzenettel
        return res.redirect('http://localhost:5173/login?error=expired');
    }
}


async function whoami(req , res) {
     const {user_id ,  first_name , last_name , email , role, verify } = req.user
    try {
        return res.status(200).json({
            user_id ,
            first_name,
            last_name,
            email,
            role,
            verify
        })

    } catch (err) {
        console.error("Regisztrációs hiba:", err);
        return res.status(500).json({ error: 'Szerver hiba regisztrációnál' });
    }
}


async function logout(req, res) {
    try {
        // A cookie-t pontosan ugyanazokkal a paraméterekkel kell törölni, mint amivel létrehoztad
        return res.clearCookie(config.COOKIE_NAME, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Ha HTTPS-en használtad, itt is kell
            sameSite: 'strict'
        })
        .status(200)
        .json({ message: 'Sikeres kijelentkezés' });

    } catch (err) {
        console.error("Kijelentkezési hiba:", err);
        return res.status(500).json({ error: 'Szerver hiba kijelentkezéskor' });
    }
}


module.exports = { register, login, verifyEmail , whoami, logout };