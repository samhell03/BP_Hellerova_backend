const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const packageController = require("../controllers/packageController");

router.post("/import-template", auth, packageController.importTemplateToTrip);
router.get("/trip/:tripId", auth, packageController.getTripPackages);
router.get("/notifications/all", auth, packageController.getAllNotifications);
router.get("/:id/weather", auth, packageController.getPackageWeather);
router.post("/:id/generate-alerts", auth, packageController.generatePackageAlerts);
router.put("/:id", auth, packageController.updatePackage);
router.put("/:id/notifications/:notificationId/read", auth, packageController.markNotificationAsRead);
router.delete("/:id", auth, packageController.deletePackage);

module.exports = router;