const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
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
    password: {
        type: String,
        default: null
    },
    googleId: {
        type: String,
        default: null,
        index: true
    },
    authProvider: {
        type: String,
        enum: ["local", "google"],
        default: "local"
    },
    personalDataConsent: {
        type: Boolean,
        default: false
    },

    personalDataConsentAt: {
        type: Date,
        default: null
    },

    personalDataConsentVersion: {
        type: String,
        default: null
    },

    avatar: {
        type: String,
        default: null
    },

    passwordChangeCodeHash: {
        type: String,
        default: null
    },
    passwordChangeCodeExpires: {
        type: Date,
        default: null
    },
    pendingPasswordHash: {
        type: String,
        default: null
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("User", UserSchema);