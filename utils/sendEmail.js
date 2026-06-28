const nodemailer = require('nodemailer');
require('dotenv').config();

// Közös transporter a regisztrációs és a foglalási e-mailekhez
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false, // 587-es porthoz false kell
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false
    }
});

// 1. REGISZTRÁCIÓS E-MAIL FÜGGVÉNY
async function sendVerificationEmail(email, token) {
    const verificationLink = `${process.env.BASE_URL}/users/verify/${token}`;

    const mailOptions = {
        from: `"Lelked Útján Web" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'E-mail cím hitelesítése',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h1>Kedves Vendégünk!</h1>
                <p>Köszönjük, hogy regisztráltál a Lelked Útján oldalon.</p>
                <p>Kérjük, kattints az alábbi gombra a fiókod aktiválásához:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationLink}" style="padding: 12px 24px; background-color: #eea1ae; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Fiók aktiválása</a>
                </div>
                <p style="color: #666; font-size: 12px;">A link 24 óráig érvényes.</p>
            </div>
        `,
    };

    await transporter.sendMail(mailOptions);
}

// 2. IDŐPONTFOGLALÁS MEGERŐSÍTŐ E-MAIL FÜGGVÉNY
async function sendBookingConfirmationEmail(email, bookingDetails) {
    // JAVÍTVA: A link most már pontosan a most létrehozott /appointments/verify/:token útvonalra mutat!
    const verificationLink = `${process.env.BASE_URL}/appointment/verify/${bookingDetails.token}`;

    const mailOptions = {
        from: `"Lelked Útján Web" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Időpontfoglalás megerősítése szükséges',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h1 style="color: #eea1ae; text-align: center;">Időpontfoglalás igénylése</h1>
                <p>Kedves Vendégünk!</p>
                <p>Sikeresen kezdeményeztél egy időpontfoglalást a Lelked Útján oldalon.</p>
                
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #eea1ae;">
                    <p style="margin: 5px 0;"><strong>Szolgáltatás:</strong> ${bookingDetails.service_name}</p>
                    <p style="margin: 5px 0;"><strong>Dátum:</strong> ${bookingDetails.date}</p>
                    <p style="margin: 5px 0;"><strong>Időpont:</strong> ${bookingDetails.time}</p>
                </div>

                <p>Az idősáv véglegesítéséhez és biztosításához kérjük, <strong>aktiváld a foglalásodat</strong> az alábbi gombra kattintva:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationLink}" style="padding: 12px 24px; background-color: #eea1ae; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Időpont aktiválása</a>
                </div>

                <p style="color: #d9534f; font-weight: bold; font-size: 13px;">Figyelem: A link 2 óráig érvényes! Amennyiben nem aktiválod időben, vagy valaki más hamarabb aktivál egy ütköző időpontot, a foglalásod érvényét veszti.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;">
                <p style="color: #666; font-size: 12px; text-align: center;">Lelked Útján Weboldal</p>
            </div>
        `,
    };

    await transporter.sendMail(mailOptions);
}

// Mindkét függvényt exportáljuk, hogy a kontrollerek elérhessék őket
module.exports = { 
    sendVerificationEmail, 
    sendBookingConfirmationEmail 
};