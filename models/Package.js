const mongoose = require("mongoose");

const PackingItemSchema = new mongoose.Schema(
    {
        text: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120
        },
        checked: {
            type: Boolean,
            default: false
        }
    },
    { _id: true }
);

const ContactItemSchema = new mongoose.Schema(
    {
        label: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80
        },
        value: {
            type: String,
            trim: true,
            maxlength: 160,
            default: ""
        }
    },
    { _id: true }
);

const NotificationItemSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120
        },
        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 300
        },
        severity: {
            type: String,
            enum: ["info", "warning", "danger"],
            default: "info"
        },
        isRead: {
            type: Boolean,
            default: false
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    },
    { _id: true }
);

const PackageSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        tripId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Trip",
            required: true,
            index: true
        },

        title: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 80
        },

        type: {
            type: String,
            required: true,
            enum: ["weather", "notifications", "contacts", "packing", "custom"]
        },

        sourceType: {
            type: String,
            enum: ["template", "shared", "private"],
            default: "template"
        },

        visibility: {
            type: String,
            enum: ["private", "shared"],
            default: "private"
        },

        templateKey: {
            type: String,
            default: ""
        },

        isEnabled: {
            type: Boolean,
            default: true
        },

        contacts: {
            type: [ContactItemSchema],
            default: []
        },

        packingItems: {
            type: [PackingItemSchema],
            default: []
        },

        notifications: {
            type: [NotificationItemSchema],
            default: []
        },

        meta: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Package", PackageSchema);