const mongoose = require("mongoose")

const subscriptionSchema = new mongoose.Schema({
    userId: {
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
    },
    stripeCustomerId:String,
    stripeSubscriptionId:String,
    plan:{
        type:String,
        enum:['free','pro'],
        default:'free'
    },
    status:{
        type:String,
        default:"active"
    }
},{timestamps:true})

module.exports = mongoose.models('Subscription',subscriptionSchema)