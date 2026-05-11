const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const {
    getNotesByTrip,
    createNote,
    updateNote,
    deleteNote,
} = require("../controllers/noteController");

router.get("/trip/:tripId", auth, getNotesByTrip);
router.post("/trip/:tripId", auth, createNote);
router.put("/:id", auth, updateNote);
router.delete("/:id", auth, deleteNote);

module.exports = router;