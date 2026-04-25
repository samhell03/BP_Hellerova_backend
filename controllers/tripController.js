const Trip = require("../models/Trip");
const { createPackagesForTrip } = require("./packageController");
const Package = require("../models/Package");
const { getEmergencyContacts } = require("../data/emergencyContacts");

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
        return "Název cesty musí mít alespoň 3 znaky.";
    }

    if (title.trim().length > 60) {
        return "Název cesty může mít maximálně 60 znaků.";
    }

    if (!country || !country.trim()) {
        return "Země je povinná.";
    }

    if (!countryCode || !countryCode.trim()) {
        return "Kód země je povinný.";
    }

    if (countryCode.trim().length !== 2) {
        return "Kód země musí mít přesně 2 znaky.";
    }

    if (city != null && typeof city !== "string") {
        return "Město musí být text.";
    }

    if (typeof city === "string" && city.trim().length > 80) {
        return "Město může mít maximálně 80 znaků.";
    }

    const normalizedCityLat = normalizeCoordinate(cityLat);
    const normalizedCityLng = normalizeCoordinate(cityLng);

    if (Number.isNaN(normalizedCityLat) || Number.isNaN(normalizedCityLng)) {
        return "Souřadnice města nejsou platné.";
    }

    const hasOnlyOneCoordinate =
        (normalizedCityLat === null && normalizedCityLng !== null) ||
        (normalizedCityLat !== null && normalizedCityLng === null);

    if (hasOnlyOneCoordinate) {
        return "Souřadnice města nejsou kompletní.";
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
        return "Datum od nemůže být po datu do.";
    }

    const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

    if (diffDays > MAX_TRIP_DURATION_DAYS) {
        return `Výlet může trvat maximálně ${MAX_TRIP_DURATION_DAYS} dní.`;
    }

    return null;
}

function createPackingItems(items = []) {
    return items.map((text) => ({
        text,
        checked: false
    }));
}

function getBasePackingItems() {
    return [
        "Cestovní doklady",
        "Peněženka a karta",
        "Telefon",
        "Nabíječka",
        "Oblečení",
        "Hygiena",
        "Léky",
        "Klíče",
        "Láhev na vodu"
    ];
}

function getCategoryPackingItems(category) {
    switch (category) {
        case "vacation":
            return [
                "Plavky",
                "Ručník",
                "Sluneční brýle",
                "Opalovací krém",
                "Pokrývka hlavy",
                "Sandály / lehká obuv"
            ];

        case "mountains":
            return [
                "Pevné boty",
                "Funkční oblečení",
                "Teplá mikina",
                "Nepromokavá bunda",
                "Náhradní ponožky",
                "Batoh",
                "Powerbanka",
                "Lékárnička"
            ];

        case "camping":
            return [
                "Stan",
                "Spacák",
                "Karimatka",
                "Čelovka",
                "Vařič / ešus",
                "Repelent",
                "Sirky / zapalovač",
                "Nůž",
                "Powerbanka"
            ];

        case "city":
            return [
                "Pohodlné boty",
                "Doklady / rezervace",
                "Městský batoh / kabelka",
                "Sluchátka",
                "Deštník"
            ];

        case "roadtrip":
            return [
                "Řidičský průkaz",
                "Doklady od auta",
                "Nabíječka do auta",
                "Držák na mobil",
                "Powerbanka",
                "Voda a svačina",
                "Sluneční brýle",
                "Lékárnička",
                "Hotovost"
            ];

        default:
            return [];
    }
}

function getPackingItemsForTrip(trip) {
    const uniqueItems = [
        ...new Set([
            ...getBasePackingItems(),
            ...getCategoryPackingItems(trip?.category)
        ])
    ];

    return createPackingItems(uniqueItems);
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

        // ?? vytvoření balíčků podle výběru
        if (selectedPackages && Array.isArray(selectedPackages) && selectedPackages.length > 0) {
            try {
                await createPackagesForTrip(userId, newTrip._id, selectedPackages);
            } catch (pkgErr) {
                console.error("Package creation error:", pkgErr);
                // nechceme shodit celý request kvůli balíčkům
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
            message: "Chyba serveru při vytváření výletu."
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
            message: "Chyba serveru při načítání výletů."
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
            message: "Chyba serveru při načítání výletu."
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
            { returnDocument: "after", runValidators: true }
        );

        if (!updated) {
            return res.status(404).json({ message: "Výlet nenalezen." });
        }
        const existingPackages = await Package.find({
            userId,
            tripId: updated._id,
            isEnabled: true
        });

        for (const pack of existingPackages) {
            if (pack.type === "packing") {
                pack.packingItems = getPackingItemsForTrip(updated);
                pack.meta = {
                    ...(pack.meta || {}),
                    category: updated.category || "general",
                    generatedFromCategory: true,
                    regeneratedAfterTripEdit: true
                };

                await pack.save();
            }

            if (pack.type === "contacts") {
                pack.contacts = [
                    ...getEmergencyContacts(updated.countryCode),
                    { label: "Ambasáda", value: "" },
                    { label: "Pojišťovna", value: "" },
                    { label: "Nouzový kontakt", value: "" }
                ];

                await pack.save();
            }

            if (pack.type === "notifications") {
                pack.notifications = [];
                await pack.save();
            }
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
            message: "Chyba serveru při úpravě výletu."
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

        return res.json({ message: "Výlet byl úspěšně smazán." });
    } catch (err) {
        console.error("Delete trip error:", err);
        return res.status(500).json({
            message: "Chyba serveru při mazání výletu."
        });
    }
};