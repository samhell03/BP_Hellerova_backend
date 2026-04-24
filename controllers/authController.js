const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const {
    sendPasswordChangeCode,
    sendRegistrationVerificationCode
} = require("../services/emailService");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const PendingUser = require("../models/PendingUser");

function generateToken(user) {
    return jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
}

function validatePasswordRules(password) {
    if (!password) {
        return "Vyplň nové heslo.";
    }

    if (password !== password.trim()) {
        return "Heslo nesmí začínat ani končit mezerou.";
    }

    if (password.length < 6) {
        return "Heslo musí mít alespoň 6 znaků.";
    }

    if (!/[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/.test(password)) {
        return "Heslo musí obsahovat alespoň jedno velké písmeno.";
    }

    if (!(/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password))) {
        return "Heslo musí obsahovat alespoň číslici nebo speciální znak.";
    }

    return "";
}

function generateSixDigitCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

function hashVerificationCode(code) {
    return crypto.createHash("sha256").update(code).digest("hex");
}

function generateVerificationExpiry() {
    return new Date(Date.now() + 10 * 60 * 1000);
}

exports.register = async (req, res) => {
    try {
        const { userName, email, password } = req.body;

        if (!userName || !email || !password) {
            return res.status(400).json({
                message: "Vyplň všechna pole."
            });
        }

        const trimmedName = userName.trim();
        const normalizedEmail = email.trim().toLowerCase();

        if (!trimmedName) {
            return res.status(400).json({
                message: "Zadej jméno."
            });
        }

        if (trimmedName.length < 2) {
            return res.status(400).json({
                message: "Jméno musí mít alespoň 2 znaky."
            });
        }

        if (trimmedName.length > 50) {
            return res.status(400).json({
                message: "Jméno může mít maximálně 50 znaků."
            });
        }

        if (email !== email.trim()) {
            return res.status(400).json({
                message: "Email nesmí začínat ani končit mezerou."
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({
                message: "Zadej platný email."
            });
        }

        const passwordRuleError = validatePasswordRules(password);

        if (passwordRuleError) {
            return res.status(400).json({
                message: passwordRuleError
            });
        }

        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
            return res.status(400).json({
                message: "Uživatel s tímto emailem už existuje."
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const verificationCode = generateSixDigitCode();
        const verificationCodeHash = hashVerificationCode(verificationCode);
        const verificationCodeExpires = generateVerificationExpiry();

        await PendingUser.findOneAndUpdate(
            { email: normalizedEmail },
            {
                userName: trimmedName,
                email: normalizedEmail,
                passwordHash,
                verificationCodeHash,
                verificationCodeExpires,
                createdAt: new Date()
            },
            {
                upsert: true,
                returnDocument: "after",
                setDefaultsOnInsert: true
            }
        );

        await sendRegistrationVerificationCode(
            normalizedEmail,
            verificationCode,
            trimmedName
        );

        return res.status(200).json({
            message: "Na zadaný e-mail byl odeslán ověřovací kód.",
            email: normalizedEmail,
            requiresEmailVerification: true
        });
    } catch (error) {
        console.error("Register error:", error);
        return res.status(500).json({
            message: "Chyba serveru."
        });
    }
};

exports.verifyRegistrationCode = async (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({
                message: "Vyplň e-mail i ověřovací kód."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const normalizedCode = String(code).trim();

        if (!/^\d{6}$/.test(normalizedCode)) {
            return res.status(400).json({
                message: "Ověřovací kód musí mít 6 číslic."
            });
        }

        const pendingUser = await PendingUser.findOne({ email: normalizedEmail });

        if (!pendingUser) {
            return res.status(404).json({
                message: "Nebyla nalezena žádná čekající registrace."
            });
        }

        if (pendingUser.verificationCodeExpires.getTime() < Date.now()) {
            await PendingUser.deleteOne({ _id: pendingUser._id });

            return res.status(400).json({
                message: "Platnost ověřovacího kódu vypršela. Zaregistrujte se prosím znovu."
            });
        }

        const incomingCodeHash = hashVerificationCode(normalizedCode);

        if (incomingCodeHash !== pendingUser.verificationCodeHash) {
            return res.status(400).json({
                message: "Ověřovací kód není správný."
            });
        }

        const alreadyExistingUser = await User.findOne({ email: normalizedEmail });

        if (alreadyExistingUser) {
            await PendingUser.deleteOne({ _id: pendingUser._id });

            return res.status(400).json({
                message: "Uživatel s tímto emailem už existuje."
            });
        }

        const user = await User.create({
            userName: pendingUser.userName,
            email: pendingUser.email,
            password: pendingUser.passwordHash,
            authProvider: "local"
        });

        await PendingUser.deleteOne({ _id: pendingUser._id });

        const token = generateToken(user);

        return res.status(201).json({
            message: "E-mail byl úspěšně ověřen a účet vytvořen.",
            token,
            userId: user._id,
            userName: user.userName
        });
    } catch (error) {
        console.error("Verify registration code error:", error);
        return res.status(500).json({
            message: "Nepodařilo se ověřit registrační kód."
        });
    }
};

exports.resendRegistrationCode = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !email.trim()) {
            return res.status(400).json({
                message: "Zadej e-mail."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const pendingUser = await PendingUser.findOne({ email: normalizedEmail });

        if (!pendingUser) {
            return res.status(404).json({
                message: "Nebyla nalezena žádná čekající registrace."
            });
        }

        const verificationCode = generateSixDigitCode();

        pendingUser.verificationCodeHash = hashVerificationCode(verificationCode);
        pendingUser.verificationCodeExpires = generateVerificationExpiry();
        pendingUser.createdAt = new Date();

        await pendingUser.save();

        await sendRegistrationVerificationCode(
            pendingUser.email,
            verificationCode,
            pendingUser.userName
        );

        return res.status(200).json({
            message: "Nový ověřovací kód byl znovu odeslán."
        });
    } catch (error) {
        console.error("Resend registration code error:", error);
        return res.status(500).json({
            message: "Nepodařilo se znovu odeslat ověřovací kód."
        });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Vyplň email i heslo."
            });
        }

        const user = await User.findOne({ email: email.trim().toLowerCase() });

        if (!user) {
            return res.status(401).json({
                message: "Neplatný email nebo heslo."
            });
        }

        if (!user.password) {
            return res.status(400).json({
                message: "Tento účet používá přihlášení přes Google."
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                message: "Neplatný email nebo heslo."
            });
        }

        const token = generateToken(user);

        return res.json({
            token,
            userId: user._id,
            userName: user.userName
        });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({
            message: "Chyba serveru."
        });
    }
};

exports.googleLogin = async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({
                message: "Chybí Google credential token."
            });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();

        if (!payload) {
            return res.status(401).json({
                message: "Google token se nepodařilo ověřit."
            });
        }

        const {
            sub,
            email,
            email_verified,
            name,
            picture
        } = payload;

        if (!email || !email_verified) {
            return res.status(401).json({
                message: "Google účet nemá ověřený email."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        let user = await User.findOne({
            $or: [
                { googleId: sub },
                { email: normalizedEmail }
            ]
        });

        if (!user) {
            user = await User.create({
                userName: (name || normalizedEmail.split("@")[0]).trim(),
                email: normalizedEmail,
                googleId: sub,
                authProvider: "google",
                avatar: picture || null,
                password: null
            });
        } else {
            let changed = false;

            if (!user.googleId) {
                user.googleId = sub;
                changed = true;
            }

            if (user.authProvider !== "google") {
                user.authProvider = "google";
                changed = true;
            }

            if (picture && user.avatar !== picture) {
                user.avatar = picture;
                changed = true;
            }

            if ((!user.userName || !user.userName.trim()) && name) {
                user.userName = name.trim();
                changed = true;
            }

            if (changed) {
                await user.save();
            }
        }

        const token = generateToken(user);

        return res.json({
            token,
            userId: user._id,
            userName: user.userName
        });
    } catch (error) {
        console.error("Google login error:", error);
        return res.status(401).json({
            message: "Přihlášení přes Google se nezdařilo."
        });
    }
};

exports.me = async (req, res) => {
    try {
        return res.json({
            userId: req.user._id,
            userName: req.user.userName,
            email: req.user.email,
            authProvider: req.user.authProvider || "local",
            avatar: req.user.avatar || null,
            createdAt: req.user.createdAt
        });
    } catch (error) {
        console.error("Me error:", error);
        return res.status(500).json({
            message: "Chyba serveru."
        });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                message: "Vyplň všechna pole."
            });
        }

        if (currentPassword !== currentPassword.trim()) {
            return res.status(400).json({
                message: "Aktuální heslo nesmí začínat ani končit mezerou."
            });
        }

        const passwordRuleError = validatePasswordRules(newPassword);

        if (passwordRuleError) {
            return res.status(400).json({
                message: passwordRuleError
            });
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                message: "Uživatel nebyl nalezen."
            });
        }

        if (!user.password) {
            return res.status(400).json({
                message: "Tento účet používá přihlášení přes Google, takže nemá klasické heslo."
            });
        }

        const isCurrentPasswordValid = await bcrypt.compare(
            currentPassword,
            user.password
        );

        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                message: "Aktuální heslo není správné."
            });
        }

        const isSamePassword = await bcrypt.compare(newPassword, user.password);

        if (isSamePassword) {
            return res.status(400).json({
                message: "Nové heslo nesmí být stejné jako současné."
            });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        user.password = hashedNewPassword;
        await user.save();

        return res.status(200).json({
            message: "Heslo bylo úspěšně změněno."
        });
    } catch (error) {
        console.error("Change password error:", error);
        return res.status(500).json({
            message: "Chyba serveru."
        });
    }
};

exports.requestPasswordChangeCode = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                message: "Vyplň všechna pole."
            });
        }

        if (currentPassword !== currentPassword.trim()) {
            return res.status(400).json({
                message: "Aktuální heslo nesmí začínat ani končit mezerou."
            });
        }

        const passwordRuleError = validatePasswordRules(newPassword);

        if (passwordRuleError) {
            return res.status(400).json({
                message: passwordRuleError
            });
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                message: "Uživatel nebyl nalezen."
            });
        }

        if (!user.password) {
            return res.status(400).json({
                message: "Tento účet používá přihlášení přes Google, takže nemá klasické heslo."
            });
        }

        const isCurrentPasswordValid = await bcrypt.compare(
            currentPassword,
            user.password
        );

        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                message: "Aktuální heslo není správné."
            });
        }

        const isSamePassword = await bcrypt.compare(newPassword, user.password);

        if (isSamePassword) {
            return res.status(400).json({
                message: "Nové heslo nesmí být stejné jako současné."
            });
        }

        const verificationCode = generateSixDigitCode();
        const codeHash = hashVerificationCode(verificationCode);
        const pendingPasswordHash = await bcrypt.hash(newPassword, 10);

        user.passwordChangeCodeHash = codeHash;
        user.passwordChangeCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
        user.pendingPasswordHash = pendingPasswordHash;

        await user.save();

        await sendPasswordChangeCode(user.email, verificationCode, user.userName);

        return res.status(200).json({
            message: `Ověřovací kód byl odeslán na e-mail ${user.email}.`
        });
    } catch (error) {
        console.error("Request password change code error:", error);
        return res.status(500).json({
            message: "Nepodařilo se odeslat ověřovací kód."
        });
    }
};

exports.confirmPasswordChange = async (req, res) => {
    try {
        const { code } = req.body;

        if (!code || !String(code).trim()) {
            return res.status(400).json({
                message: "Zadejte ověřovací kód."
            });
        }

        const normalizedCode = String(code).trim();

        if (!/^\d{6}$/.test(normalizedCode)) {
            return res.status(400).json({
                message: "Ověřovací kód musí mít 6 číslic."
            });
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                message: "Uživatel nebyl nalezen."
            });
        }

        if (
            !user.passwordChangeCodeHash ||
            !user.passwordChangeCodeExpires ||
            !user.pendingPasswordHash
        ) {
            return res.status(400).json({
                message: "Nebyla nalezena žádná čekající změna hesla."
            });
        }

        if (user.passwordChangeCodeExpires.getTime() < Date.now()) {
            user.passwordChangeCodeHash = null;
            user.passwordChangeCodeExpires = null;
            user.pendingPasswordHash = null;
            await user.save();

            return res.status(400).json({
                message: "Platnost ověřovacího kódu vypršela. Požádejte o nový kód."
            });
        }

        const incomingCodeHash = hashVerificationCode(normalizedCode);

        if (incomingCodeHash !== user.passwordChangeCodeHash) {
            return res.status(400).json({
                message: "Ověřovací kód není správný."
            });
        }

        user.password = user.pendingPasswordHash;
        user.passwordChangeCodeHash = null;
        user.passwordChangeCodeExpires = null;
        user.pendingPasswordHash = null;

        await user.save();

        return res.status(200).json({
            message: "Heslo bylo úspěšně změněno."
        });
    } catch (error) {
        console.error("Confirm password change error:", error);
        return res.status(500).json({
            message: "Nepodařilo se potvrdit změnu hesla."
        });
    }
};

exports.updateName = async (req, res) => {
    try {
        const { userName } = req.body;

        if (!userName || !userName.trim()) {
            return res.status(400).json({
                message: "Zadej nové jméno."
            });
        }

        const trimmedName = userName.trim();

        if (trimmedName.length < 2) {
            return res.status(400).json({
                message: "Jméno musí mít alespoň 2 znaky."
            });
        }

        if (trimmedName.length > 50) {
            return res.status(400).json({
                message: "Jméno může mít maximálně 50 znaků."
            });
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                message: "Uživatel nebyl nalezen."
            });
        }

        user.userName = trimmedName;
        await user.save();

        return res.status(200).json({
            message: "Jméno bylo úspěšně změněno.",
            userId: user._id,
            userName: user.userName,
            email: user.email
        });
    } catch (error) {
        console.error("Update name error:", error);
        return res.status(500).json({
            message: "Chyba serveru."
        });
    }
};