const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    primaryImage: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Image',
    },
    secondaryImages: {
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Image',
        }],
        required: true,
    },
})

module.exports = mongoose.model('Question', questionSchema);