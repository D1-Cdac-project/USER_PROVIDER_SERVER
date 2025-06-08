const mongoose = require('mongoose')

const catererSchema = new mongoose.Schema({
    mandapId:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'mandaps',
        required: true
    }],
    catererName: {
        type: String,
        required: true
    },
    menuCategory: {
        category:{
            type: String,
            enum: ['Basic', 'Standard', 'Premium', 'Luxury'],
            required: true
        },
        menuItems: [{
            itemName:{
                type: String,
                required: true
            },
            itemPrice: {
                type: Number,
                required: true
            },
        }],
        pricePerPlate: {
            type: Number,
            required: true
        },
        categoryImage:{
            type: String,
        }
    },
    foodType:{
        type: String,
        enum: ['Veg', 'Non-Veg', 'Both', 'Jain'],
        required: true
    },
    isCustomizable: {
        type: Boolean,
        items:[{
            itemName: {
                type: String,
                required: true
            },
            itemPrice: {
                type: Number,
                required: true
            },
        }]
    },
    hasTastingSession:{
        type: Boolean,
    }
},
{timestamps: true}
)
module.exports = mongoose.model('caterers', catererSchema)