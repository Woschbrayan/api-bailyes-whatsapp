const History = require('../models/history.model')
const {addLabel, deleteLabel, editLabel, getLabels, isLabelUpdate} = require('./labelDocument');
const {addLabelAssociation, deleteLabelAssociation, getLabelsAssociationByLabelId} = require('./labelAssociationDocument');
const {perform, getAllChatsByKey, deleteAllChatsByKey, getAllChatsByKeyNumber} = require('./chat');

const historyHelper = {
    async createCollection (key) {
        let alreadyThere = await History.findOne({
            key: key,
        }).exec()

        if (!alreadyThere) {
            const HistChat = new History({ key: key })
            alreadyThere = await HistChat.save()
        }

        return alreadyThere;
    },

    async deleteCollection(key){
        await History.findOneAndDelete({key: key})
        await deleteAllChatsByKey(key)
    },

    async getLabels(key, addAssociation) {
        return await getLabels(key, addAssociation);
    },

    async getLabelsAssociationByLabelId(key, labelId) {
        return await getLabelsAssociationByLabelId(key, labelId)
    },

    async modifyLabel(key, data)
    {
        if (!data.id) {
            return;
        }

        if (data.deleted === false) {
            if (await isLabelUpdate(key, data.id)) {
                await editLabel(key, data);
                return;
            }

            await addLabel(key, data);
            return;
        }

        await deleteLabel(key, data)

        return false
    },

    async modifyLabelAssociation(key, data)
    {
        if (!data.type) {
            return;
        }

        if (data.type === 'add') {
           return await  addLabelAssociation(key, data.association.chatId, data.association.labelId);
        }

        return await  deleteLabelAssociation(key, data.association.chatId, data.association.labelId);
    },

    async addChat(key, json)
    {
        await perform(key, json.messages, json.chats)
        /*
        for (let chat of json) {
            await perform(key, chat.messages)
        }*/
    },

    async getAllChats(key)
    {
        return await getAllChatsByKey(key)
    },

    async getAllChatsByKeyNumberFn(key, number, limit = 1000, fromMe = 'all') {
        return await getAllChatsByKeyNumber(key, number, limit, fromMe);
    },
}

module.exports = historyHelper;
