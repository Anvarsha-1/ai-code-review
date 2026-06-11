const mongoose = require("mongoose")


const UserScheme = new mongoose.Schema({
    githubId:{
        type:String,
        unique:true,
        sparse:true
    },
    email:{
        type:String,
        unique:true,
        sparse:true,
    },
    username:{
        type:String
    }
})