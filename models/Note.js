const mongoose = require("mongoose");

const NoteChecklistItemSchema = new mongoose.Schema(
    {
        text: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200
        },
        checked: {
            type: Boolean,
            default: false
        }
    },
    { _id: true }
);

const NoteSchema = new mongoose.Schema(
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
            maxlength: 120
        },

        content: {
            type: String,
            trim: true,
            maxlength: 5000,
            default: ""
        },

        labelColor: {
            type: String,
            enum: ["default", "blue", "green", "yellow", "red", "purple"],
            default: "default"
        },

        isPinned: {
            type: Boolean,
            default: false
        },

        checklistItems: {
            type: [NoteChecklistItemSchema],
            default: []
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Note", NoteSchema);