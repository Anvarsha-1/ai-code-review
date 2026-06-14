require('dotenv').config()
const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const { GoogleGenerativeAI } = require('@google/generative-ai')
const authenticate = require('../middleware/authenticate')
const { reviewLimiter } = require('../middleware/rateLimiter')
const Review = require('../models/Review')
const User = require('../models/User')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// NON-streaming model config — more reliable for JSON
const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1
    }
})

const PLAN_LIMITS = { free: 5, pro: Infinity }

function hashCode(code) {
    return crypto.createHash('sha256').update(code).digest('hex')
}

function buildPrompt(code, language) {
    return `You are a code review API. Respond with ONLY a JSON object, nothing else.

Return exactly this structure:
{"bugs":[{"line":1,"severity":"high","message":"explanation"}],"smells":[{"line":null,"severity":"low","message":"explanation"}],"suggestions":[{"line":null,"severity":"low","message":"explanation"}],"score":7,"summary":"one sentence assessment"}

Rules:
- bugs: actual errors that will break the code
- smells: bad practices that won't crash but are problematic  
- suggestions: improvements and optimisations
- score: integer 0-10
- line: line number or null if not specific to a line
- Return empty arrays [] if nothing found in that category

Review this ${language} code:
${code}`
}

router.post('/stream', authenticate, reviewLimiter, async (req, res) => {
    const { code, language = 'javascript' } = req.body
    const user = req.user

    // 1. validate
    if (!code || code.trim().length === 0) {
        return res.status(400).json({ error: 'No code provided' })
    }
    if (code.length > 40000) {
        return res.status(400).json({ error: 'Code too long. Max 40,000 characters.' })
    }

    // 2. check usage limit
    const limit = PLAN_LIMITS[user.plan] || 5
    if (user.usageCount >= limit) {
        return res.status(429).json({
            error: `Monthly limit reached (${limit} reviews). Upgrade to Pro.`
        })
    }

    // 3. check cache
    const codeHash = hashCode(code)
    try {
        const cached = await Review.findOne({ userId: user._id, codeHash })
        if (cached) {
            console.log('Cache hit — returning saved review')

            // guard against bad cached data
            if (!cached.feedback || Object.keys(cached.feedback).length === 0) {
                console.log('Bad cache — deleting and proceeding fresh')
                await Review.deleteOne({ _id: cached._id })
                // fall through to Gemini call below
            } else {
                res.setHeader('Content-Type', 'text/event-stream')
                res.setHeader('Cache-Control', 'no-cache')
                res.setHeader('Connection', 'keep-alive')
                const json = JSON.stringify(cached.feedback)
                console.log('Sending cached:', json)
                res.write(`data: ${json}\n\n`)
                res.write(`data: [DONE]\n\n`)
                return res.end()
            }
        }
    } catch (err) {
        console.error('Cache check failed:', err.message)
    }

    // 4. SSE headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    try {
        console.log('Calling Gemini API...')

        // 5. use generateContent (non-streaming) for reliable JSON
        const result = await model.generateContent(buildPrompt(code, language))
        const response = await result.response
        const fullText = response.text()

        console.log('=== GEMINI RAW OUTPUT ===')
        console.log(fullText)

        // 6. clean
        const cleaned = fullText
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .replace(/^\s*[^{]*/, '')  // strip anything before {
            .replace(/[^}]*\s*$/, '')  // strip anything after }
            .trim()

        console.log('=== CLEANED ===')
        console.log(cleaned)

        // 7. parse
        let parsed
        try {
            parsed = JSON.parse(cleaned)
        } catch (parseErr) {
            console.error('JSON parse failed:', parseErr.message)
            console.error('Cleaned text was:', cleaned)
            res.write(`data: [ERROR] AI returned invalid JSON\n\n`)
            return res.end()
        }

        // 8. send as single SSE event (simulated stream)
        // send JSON in small chunks for the streaming effect
        // 8. send as ONE single SSE event — no chunking
        const jsonStr = JSON.stringify(parsed)
        res.write(`data: ${jsonStr}\n\n`)

        

        // 9. save to DB
        try {
            await Review.create({
                userId: user._id,
                code,
                language,
                codeHash,
                feedback: parsed,
                tokensUsed: response.usageMetadata?.totalTokenCount || 0
            })
            await User.findByIdAndUpdate(user._id, { $inc: { usageCount: 1 } })
            console.log('Review saved to DB')
        } catch (dbErr) {
            console.error('DB save failed:', dbErr.message)
            // don't fail the request — user still gets their review
        }

        res.write(`data: [DONE]\n\n`)
        res.end()

    } catch (err) {
        console.error('Gemini API error:', err.message)
        res.write(`data: [ERROR] ${err.message}\n\n`)
        res.end()
    }
})
// logout 
const handleLogout = async () => {
    await fetch(`${API}/api/auth/logout`, { method: 'POST', credentials: 'include' })
    window.location.href = '/'
}

// test route — no auth required
router.post('/test', (req, res) => {
    res.json({ message: 'review route reached', time: new Date().toISOString() })
})

// history
router.get('/history', authenticate, async (req, res) => {
    try {
        const reviews = await Review.find({ userId: req.user._id })
            .select('language feedback.score createdAt')
            .sort({ createdAt: -1 })
            .limit(20)
        res.json({ reviews })
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch history' })
    }
})

module.exports = router