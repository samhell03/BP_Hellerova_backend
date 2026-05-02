const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const {
    getNotesByTrip,
    createNote,
    updateNote,
    deleteNote,
} = require("../controllers/noteController");

// načtení poznámek pro konkrétní výlet
router.get("/trip/:tripId", auth, getNotesByTrip);

// vytvoření nové poznámky k výletu
router.post("/trip/:tripId", auth, createNote);

// úprava poznámky
router.put("/:id", auth, updateNote);

// smazání poznámky
router.delete("/:id", auth, deleteNote);

module.exports = router;