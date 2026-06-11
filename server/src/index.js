require("dotenv").config()

const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const connectDB = require("./config/db")

const app = express()
connectDB()

app.use(helmet())
app.use(cors({ origin: 'http://localhost:5173' , credentials:true }))
app.use(express.json())

// app.use("/api/auth",require("./routes/auth"))
// app.use("/api/review",require("./routes/review"))

app.get("/api/health",(req,res)=>res.json({status:"ok"}))

const PORT = process.env.PORT || 5000

app.listen(PORT,()=>console.log(`Server is running at ${PORT}`))