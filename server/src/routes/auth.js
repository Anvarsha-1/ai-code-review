const express = require('express')
const Router = express.Router()
const jwt = require('jsonwebtoken')
const passport = require("../config/passport")
const authenticate = require('../middleware/authentication')


//redirect user to github
router.get('/github',
    passport.authenticate('github',{scope:['user:email'],session:false})
)

//github redirect back here
router.get('/github/callback',
    passport.authenticate('github',{session:false,failureRedirect:'/login'}),
    (req,res) => {

        //sign a JWT with the user's mongo _id
        const token = jwt.sign(
            {userId:req.user._id},
            process.env.JWT_SECRET,
            {expressIn: '7d'}
        )

        
        res.cookie('token',token,{
            httpOnly: true,  // prevent form XSS attack (Cross-Site Scripting)
            secure:false,  // set true in production (HTTPS)
            sameSite: 'lax', //blocking malicious external sites from hijacking their requests
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in ms
        })

        // redirect to frontend dashboard
        res.redirect(`${process.env.CLIENT_URL}/dashboard`)
    }
)

// get current logged-in user
router.get('/me',authenticate, async (req,res) => {
   res.json( {user:req.user} )
})

// logout
router.post('/logout', (req, res) => {
    res.clearCookie('token')
    res.json({ message: 'Logged out' })
})

module.exports = router

