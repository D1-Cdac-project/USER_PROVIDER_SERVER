const express = require("express");
const router = express.Router();

const {isProvider} = require('../middlewares/verifyProvider')
const {registerProvider, loginProvider, logoutProvider, getProvider, updateProvider} = require('../controllers/providerControllers')

const { createMandap } = require("../controllers/providerControllers");


router.post('/register', registerProvider)
router.post('/login', loginProvider)
router.post('/logout', logoutProvider)
router.get('/me',isProvider, getProvider)
router.put('/update', isProvider, updateProvider)

router.post("/mandap" , createMandap)

module.exports = router