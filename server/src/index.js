require("dotenv").config()
const cookieParser = require('cookie-parser');
const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const connectDB = require("./config/db")
const passport = require('./config/passport')
const startResetJob = require('./jobs/resetUsage')
const { globalLimiter } = require('./middleware/rateLimiter')

const app = express()
connectDB()
startResetJob()

app.use(helmet())
app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true
}))


app.use('/api/billing/webhook', express.raw({ type: 'application/json' }))

app.use(express.json())
app.use(cookieParser())
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} | Origin: ${req.headers.origin} | Cookie: ${req.headers.cookie ? 'present' : 'missing'}`)
    next()
})
app.use(passport.initialize())
app.use(globalLimiter)

app.use("/api/auth", require("./routes/auth"))
app.use("/api/review",require("./routes/review"))
// app.use("/api/billing", require("./routes/billing"))

app.get("/api/health", (req, res) => res.json({ status: "ok" }))

const PORT = process.env.PORT || 5000

app.listen(PORT, () => console.log(`Server is running at ${PORT}`))