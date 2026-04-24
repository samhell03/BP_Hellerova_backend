const mongoose = require("mongoose");

const MIN_TRIP_YEAR = 1950;
const MAX_TRIP_YEAR = 2100;
const MAX_TRIP_DURATION_DAYS = 365;

function isDateInAllowedRange(value) {
    if (!value) return false;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;

    const year = date.getFullYear();
    return year >= MIN_TRIP_YEAR && year <= MAX_TRIP_YEAR;
}

const TripSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    title: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 60
    },

    category: {
        type: String,
        default: "general"
    },

    country: {
        type: String,
        required: true,
        trim: true
    },

    countryCode: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
        minlength: 2,
        maxlength: 2
    },

    city: {
        type: String,
        trim: true,
        default: "",
        maxlength: 80
    },

    cityLat: {
        type: Number,
        default: null
    },

    cityLng: {
        type: Number,
        default: null
    },

    startDate: {
        type: Date,
        required: true,
        validate: {
            validator: isDateInAllowedRange,
            message: `Datum odjezdu musí být v rozmezí let ${MIN_TRIP_YEAR} až ${MAX_TRIP_YEAR}.`
        }
    },

    endDate: {
        type: Date,
        required: true,
        validate: {
            validator: isDateInAllowedRange,
            message: `Datum návratu musí být v rozmezí let ${MIN_TRIP_YEAR} až ${MAX_TRIP_YEAR}.`
        }
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

TripSchema.pre("validate", function () {
    if (!this.startDate || !this.endDate) {
        return;
    }

    const start = new Date(this.startDate);
    const end = new Date(this.endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return;
    }

    if (start > end) {
        this.invalidate("endDate", "Datum od nemùže být po datu do.");
        return;
    }

    const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

    if (diffDays > MAX_TRIP_DURATION_DAYS) {
        this.invalidate(
            "endDate",
            `Výlet mùže trvat maximálnì ${MAX_TRIP_DURATION_DAYS} dní.`
        );
    }
});

module.exports = mongoose.model("Trip", TripSchema);