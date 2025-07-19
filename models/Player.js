// models/Player.js
const mongoose = require("mongoose");

const PlayerSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  wins: { type: Number, default: 0 },
});

module.exports = mongoose.models.Player || mongoose.model("Player", PlayerSchema);
