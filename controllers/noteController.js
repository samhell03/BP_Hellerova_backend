const mongoose = require("mongoose");
const Note = require("../models/Note");
const Trip = require("../models/Trip");

const ALLOWED_LABEL_COLORS = ["default", "blue", "green", "yellow", "red", "purple"];

function normalizeChecklistItems(items) {
    if (!Array.isArray(items)) return [];

    return items
        .filter((item) => item && typeof item.text === "string" && item.text.trim())
        .map((item) => ({
            text: item.text.trim(),
            checked: Boolean(item.checked)
        }));
}

async function ensureTripOwnership(tripId, userId) {
    if (!mongoose.Types.ObjectId.isValid(tripId)) {
        return null;
    }

    const trip = await Trip.findOne({ _id: tripId, userId });
    return trip;
}

// GET /api/notes/trip/:tripId
exports.getNotesByTrip = async (req, res) => {
    try {
        const userId = req.user._id;
        const { tripId } = req.params;

        const trip = await ensureTripOwnership(tripId, userId);

        if (!trip) {
            return res.status(404).json({ message: "Výlet nebyl nalezen." });
        }

        const notes = await Note.find({ userId, tripId }).sort({
            isPinned: -1,
            updatedAt: -1
        });

        return res.json(notes);
    } catch (err) {
        console.error("Get notes by trip error:", err);
        return res.status(500).json({
            message: "Chyba serveru při načítání poznámek."
        });
    }
};

// POST /api/notes/trip/:tripId
exports.createNote = async (req, res) => {
    try {
        const userId = req.user._id;
        const { tripId } = req.params;
        const {
            title,
            content = "",
            labelColor = "default",
            isPinned = false,
            checklistItems = []
        } = req.body;

        const trip = await ensureTripOwnership(tripId, userId);

        if (!trip) {
            return res.status(404).json({ message: "Výlet nebyl nalezen." });
        }

        if (!title || !title.trim()) {
            return res.status(400).json({ message: "Nadpis poznámky je povinný." });
        }

        if (title.trim().length > 120) {
            return res.status(400).json({ message: "Nadpis může mít maximálně 120 znaků." });
        }

        if (typeof content !== "string") {
            return res.status(400).json({ message: "Obsah poznámky musí být text." });
        }

        if (content.length > 5000) {
            return res.status(400).json({ message: "Obsah poznámky může mít maximálně 5000 znaků." });
        }

        if (!ALLOWED_LABEL_COLORS.includes(labelColor)) {
            return res.status(400).json({ message: "Neplatná barva štítku." });
        }

        const normalizedChecklistItems = normalizeChecklistItems(checklistItems);

        const created = await Note.create({
            userId,
            tripId,
            title: title.trim(),
            content: content.trim(),
            labelColor,
            isPinned: Boolean(isPinned),
            checklistItems: normalizedChecklistItems
        });

        return res.status(201).json(created);
    } catch (err) {
        if (err.name === "ValidationError") {
            const firstError = Object.values(err.errors)[0];
            return res.status(400).json({
                message: firstError?.message || "Neplatná data poznámky."
            });
        }

        console.error("Create note error:", err);
        return res.status(500).json({
            message: "Chyba serveru při vytváření poznámky."
        });
    }
};

// PUT /api/notes/:id
exports.updateNote = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;
        const {
            title,
            content,
            labelColor,
            isPinned,
            checklistItems
        } = req.body;

        const note = await Note.findOne({ _id: id, userId });

        if (!note) {
            return res.status(404).json({ message: "Poznámka nebyla nalezena." });
        }

        if (title !== undefined) {
            if (typeof title !== "string" || !title.trim()) {
                return res.status(400).json({ message: "Nadpis poznámky je povinný." });
            }

            if (title.trim().length > 120) {
                return res.status(400).json({ message: "Nadpis může mít maximálně 120 znaků." });
            }

            note.title = title.trim();
        }

        if (content !== undefined) {
            if (typeof content !== "string") {
                return res.status(400).json({ message: "Obsah poznámky musí být text." });
            }

            if (content.length > 5000) {
                return res.status(400).json({ message: "Obsah poznámky může mít maximálně 5000 znaků." });
            }

            note.content = content.trim();
        }

        if (labelColor !== undefined) {
            if (!ALLOWED_LABEL_COLORS.includes(labelColor)) {
                return res.status(400).json({ message: "Neplatná barva štítku." });
            }

            note.labelColor = labelColor;
        }

        if (isPinned !== undefined) {
            note.isPinned = Boolean(isPinned);
        }

        if (checklistItems !== undefined) {
            note.checklistItems = normalizeChecklistItems(checklistItems);
        }

        await note.save();

        return res.json(note);
    } catch (err) {
        if (err.name === "ValidationError") {
            const firstError = Object.values(err.errors)[0];
            return res.status(400).json({
                message: firstError?.message || "Neplatná data poznámky."
            });
        }

        console.error("Update note error:", err);
        return res.status(500).json({
            message: "Chyba serveru při úpravě poznámky."
        });
    }
};

// DELETE /api/notes/:id
exports.deleteNote = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const deleted = await Note.findOneAndDelete({ _id: id, userId });

        if (!deleted) {
            return res.status(404).json({ message: "Poznámka nebyla nalezena." });
        }

        return res.json({ message: "Poznámka byla smazána." });
    } catch (err) {
        console.error("Delete note error:", err);
        return res.status(500).json({
            message: "Chyba serveru při mazání poznámky."
        });
    }
};

// PUT /api/notes/:id/checklist/:itemId/toggle
exports.toggleChecklistItem = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id, itemId } = req.params;

        const note = await Note.findOne({ _id: id, userId });

        if (!note) {
            return res.status(404).json({ message: "Poznámka nebyla nalezena." });
        }

        const item = note.checklistItems.id(itemId);

        if (!item) {
            return res.status(404).json({ message: "Položka checklistu nebyla nalezena." });
        }

        item.checked = !item.checked;
        await note.save();

        return res.json(note);
    } catch (err) {
        console.error("Toggle checklist item error:", err);
        return res.status(500).json({
            message: "Chyba serveru při přepínání checklist položky."
        });
    }
};