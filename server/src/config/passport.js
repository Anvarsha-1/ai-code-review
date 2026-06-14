const passport = require("passport")
const GitHubStrategy = require("passport-github2")
const User = require("../models/User")

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: 'http://localhost:5000/api/auth/github/callback'
},

async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ githubId: profile.id })

        if (!user) {
            user = await User.create({
                githubId: profile.id,
                username: profile.username,
                email: profile.email?.[0]?.value || "",
                avathar: profile.photos?.[0]?.value
            })
        }
        
        return done(null,user)
    } catch (error) {
        return done(error,null)
    }
}
))

module.exports = passport
