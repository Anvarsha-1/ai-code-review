const mongoose = require("mongoose")

const reviewSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    code: {
        type: String,
        required: true
    },
    language: String,
    codeHash: String,
    feedBack: {
        bugs: Array,
        smells: Array,
        suggestions: Array,
        score: Number,
        summary: String,
    },
    tokensUsed: Number
}, { timestamps: true })


module.exports = mongoose.model("Review", reviewSchema)