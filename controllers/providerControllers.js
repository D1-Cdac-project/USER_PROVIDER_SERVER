
const mandapModel = require('../models/mandapModel');


//related to provider  -- akshay
exports.registerProvider = async (req, res) => {};
exports.loginProvider = async (req, res) => {};
exports.getProvider = async (req, res) => {};
exports.updateProvider = async (req, res) => {};

//related to booking
exports.getAllBookings = async (req, res) => {};


//Related to mandap
exports.createMandap = async (req, res) => {
    if(!req.provider) {
        return res.status(400).json({ message: "Invalid Request" });
    }
    try{
        const {mandapName,
            availableDates,
            venueType,
            address,
            penaltyChargesPerHour,
            cancellationPolicy,
            venueImages,
            guestCapacity,
            venuePricing,
            securityDeposit,
            securityDepositType,
            amenities,
            outdoorFacilities,
            paymentOptions,
            isExternalCateringAllowed} = req.body;


        const mandap = await mandapModel.create({
            mandapName,
            providerId: req.provider._id,
            availableDates,
            venueType,
            address,
            penaltyChargesPerHour,
            cancellationPolicy,
            venueImages,
            guestCapacity,
            venuePricing,
            securityDeposit,
            securityDepositType,
            amenities,
            outdoorFacilities,
            paymentOptions,
            isExternalCateringAllowed
        });
    }
    catch(error) {
        return res.status(500).json({ message: error.message });
    }
}
getAllMandapByProviderID = async (req, res) => {}
exports.updateMandap = async (req, res) => {}
exports.deleteMandap = async (req, res) => {}
exports.searchProviderMandap = async (req, res) => {}



//room related   --- vaishnavi
exports.addRoom = async (req, res) => {};
exports.updateRoom = async (req, res) => {};
exports.deleteRoom = async (req, res) => {};

//Photographer related   -- tanay
exports.addPhotographer = async (req, res) => {};
exports.updatePhotographer = async (req, res) => {};
exports.deletePhotographer = async (req, res) => {};

//caterer related   --tanay
exports.addCaterer = async (req, res) => {};
exports.updateCaterer = async (req, res) => {};
exports.deleteCaterer = async (req, res) => {};
