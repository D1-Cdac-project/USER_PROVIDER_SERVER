
const mandapModel = require('../models/mandapModel');


const generateToken = require("../config/generateToken");
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken')
const providerModel = require("../models/providerModel");

//related to provider  -- akshay
exports.registerProvider = async (req, res) => {
    try{
        const {name, email, password, address, phoneNumber} = req.body
        const providerExists = await providerModel.findOne({email});
        if(providerExists){
            return res.status(400).json({ message : "provider already exists!"})
        }
        const provider = await providerModel.create({
            name,
            email,
            password,
            address,
            phoneNumber
        });
        generateToken(res, 201, provider, false);
    }
    catch(error){
         res.status(500).json({message : error.message})
    }
};

exports.loginProvider = async (req, res) => {
    try{
      const {email, password} = req.body
      const providerExists = await providerModel.findOne({email});
      if(!providerExists){
        return res.status(404).json({message : "Invalid email or password !"});
      }
      const passwordMatch = await bcrypt.compare(password, providerExists.password);
      if(!passwordMatch){
        return res.status(404).json({ message : "invalid email or password"});
      }
        generateToken(res, 200, providerExists, false);
    }
    catch(error){
        return res.status(500).json({ message : error.message});
    }
};

exports.logoutProvider = (req, res) => {
    try{
        res.cookie("providerToken", null, {
            expires : new Date(Date.now()), 
            httpOnly : true
        });
        return res.status(200).json({ message : "Logout successful"});
    }
    catch(error){
        return res.status(500).json({ error : error.message});
    }
};

exports.getProvider = async (req, res) => {
    try{
        if(!req.provider) 
            return res.status(400).json({ message : "Invalid request"});
        const provider = await providerModel.findOne({ _id : req.provider._id});
        if(!provider)
            return res.status(404).json({ message : "User not found"});
        return res.status(200).json({ provider });
    }
    catch(error){
        return res.status(500).json({ error : error.message});
    }
};

exports.updateProvider = async (req, res) => {
  try {
    const { name, email, password, address, phoneNumber } = req.body;
    const update = {};

    if (name) update.name = name;
    if (email) update.email = email;
    if (address) update.address = address;
    if (phoneNumber) {
      if (!/^\d{10}$/.test(phoneNumber)) {
        return res.status(400).json({ message: "Invalid phone number" });
      }
      update.phoneNumber = phoneNumber;
    }
    if (password) {
      update.password = await bcrypt.hash(password, 10);
    }

    // req.provider injected by isProvider middleware
    const providerId = req.provider._id;

    const updatedProvider = await providerModel
      .findByIdAndUpdate(
        providerId,
        { $set: update },
        { new: true, runValidators: true }
      )
      .select("-password");

    if (!updatedProvider) {
      return res.status(404).json({ message: "Provider not found" });
    }

    // Generate new token
    const newToken = jwt.sign(
      { id: updatedProvider._id },
      process.env.SECRET_KEY,
      {
        expiresIn: "5d",
      }
    );

    res.status(200).json({
      message: "Provider profile updated successfully",
      provider: updatedProvider,
      token: newToken,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: "Email already in use" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

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
