// -*- coding: utf-8 -*-
const axios = require("axios");
const Package = require("../models/Package");
const Trip = require("../models/Trip");
const Notification = require("../models/Notification");
const { getEmergencyContacts } = require("../data/emergencyContacts");

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
            return ["Plavky", "Ručník", "Sluneční brýle", "Opalovací krém", "Pokrývka hlavy", "Sandály / lehká obuv"];
        case "mountains":
            return ["Pevné boty", "Funkční oblečení", "Teplá mikina", "Nepromokavá bunda", "Náhradní ponožky", "Batoh", "Powerbanka", "Lékárnička"];
        case "camping":
            return ["Stan", "Spacák", "Karimatka", "Čelovka", "Vařič / ešus", "Repelent", "Sirky / zapalovač", "Nůž", "Powerbanka"];
        case "city":
            return ["Pohodlné boty", "Doklady / rezervace", "Městský batoh / kabelka", "Sluchátka", "Deštník"];
        case "roadtrip":
            return ["Řidičský průkaz", "Doklady od auta", "Nabíječka do auta", "Držák na mobil", "Powerbanka", "Voda a svačina", "Sluneční brýle", "Lékárnička", "Hotovost"];
        default:
            return [];
    }
}

function getPackingItemsForTrip(trip) {
    const uniqueItems = [...new Set([...getBasePackingItems(), ...getCategoryPackingItems(trip?.category)])];
    return createPackingItems(uniqueItems);
}

function createTemplatePayload(type, trip) {
    switch (type) {
        case "weather":
            return {
                title: "Počasí",
                type: "weather",
                sourceType: "template",
                visibility: "private",
                templateKey: "weather",
                meta: {}
            };

        case "notifications":
            return {
                title: "Notifikace",
                type: "notifications",
                sourceType: "template",
                visibility: "private",
                templateKey: "notifications",
                meta: {
                    thresholds: {
                        hotTemp: 32,
                        coldTemp: 0,
                        rainMm: 10,
                        windKmH: 50
                    }
                }
            };

        case "contacts":
            return {
                title: "Kontakty",
                type: "contacts",
                sourceType: "template",
                visibility: "private",
                templateKey: "contacts",
                contacts: [
                    ...getEmergencyContacts(trip.countryCode),
                    { label: "Ambasáda", value: "" },
                    { label: "Pojišťovna", value: "" },
                    { label: "Nouzový kontakt", value: "" }
                ]
            };

        case "packing":
            return {
                title: "Zabalit",
                type: "packing",
                sourceType: "template",
                visibility: "private",
                templateKey: "packing",
                packingItems: getPackingItemsForTrip(trip),
                meta: {
                    category: trip?.category || "general",
                    generatedFromCategory: true
                }
            };

        default:
            return null;
    }
}

async function fetchWeather(lat, lng) {
    const response = await axios.get("https://api.open-meteo.com/v1/forecast", {
        params: {
            latitude: lat,
            longitude: lng,
            current: "temperature_2m,weather_code,wind_speed_10m",
            hourly: "temperature_2m,weather_code",
            daily: "temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum",
            timezone: "auto",
            forecast_days: 3
        }
    });

    return response.data;
}

function formatAlertDate(day) {
    return new Date(day).toLocaleDateString("cs-CZ", {
        weekday: "long",
        day: "numeric",
        month: "numeric"
    });
}

function isTripOngoing(trip) {
    const today = new Date();
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return start <= today && today <= end;
}

function buildWeatherAlerts(weatherData, thresholds = {}) {
    const notifications = [];
    const hotTemp = thresholds.hotTemp ?? 32;
    const coldTemp = thresholds.coldTemp ?? 0;
    const rainMm = thresholds.rainMm ?? 10;
    const windKmH = thresholds.windKmH ?? 50;

    const daily = weatherData?.daily;
    if (!daily?.time?.length) return notifications;

    for (let i = 0; i < daily.time.length; i += 1) {
        const day = daily.time[i];
        const max = daily.temperature_2m_max?.[i];
        const min = daily.temperature_2m_min?.[i];
        const rain = daily.precipitation_sum?.[i];
        const code = daily.weather_code?.[i];

        if (typeof max === "number" && max >= hotTemp) {
            notifications.push({
                title: "Extrémní horko",
                message: `${formatAlertDate(day)} může být až ${Math.round(max)} °C.`,
                severity: "warning",
                alertDate: new Date(day),
                priority: 2
            });
        }

        if (typeof min === "number" && min <= coldTemp) {
            notifications.push({
                title: "Nízká teplota",
                message: `${formatAlertDate(day)} může teplota klesnout na ${Math.round(min)} °C.`,
                severity: "warning",
                alertDate: new Date(day),
                priority: 2
            });
        }

        if (typeof rain === "number" && rain >= rainMm) {
            notifications.push({
                title: "Vydatný déšť",
                message: `${formatAlertDate(day)} se očekává vydatný déšť (${Math.round(rain)} mm).`,
                severity: "warning",
                alertDate: new Date(day),
                priority: 3
            });
        }

        if ([95, 96, 99].includes(code)) {
            notifications.push({
                title: "Bouřka",
                message: `${formatAlertDate(day)} předpověď indikuje bouřku.`,
                severity: "danger",
                alertDate: new Date(day),
                priority: 1
            });
        }
    }

    const currentWind = weatherData?.current?.wind_speed_10m;

    if (typeof currentWind === "number" && currentWind >= windKmH) {
        notifications.push({
            title: "Silný vítr",
            message: `Aktuálně je v destinaci hlášen silný vítr ${Math.round(currentWind)} km/h.`,
            severity: "warning",
            alertDate: new Date(),
            priority: 4
        });
    }

    notifications.sort((a, b) => {
        const dateDiff = new Date(a.alertDate || 0) - new Date(b.alertDate || 0);
        if (dateDiff !== 0) return dateDiff;
        return (a.priority || 5) - (b.priority || 5);
    });

    return notifications;
}

async function createWeatherBellNotifications(userId, trip, alerts) {
    if (!isTripOngoing(trip)) return;

    for (const alert of alerts) {
        const sourceId = `weather-${trip._id}-${alert.title}-${new Date(alert.alertDate || Date.now()).toISOString()}`;

        const exists = await Notification.findOne({
            userId,
            tripId: trip._id,
            type: "weather_alert",
            sourceId
        });

        if (exists) continue;

        await Notification.create({
            userId,
            tripId: trip._id,
            type: "weather_alert",
            title: alert.title,
            message: `${trip.title}: ${alert.message}`,
            severity: alert.severity || "warning",
            scheduledFor: alert.alertDate || new Date(),
            sourceId
        });
    }
}

exports.importTemplateToTrip = async (req, res) => {
    try {
        const userId = req.user._id;
        const { type, tripId } = req.body;

        if (!type || !tripId) {
            return res.status(400).json({ message: "Typ balíčku a tripId jsou povinné." });
        }

        const trip = await Trip.findOne({ _id: tripId, userId });
        if (!trip) {
            return res.status(404).json({ message: "Výlet nebyl nalezen." });
        }

        const existing = await Package.findOne({
            userId,
            tripId,
            type,
            isEnabled: true
        });

        if (existing) {
            return res.status(400).json({ message: "Tento balíček už ve výletu existuje." });
        }

        const payload = createTemplatePayload(type, trip);
        if (!payload) {
            return res.status(400).json({ message: "Neznámý typ šablony balíčku." });
        }

        const created = await Package.create({
            userId,
            tripId,
            ...payload
        });

        return res.status(201).json(created);
    } catch (err) {
        console.error("Import template package error:", err);
        return res.status(500).json({ message: "Chyba serveru při importu balíčku." });
    }
};

exports.getTripPackages = async (req, res) => {
    try {
        const userId = req.user._id;
        const { tripId } = req.params;

        const trip = await Trip.findOne({ _id: tripId, userId });
        if (!trip) {
            return res.status(404).json({ message: "Výlet nebyl nalezen." });
        }

        const packages = await Package.find({
            userId,
            tripId,
            isEnabled: true
        }).sort({ createdAt: -1 });

        return res.json(packages);
    } catch (err) {
        console.error("Get trip packages error:", err);
        return res.status(500).json({ message: "Chyba při načítání balíčků." });
    }
};

exports.getPackageWeather = async (req, res) => {
    try {
        const userId = req.user._id;
        const pack = await Package.findOne({ _id: req.params.id, userId });

        if (!pack) {
            return res.status(404).json({ message: "Balíček nebyl nalezen." });
        }

        const trip = await Trip.findOne({ _id: pack.tripId, userId });
        if (!trip) {
            return res.status(404).json({ message: "Výlet nebyl nalezen." });
        }

        if (trip.cityLat == null || trip.cityLng == null) {
            return res.status(400).json({
                message: "Výlet nemá uložené souřadnice města, počasí nelze načíst."
            });
        }

        const weather = await fetchWeather(trip.cityLat, trip.cityLng);
        return res.json(weather);
    } catch (err) {
        console.error("Get package weather error:", err);
        return res.status(500).json({ message: "Chyba při načítání počasí." });
    }
};

async function createPackagesForTrip(userId, tripId, selectedPackages = []) {
    if (!Array.isArray(selectedPackages) || selectedPackages.length === 0) {
        return [];
    }

    const trip = await Trip.findOne({ _id: tripId, userId });
    if (!trip) {
        throw new Error("Výlet nebyl nalezen pro vytvoření balíčků.");
    }

    const allowedTypes = ["weather", "notifications", "contacts", "packing"];
    const validTypes = [...new Set(selectedPackages)].filter((type) =>
        allowedTypes.includes(type)
    );

    if (validTypes.length === 0) return [];

    const existingPackages = await Package.find({
        userId,
        tripId,
        type: { $in: validTypes },
        isEnabled: true
    }).select("type");

    const existingTypes = existingPackages.map((pkg) => pkg.type);
    const typesToCreate = validTypes.filter((type) => !existingTypes.includes(type));

    if (typesToCreate.length === 0) return [];

    const payloads = typesToCreate
        .map((type) => {
            const payload = createTemplatePayload(type, trip);
            if (!payload) return null;

            return {
                userId,
                tripId,
                ...payload
            };
        })
        .filter(Boolean);

    if (payloads.length === 0) return [];

    return Package.insertMany(payloads);
}

exports.generatePackageAlerts = async (req, res) => {
    try {
        const userId = req.user._id;
        const pack = await Package.findOne({ _id: req.params.id, userId });

        if (!pack) {
            return res.status(404).json({ message: "Balíček nebyl nalezen." });
        }

        if (pack.type !== "notifications") {
            return res.status(400).json({ message: "Tento balíček nepodporuje notifikace." });
        }

        const trip = await Trip.findOne({ _id: pack.tripId, userId });
        if (!trip) {
            return res.status(404).json({ message: "Výlet nebyl nalezen." });
        }

        if (trip.cityLat == null || trip.cityLng == null) {
            return res.status(400).json({ message: "Výlet nemá souřadnice pro notifikace." });
        }

        const weather = await fetchWeather(trip.cityLat, trip.cityLng);
        const alerts = buildWeatherAlerts(weather, pack.meta?.thresholds || {});

        const updatedPack = await Package.findOneAndUpdate(
            { _id: pack._id, userId },
            {
                $set: {
                    notifications: alerts
                }
            },
            {
                returnDocument: "after"
            }
        );

        await createWeatherBellNotifications(userId, trip, alerts);

        return res.json(updatedPack.notifications || []);
    } catch (err) {
        console.error("Generate alerts error:", err);
        return res.status(500).json({ message: "Chyba při generování notifikací." });
    }
};

exports.updatePackage = async (req, res) => {
    try {
        const userId = req.user._id;
        const { title, visibility, contacts, packingItems, notifications, meta } = req.body;

        const pack = await Package.findOne({ _id: req.params.id, userId });
        if (!pack) {
            return res.status(404).json({ message: "Balíček nebyl nalezen." });
        }

        if (typeof title === "string") pack.title = title.trim();
        if (visibility === "private" || visibility === "shared") pack.visibility = visibility;
        if (Array.isArray(contacts)) pack.contacts = contacts;
        if (Array.isArray(packingItems)) pack.packingItems = packingItems;
        if (Array.isArray(notifications)) pack.notifications = notifications;
        if (meta && typeof meta === "object") pack.meta = meta;

        await pack.save();
        return res.json(pack);
    } catch (err) {
        console.error("Update package error:", err);
        return res.status(500).json({ message: "Chyba při úpravě balíčku." });
    }
};

exports.deletePackage = async (req, res) => {
    try {
        const userId = req.user._id;

        const deleted = await Package.findOneAndDelete({
            _id: req.params.id,
            userId
        });

        if (!deleted) {
            return res.status(404).json({ message: "Balíček nebyl nalezen." });
        }

        return res.json({ message: "Balíček byl smazán." });
    } catch (err) {
        console.error("Delete package error:", err);
        return res.status(500).json({ message: "Chyba při mazání balíčku." });
    }
};

exports.markNotificationAsRead = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id, notificationId } = req.params;

        const pack = await Package.findOne({ _id: id, userId });
        if (!pack) {
            return res.status(404).json({ message: "Balíček nebyl nalezen." });
        }

        const notification = pack.notifications.id(notificationId);
        if (!notification) {
            return res.status(404).json({ message: "Notifikace nebyla nalezena." });
        }

        notification.isRead = true;
        await pack.save();

        return res.json({ message: "Notifikace byla označena jako přečtená." });
    } catch (err) {
        console.error("Mark notification as read error:", err);
        return res.status(500).json({ message: "Chyba při úpravě notifikace." });
    }
};

exports.createPackagesForTrip = createPackagesForTrip;