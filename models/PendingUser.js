const mongoose = require("mongoose");

const PendingUserSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 50
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    passwordHash: {
        type: String,
        required: true
    },
    verificationCodeHash: {
        type: String,
        required: true
    },
    verificationCodeExpires: {
        type: Date,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 60 * 60 * 24
    }
});

module.exports = mongoose.model("PendingUser", PendingUserSchema);