const mongoose = require("mongoose")


const UserSchema = new mongoose.Schema({
    githubId: {
        type: String,
        unique: true,
        sparse: true
    },
    email: {
        type: String,
        unique: true,
        sparse: true,
    },
    username: String,
    avathar: String,
    plan: {
        type: String,
        enum: ["free", "pro"],
        default: 'free'
    },
    usageCount: {
        type: Number,
        default: 0
    },
    usageResetAt: {
        type: Date,
        default: Date.now()
    }
}, { timestamps: true })

module.exports = mongoose.model("User", UserSchema)