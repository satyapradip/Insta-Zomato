const mongoose = require('mongoose');

const FoodPartnerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  phone: {  
    type: String,
    required: true,
  },
});


const foodPartnerModel = mongoose.model('FoodPartner', FoodPartnerSchema);
module.exports = foodPartnerModel;