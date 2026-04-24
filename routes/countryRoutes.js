const express = require("express");
const router = express.Router();

const countryController = require("../controllers/countryController");

router.get("/", countryController.getCountries);
router.get("/cities/search", countryController.searchCity);

module.exports = router;