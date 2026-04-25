const express = require("express");
const router = express.Router();

const {
    generateTripReminderNotifications,
    getAllNotifications,
    markNotificationAsRead
} = require("../controllers/notificationController");

const authMiddleware = require("../middleware/auth");

// 🔔 vygeneruje připomínky (7 dní, 1 den, dnes, konec…)
router.post("/generate-trip-reminders", authMiddleware, generateTripReminderNotifications);

// 🔔 všechny notifikace (zvonček)
router.get("/", authMiddleware, getAllNotifications);

// 🔔 označení jako přečtené
router.put("/:id/read", authMiddleware, markNotificationAsRead);

module.exports = router;