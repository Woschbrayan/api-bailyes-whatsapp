const Chat = require('../models/chat.model');
const History = require('../models/history.model')

const labelAssocDocumentHelper = {
    async addLabelAssociation(key, chatId, labelId) {
        await History.updateOne(
            { key: key },
            { '$addToSet': { labelAssociations: { jid: chatId, labelId: labelId } } }
        ).exec()
    },

    async deleteLabelAssociation(key, chatId, labelId) {
        await History.findOneAndUpdate(
            { key: key },
            { $pull: { labelAssociations: { jid: chatId, labelId: labelId } } },
            { safe: true, multi: false }
        );
    },

    async getLabelsAssociationByLabelId(key, labelId) {
        const data = await History.findOne({ key: key, 'labelAssociations.labelId': labelId }).exec();
        let associations = [];
        const chatDoc = await Chat.findOne({ key: key }).exec();

        if (data && data.labelAssociations) {
            for (let association of data.labelAssociations) {
                if (parseInt(association.labelId) === parseInt(labelId)) {
                    let chatInfo = null;
                    if (chatDoc && Array.isArray(chatDoc.chat)) {
                        chatInfo = chatDoc.chat.find(c => c.jid === association.jid);
                    }
                    const assocData = association._doc ? { ...association._doc } : { ...association };
                    assocData.name = chatInfo && chatInfo.name ? chatInfo.name : '';
                    associations.push(assocData);
                }
            }
        }

        return associations;
    }
}

module.exports = labelAssocDocumentHelper;