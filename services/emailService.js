const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

async function sendPasswordChangeCode(email, code, userName) {
    try {
        await transporter.sendMail({
            from: `TravelApp Support <${process.env.SMTP_FROM}>`,
            to: email,
            subject: "Ověřovací kód pro změnu hesla",
            html: `
                <p>Dobrý den${userName ? `, <strong>${userName}</strong>` : ""},</p>
                <p>váš ověřovací kód pro změnu hesla je:</p>
                <h2 style="letter-spacing: 4px;">${code}</h2>
                <p>Kód je platný <strong>10 minut</strong>.</p>
                <p>Pokud jste o změnu hesla nežádala, tento e-mail ignorujte.</p>
            `
        });

        console.log("EMAIL ODESLÁN NA:", email);
    } catch (error) {
        console.error("EMAIL ERROR:", error);
        throw new Error("Nepodařilo se odeslat e-mail.");
    }
}

async function sendRegistrationVerificationCode(email, code, userName) {
    try {
        await transporter.sendMail({
            from: `TravelApp Support <${process.env.SMTP_FROM}>`,
            to: email,
            subject: "Ověření e-mailu při registraci",
            html: `
                <p>Dobrý den${userName ? `, <strong>${userName}</strong>` : ""},</p>
                <p>děkujeme za registraci do aplikace TravelApp.</p>
                <p>váš ověřovací kód je:</p>
                <h2 style="letter-spacing: 4px;">${code}</h2>
                <p>Kód je platný <strong>10 minut</strong>.</p>
                <p>Pokud jste o registraci nežádala, tento e-mail ignorujte.</p>
            `
        });

        console.log("REGISTRAČNÍ EMAIL ODESLÁN NA:", email);
    } catch (error) {
        console.error("REGISTRATION EMAIL ERROR:", error);
        throw new Error("Nepodařilo se odeslat ověřovací e-mail.");
    }
}

module.exports = {
    sendPasswordChangeCode,
    sendRegistrationVerificationCode
};