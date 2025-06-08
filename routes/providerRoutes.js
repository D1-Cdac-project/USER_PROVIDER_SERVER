const express = require('express')

const {isProvider} = require('../middlewares/verifyProvider')
const {registerProvider, loginProvider, logoutProvider, getProvider} = require('../controllers/providerControllers')

const router = express.Router()

router.post('/register', registerProvider)
router.post('/login', loginProvider)
router.post('/logout', logoutProvider)
router.get('/me',isProvider, getProvider)

module.exports = router