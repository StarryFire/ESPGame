const mongoose = require('mongoose');
const path = require('path');

const imageBasePath = 'images';

const imageSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
})

imageSchema.virtual('imagePath').get(function() {
    if(this.name) {
        return path.join('/', imageBasePath, this.name);
    }
})

module.exports = mongoose.model('Image', imageSchema);
module.exports.imageBasePath = imageBasePath;