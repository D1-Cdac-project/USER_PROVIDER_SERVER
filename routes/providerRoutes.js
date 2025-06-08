const express = require('express')

const {registerProvider, loginProvider, getProviderDetails} = require('../controllers/providerControllers')

const router = express.Router()

router.post('/register', registerProvider)
router.post('/login', loginProvider)

module.exports = router