const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
    question: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Question',
    },
    answer: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Image',
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    }
})

module.exports = mongoose.model('Answer', answerSchema);