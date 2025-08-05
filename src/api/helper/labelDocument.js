const History = require('../models/history.model')
const {getLabelsAssociationByLabelId} = require('./labelAssociationDocument');

const labelDocumentHelper = {
    async addLabel(key, data)
    {
        await History.updateOne(
            { key: key},
            {'$addToSet': {labels: {wid: data.id, name: data.name}}}
        ).exec()
    },

    async deleteLabel(key, data) {
        await History.findOneAndUpdate(
            { key: key },
            { $pull: { labels: { wid: data.id } } },
            { safe: true, multi: false }
        );
    },

    async editLabel(key, data) {
        await History.updateOne(
            { key: key, "labels.wid": data.id },
            {'$set': {
                    'labels.$.wid': data.id,
                    'labels.$.name': data.name
                }}
            ).exec()
    },

    async getLabels(key, addAssociation) {
        const history =  await History.findOne({ key: key}).exec();
        if (history && history.labels) {
            let labels= history.labels;
            if (addAssociation) {
                for (let i = 0; i < labels.length; i++) {
                   labels[i]['associations'] = await getLabelsAssociationByLabelId(key, labels[i].wid)
                }
            }
            return labels;
        }

        return [];
    },

    async getLabelById(key, id)
    {
        return await History.findOne({ key: key}, {'labels': {$elemMatch: {wid: id}}}).exec();
    },

    async isLabelUpdate(key, labelId){
        const data = await labelDocumentHelper.getLabelById(key, labelId);
        return (data?.labels && data.labels.length > 0);
    }



}

module.exports = labelDocumentHelper;