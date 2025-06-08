const express = require('express')

const {registerProvider, loginProvider, logoutProvider, getProviderDetails} = require('../controllers/providerControllers')

const router = express.Router()

router.post('/register', registerProvider)
router.post('/login', loginProvider)
router.post('/logout', logoutProvider)

module.exports = router