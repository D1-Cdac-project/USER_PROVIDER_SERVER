const providerModel = require('../models/providerModel')
const generateToken = require('../config/generateToken')
const bcrypt = require('bcrypt')

exports.registerProvider = async (req, res) =>{
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

exports.loginProvider = async (req, res)=>{
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
