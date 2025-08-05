exports.Text = async (req, res) => {
    const sessionName = req.params.name;
    const data = await WhatsAppInstances[sessionName].sendTextMessage(
        req.body.number,
        req.body.message,
        req.body.mentions || []
    )
    return res.status(201).json({ error: false, data: data })
}

exports.Image = async (req, res) => {
    const sessionName = req.params.name;
    const data = await WhatsAppInstances[sessionName].sendUrlMediaFile(
        req.body.number,
        req.body.url,
        'image',
        req.body.mimetype,
        req.body.caption,
        req.body.fileName,
        req.body.viewOnce === true || req.body.viewOnce === 'true',
        req.body.mentions || []
    )
    return res.status(201).json({ error: false, data: data })
}

exports.Video = async (req, res) => {
    const sessionName = req.params.name;
    const data = await WhatsAppInstances[sessionName].sendUrlMediaFile(
        req.body.number,
        req.body.url,
        'video',
        req.body.mimetype,
        req.body.caption,
        req.body.fileName,
        req.body.viewOnce === true || req.body.viewOnce === 'true',
        req.body.mentions || []
    )
    return res.status(201).json({ error: false, data: data })
}

exports.Audio = async (req, res) => {
    const sessionName = req.params.name;
    const data = await WhatsAppInstances[sessionName].sendMediaAudio(
        req.body.number,
        req.body.url,
        'audio',
        req.body.mimetype,
        req.body.viewOnce === true || req.body.viewOnce === 'true',
    )
    return res.status(201).json({ error: false, data: data })
}

exports.Document = async (req, res) => {
    const sessionName = req.params.name;
    const data = await WhatsAppInstances[sessionName].sendUrlMediaFile(
        req.body.number,
        req.body.url,
        'document',
        req.body.mimetype,
        req.body.caption,
        req.body.fileName,
        req.body.viewOnce === true || req.body.viewOnce === 'true',
        req.body.mentions || []
    )
    return res.status(201).json({ error: false, data: data })
}

exports.SetStatus = async (req, res) => {
    const sessionName = req.params.name;
    const presenceList = [
        'unavailable',
        'available',
        'composing',
        'recording',
        'paused',
    ]
    if (presenceList.indexOf(req.body.status) === -1) {
        return res.status(400).json({
            error: true,
            message:
                'status parameter must be one of ' + presenceList.join(', '),
        })
    }

    const data = await WhatsAppInstances[sessionName]?.setStatus(
        req.body.status,
        req.body.number,
        req.body.delay
    )
    return res.status(201).json({ error: false, data: data })
}

exports.sendSeen = async (req, res) => {
    const sessionName = req.params.name;
    const data = await WhatsAppInstances[sessionName]?.sendSeen(sessionName, req.body.number)
    return res.status(201).json({ error: false, data: data })
}