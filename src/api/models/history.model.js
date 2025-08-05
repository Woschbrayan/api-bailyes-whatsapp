const mongoose = require('mongoose')

const historySchema = new mongoose.Schema({
    key: {
        type: String,
        required: [true, 'key is missing'],
        unique: true,
    },
    labels: [{
        wid: {
            type: Number,
            required: [true, 'Label id is missing'],
        },
        name: {
            type: String,
            required: [true, 'Label Name is missing'],
        },
        associations: []
    }],
    labelAssociations: [{
        jid: {
            type: String,
            required: [true, 'Label jid is missing'],
        },
        labelId: {
            type: Number,
            required: [true, 'Label id is missing'],
        }
    }],
})

const History = mongoose.model('History', historySchema)

module.exports = History
