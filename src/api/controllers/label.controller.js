exports.listAll = async (req, res) => {
    const sessionName = req.params.name;
    const data = await WhatsAppInstances[sessionName].getAllLabels(
        sessionName, !!req.query.addAssociation
    )

    return res.status(201).json({ error: false, data: data })
}

exports.listLabelAssociations = async (req, res) => {
    const sessionName = req.params.name;
    const data = await WhatsAppInstances[sessionName].getLabelAssociations(
        sessionName, req.query.id
    )

    return res.status(201).json({ error: false, data: data })
}