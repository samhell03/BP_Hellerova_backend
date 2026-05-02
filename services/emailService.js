const axios = require("axios");

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

async function sendEmail({ to, subject, html }) {
    try {
        if (!process.env.BREVO_API_KEY) {
            throw new Error("Chybí BREVO_API_KEY v .env souboru.");
        }

        if (!process.env.BREVO_SENDER_EMAIL) {
            throw new Error("Chybí BREVO_SENDER_EMAIL v .env souboru.");
        }

        await axios.post(
            BREVO_API_URL,
            {
                sender: {
                    name: process.env.BREVO_SENDER_NAME || "TravelApp Support",
                    email: process.env.BREVO_SENDER_EMAIL
                },
                to: [
                    {
                        email: to
                    }
                ],
                subject,
                htmlContent: html
            },
            {
                headers: {
                    accept: "application/json",
                    "api-key": process.env.BREVO_API_KEY,
                    "content-type": "application/json"
                }
            }
        );

        console.log("EMAIL ODESLÁN NA:", to);
    } catch (error) {
        console.error("BREVO EMAIL ERROR:", error.response?.data || error.message);
        throw new Error("Nepodařilo se odeslat e-mail.");
    }
}

async function sendPasswordChangeCode(email, code, userName) {
    return sendEmail({
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
}

async function sendRegistrationVerificationCode(email, code, userName) {
    return sendEmail({
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
}

module.exports = {
    sendPasswordChangeCode,
    sendRegistrationVerificationCode
};