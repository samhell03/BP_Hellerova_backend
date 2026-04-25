const Notification = require("../models/Notification");
const Trip = require("../models/Trip");

function startOfToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}

function endOfToday() {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return today;
}

function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

function isSameDay(a, b) {
    const first = new Date(a);
    const second = new Date(b);

    first.setHours(0, 0, 0, 0);
    second.setHours(0, 0, 0, 0);

    return first.getTime() === second.getTime();
}

async function createNotificationIfMissing(payload) {
    const sourceId =
        payload.sourceId ||
        `${payload.type}-${payload.tripId}-${payload.scheduledFor?.toISOString?.() || ""}`;

    return Notification.findOneAndUpdate(
        {
            userId: payload.userId,
            tripId: payload.tripId,
            type: payload.type,
            sourceId
        },
        {
            $setOnInsert: {
                ...payload,
                sourceId
            }
        },
        {
            upsert: true,
            returnDocument: "after"
        }
    );
}

exports.generateTripReminderNotifications = async (req, res) => {
    try {
        const userId = req.user._id;
        const today = startOfToday();

        const trips = await Trip.find({ userId });

        const created = [];

        for (const trip of trips) {
            const start = new Date(trip.startDate);
            const end = new Date(trip.endDate);

            if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
                continue;
            }

            if (isSameDay(start, addDays(today, 7))) {
                const notification = await createNotificationIfMissing({
                    userId,
                    tripId: trip._id,
                    type: "trip_reminder_7_days",
                    title: "Další dobrodružství na obzoru!",
                    message: `${trip.title} začíná za 7 dní.`,
                    scheduledFor: start
                });

                created.push(notification);
            }

            if (isSameDay(start, addDays(today, 1))) {
                const notification = await createNotificationIfMissing({
                    userId,
                    tripId: trip._id,
                    type: "trip_reminder_1_day",
                    title: "Váš výlet brzy začne!",
                    message: `${trip.title} začíná zítra.`,
                    scheduledFor: start
                });

                created.push(notification);
            }

            if (isSameDay(start, today)) {
                const notification = await createNotificationIfMissing({
                    userId,
                    tripId: trip._id,
                    type: "trip_start_today",
                    title: "Výlet začíná dnes",
                    message: `${trip.title} začíná dnes.`,
                    scheduledFor: start
                });

                created.push(notification);
            }

            if (isSameDay(end, addDays(today, 1))) {
                const notification = await createNotificationIfMissing({
                    userId,
                    tripId: trip._id,
                    type: "trip_ending_1_day",
                    title: "Výlet končí zítra",
                    message: `${trip.title} končí zítra.`,
                    scheduledFor: end
                });

                created.push(notification);
            }

            if (isSameDay(end, today)) {
                const notification = await createNotificationIfMissing({
                    userId,
                    tripId: trip._id,
                    type: "trip_ending_today",
                    title: "Výlet končí dnes",
                    message: `${trip.title} končí dnes.`,
                    scheduledFor: end
                });

                created.push(notification);
            }
        }

        return res.json(created);
    } catch (err) {
        console.error("Generate trip reminder notifications error:", err);
        return res.status(500).json({ message: "Chyba při generování připomínek výletů." });
    }
};

exports.getAllNotifications = async (req, res) => {
    try {
        const userId = req.user._id;

        const ongoingTrips = await Trip.find({
            userId,
            startDate: { $lte: endOfToday() },
            endDate: { $gte: startOfToday() }
        }).select("_id");

        const ongoingTripIds = ongoingTrips.map((trip) => trip._id);

        const notifications = await Notification.find({
            userId,
            isRead: false,
            $or: [
                { type: { $ne: "weather_alert" } },
                {
                    type: "weather_alert",
                    tripId: { $in: ongoingTripIds }
                }
            ]
        }).sort({
            scheduledFor: 1,
            createdAt: -1
        });

        const uniqueMap = new Map();

        for (const notification of notifications) {
            const key = `${notification.type}-${notification.tripId}-${notification.title}-${notification.message}`;

            if (!uniqueMap.has(key)) {
                uniqueMap.set(key, notification);
            }
        }

        return res.json([...uniqueMap.values()]);

        return res.json(notifications);
    } catch (err) {
        console.error("Get notifications error:", err);
        return res.status(500).json({ message: "Chyba při načítání notifikací." });
    }
};

exports.markNotificationAsRead = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const notification = await Notification.findOneAndUpdate(
            { _id: id, userId },
            { $set: { isRead: true } },
            { returnDocument: "after" }
        );

        if (!notification) {
            return res.status(404).json({ message: "Notifikace nebyla nalezena." });
        }

        return res.json(notification);
    } catch (err) {
        console.error("Mark notification as read error:", err);
        return res.status(500).json({ message: "Chyba při označení notifikace." });
    }
};