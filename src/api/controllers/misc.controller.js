exports.onWhatsapp = async (req, res) => {
    try {
        // eslint-disable-next-line no-unsafe-optional-chaining
        const sessionName = req.params.name;
        const data = await WhatsAppInstances[sessionName]?.verifyId(
            WhatsAppInstances[sessionName]?.getWhatsAppId(req.query.number)
        )
        return res.status(201).json({ error: false, data: data })
    } catch (error) {
        return res.status(404).json({ error: true, message: 'The number is not registered on WhatsApp.' })
    }
}

exports.downProfile = async (req, res) => {
    try {
        const sessionName = req.params.name;
        const data = await WhatsAppInstances[sessionName]?.DownloadProfile(
            req.query.number
        )
        return res.status(201).json({ error: false, data: data })
    } catch (error) {
        return res.status(404).json({ error: true, message: 'The number is not registered on WhatsApp.' })
    }
}

exports.getStatus = async (req, res) => {
    const data = await WhatsAppInstances[req.query.key]?.getUserStatus(
        req.query.id
    )
    return res.status(201).json({ error: false, data: data })
}

exports.blockUser = async (req, res) => {
    const data = await WhatsAppInstances[req.query.key]?.blockUnblock(
        req.query.id,
        req.query.block_status
    )
    if (req.query.block_status == 'block') {
        return res
            .status(201)
            .json({ error: false, message: 'Contact Blocked' })
    } else
        return res
            .status(201)
            .json({ error: false, message: 'Contact Unblocked' })
}

exports.updateProfilePicture = async (req, res) => {
    const data = await WhatsAppInstances[req.query.key].updateProfilePicture(
        req.body.id,
        req.body.url
    )
    return res.status(201).json({ error: false, data: data })
}

exports.getUserOrGroupById = async (req, res) => {
    const data = await WhatsAppInstances[req.query.key].getUserOrGroupById(
        req.query.id
    )
    return res.status(201).json({ error: false, data: data })
}
