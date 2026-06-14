const cron = require('node-cron')
const User = require('../models/User')

const startResetJob = () => {
    cron.schedule('0 0 1 * *', async () => {
        try {
            const result = await User.updateMany(
                {},
                { $set: { usageCount: 0, usageResetAt: new Date() } }
            )
            console.log(`Usage reset: ${result.modifiedCount} users reset`)
        } catch (err) {
            console.error('Usage reset failed:', err.message)
        }
    })
    console.log('Monthly usage reset cron scheduled')
}

module.exports = startResetJob