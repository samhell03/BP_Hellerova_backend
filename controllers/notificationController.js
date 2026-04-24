const express = require("express");
const router = express.Router();

const {
    generateTripReminderNotifications,
    getAllNotifications,
    markNotificationAsRead
} = require("../controllers/notificationController");

const authMiddleware = require("../middleware/auth");

router.post("/generate-trip-reminders", authMiddleware, generateTripReminderNotifications);
router.get("/", authMiddleware, getAllNotifications);
router.put("/:id/read", authMiddleware, markNotificationAsRead);

module.exports = router;