const mongoose = require('mongoose')

const groupSchema = new mongoose.Schema({
    key: {
        type: String,
        required: [true, 'key is missing'],
        unique: true,
    },
    chat: {
        type: Array,
    },
})

const Group = mongoose.model('Group', groupSchema)

module.exports = Group
