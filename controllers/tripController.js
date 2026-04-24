const Trip = require("../models/Trip");
const { createPackagesForTrip } = require("./packageController");

const MIN_TRIP_YEAR = 1950;
const MAX_TRIP_YEAR = 2100;
const MAX_TRIP_DURATION_DAYS = 365;

function normalizeCoordinate(value) {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    const numberValue = Number(value);

    if (!Number.isFinite(numberValue)) {
        return NaN;
    }

    return numberValue;
}

function validateTripPayload(body) {
    const {
        title,
        country,
        countryCode,
        city,
        cityLat,
        cityLng,
        startDate,
        endDate
    } = body;

    if (!title || !title.trim()) {
        return "Název cesty je povinný.";
    }

    if (title.trim().length < 3) {
        return "Název cesty musí mít alespoò 3 znaky.";
    }

    if (title.trim().length > 60) {
        return "Název cesty mùže mít maximálnì 60 znakù.";
    }

    if (!country || !country.trim()) {
        return "Zemì je povinná.";
    }

    if (!countryCode || !countryCode.trim()) {
        return "Kód zemì je povinný.";
    }

    if (countryCode.trim().length !== 2) {
        return "Kód zemì musí mít pøesnì 2 znaky.";
    }

    if (city != null && typeof city !== "string") {
        return "Mìsto musí být text.";
    }

    if (typeof city === "string" && city.trim().length > 80) {
        return "Mìsto mùže mít maximálnì 80 znakù.";
    }

    const normalizedCityLat = normalizeCoordinate(cityLat);
    const normalizedCityLng = normalizeCoordinate(cityLng);

    if (Number.isNaN(normalizedCityLat) || Number.isNaN(normalizedCityLng)) {
        return "Souøadnice mìsta nejsou platné.";
    }

    const hasOnlyOneCoordinate =
        (normalizedCityLat === null && normalizedCityLng !== null) ||
        (normalizedCityLat !== null && normalizedCityLng === null);

    if (hasOnlyOneCoordinate) {
        return "Souøadnice mìsta nejsou kompletní.";
    }

    if (!startDate) {
        return "Datum odjezdu je povinné.";
    }

    if (!endDate) {
        return "Datum návratu je povinné.";
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return "Datum není ve správném formátu.";
    }

    const startYear = start.getFullYear();
    const endYear = end.getFullYear();

    if (startYear < MIN_TRIP_YEAR || startYear > MAX_TRIP_YEAR) {
        return `Datum odjezdu musí být v rozmezí let ${MIN_TRIP_YEAR} až ${MAX_TRIP_YEAR}.`;
    }

    if (endYear < MIN_TRIP_YEAR || endYear > MAX_TRIP_YEAR) {
        return `Datum návratu musí být v rozmezí let ${MIN_TRIP_YEAR} až ${MAX_TRIP_YEAR}.`;
    }

    if (start > end) {
        return "Datum od nemùže být po datu do.";
    }

    const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

    if (diffDays > MAX_TRIP_DURATION_DAYS) {
        return `Výlet mùže trvat maximálnì ${MAX_TRIP_DURATION_DAYS} dní.`;
    }

    return null;
}

// POST /api/trips
exports.createTrip = async (req, res) => {
    try {
        const userId = req.user._id;

        const {
            title,
            country,
            countryCode,
            city,
            cityLat,
            cityLng,
            startDate,
            endDate,
            category,            // ??
            selectedPackages     // ??
        } = req.body;

        const validationError = validateTripPayload(req.body);

        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        const newTrip = new Trip({
            userId,
            title: title.trim(),
            country: country.trim(),
            countryCode: countryCode.trim().toUpperCase(),
            city: city ? city.trim() : "",
            cityLat: normalizeCoordinate(cityLat),
            cityLng: normalizeCoordinate(cityLng),
            startDate,
            endDate,

            category: category || "general" // ?? fallback
        });

        await newTrip.save();

        // ?? vytvoøení balíèkù podle výbìru
        if (selectedPackages && Array.isArray(selectedPackages) && selectedPackages.length > 0) {
            try {
                await createPackagesForTrip(userId, newTrip._id, selectedPackages);
            } catch (pkgErr) {
                console.error("Package creation error:", pkgErr);
                // nechceme shodit celý request kvùli balíèkùm
            }
        }

        return res.status(201).json(newTrip);

    } catch (err) {
        if (err.name === "ValidationError") {
            const firstError = Object.values(err.errors)[0];
            return res.status(400).json({
                message: firstError?.message || "Neplatná data výletu."
            });
        }

        console.error("Create trip error:", err);
        return res.status(500).json({
            message: "Chyba serveru pøi vytváøení výletu."
        });
    }
};

// GET /api/trips
exports.getMyTrips = async (req, res) => {
    try {
        const userId = req.user._id;
        const trips = await Trip.find({ userId }).sort({ startDate: 1 });

        return res.json(trips);
    } catch (err) {
        console.error("Get my trips error:", err);
        return res.status(500).json({
            message: "Chyba serveru pøi naèítání výletù."
        });
    }
};

// GET /api/trips/:id
exports.getTripById = async (req, res) => {
    try {
        const userId = req.user._id;
        const trip = await Trip.findOne({ _id: req.params.id, userId });

        if (!trip) {
            return res.status(404).json({ message: "Výlet nenalezen." });
        }

        return res.json(trip);
    } catch (err) {
        console.error("Get trip by id error:", err);
        return res.status(500).json({
            message: "Chyba serveru pøi naèítání výletu."
        });
    }
};

// PUT /api/trips/:id
exports.updateTrip = async (req, res) => {
    try {
        const userId = req.user._id;
        const {
            title,
            country,
            countryCode,
            city,
            cityLat,
            cityLng,
            startDate,
            endDate,
            category
        } = req.body;

        const validationError = validateTripPayload(req.body);

        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        const updated = await Trip.findOneAndUpdate(
            { _id: req.params.id, userId },
            {
                title: title.trim(),
                country: country.trim(),
                countryCode: countryCode.trim().toUpperCase(),
                city: city ? city.trim() : "",
                cityLat: normalizeCoordinate(cityLat),
                cityLng: normalizeCoordinate(cityLng),
                startDate,
                endDate,
                category: category || "general" // ??
            },
            { new: true, runValidators: true }
        );

        if (!updated) {
            return res.status(404).json({ message: "Výlet nenalezen." });
        }

        return res.json(updated);
    } catch (err) {
        if (err.name === "ValidationError") {
            const firstError = Object.values(err.errors)[0];
            return res.status(400).json({
                message: firstError?.message || "Neplatná data výletu."
            });
        }

        console.error("Update trip error:", err);
        return res.status(500).json({
            message: "Chyba serveru pøi úpravì výletu."
        });
    }
};

// DELETE /api/trips/:id
exports.deleteTrip = async (req, res) => {
    try {
        const userId = req.user._id;

        const deleted = await Trip.findOneAndDelete({
            _id: req.params.id,
            userId
        });

        if (!deleted) {
            return res.status(404).json({ message: "Výlet nenalezen." });
        }

        return res.json({ message: "Výlet byl úspìšnì smazán." });
    } catch (err) {
        console.error("Delete trip error:", err);
        return res.status(500).json({
            message: "Chyba serveru pøi mazání výletu."
        });
    }
};