const generateToken = require("../config/generateToken");
const bcrypt = require("bcrypt");
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

exports.getProvider = async (req, res) => {};
exports.updateProvider = async (req, res) => {};

//related to booking
exports.getAllBookings = async (req, res) => {};

//Related to mandap   --tanay
exports.createMandap = async (req, res) => {};
exports.getAllMandapByProviderID = async (req, res) => {};
exports.updateMandap = async (req, res) => {};
exports.deleteMandap = async (req, res) => {};
exports.searchProviderMandap = async (req, res) => {};

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
