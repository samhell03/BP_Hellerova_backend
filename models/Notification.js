const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
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
            default: null,
            index: true
        },

        type: {
            type: String,
            enum: [
                "trip_reminder_7_days",
                "trip_reminder_1_day",
                "trip_start_today",
                "trip_ending_1_day",
                "trip_ending_today",
                "weather_alert"
            ],
            required: true
        },

        severity: {
            type: String,
            enum: ["info", "warning", "danger"],
            default: "info"
        },

        sourceId: {
            type: String,
            default: null,
            index: true
        },

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

        isRead: {
            type: Boolean,
            default: false
        },

        scheduledFor: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Notification", NotificationSchema);