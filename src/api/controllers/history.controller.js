exports.fetch = async (req, res) => {
    const sessionName = req.params.name
    const data = await WhatsAppInstances[sessionName].fetchHistory(
        sessionName
    )

    return res.status(201).json({ error: false, data: data })
}

exports.fetchMessages = async (req, res) => {
    const sessionName = req.params.name
    const number = req.params.number

    const data = await WhatsAppInstances[sessionName].fetchMessages(
        sessionName,
        number,
        req.query.limit || 1000,
        req.query.fromMe
    )

    return res.status(201).json({ error: false, data: data })
}