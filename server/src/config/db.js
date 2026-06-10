const mongoose = require("mongoose")

const connectDb = async()=>{
    try{
         await mongoose.connect(process.env.MONOG_URI) 
         console.log("Mongoose connected")  
    }catch(error){
        console.error("Connection DB failed",error.message)
        process.exit(1)
    }
}