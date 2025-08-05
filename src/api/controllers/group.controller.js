exports.create = async (req, res) => {
    const data = await WhatsAppInstances[req.params.name].createNewGroup(
        req.body.name,
        req.body.users
    )
    return res.status(201).json({ error: false, data: data })
}

exports.addNewParticipant = async (req, res) => {
    const data = await WhatsAppInstances[req.params.name].addNewParticipant(
        req.body.id,
        req.body.users
    )
    return res.status(201).json({ error: false, data: data })
}

exports.makeAdmin = async (req, res) => {
    const data = await WhatsAppInstances[req.params.name].makeAdmin(
        req.body.id,
        req.body.users
    )
    return res.status(201).json({ error: false, data: data })
}

exports.demoteAdmin = async (req, res) => {
    const data = await WhatsAppInstances[req.params.name].demoteAdmin(
        req.body.id,
        req.body.users
    )
    return res.status(201).json({ error: false, data: data })
}

exports.listAll = async (req, res) => {
    const sessionName = req.params.name;
    const data = await WhatsAppInstances[sessionName].getAllGroups(
        sessionName
    )
    return res.status(201).json({ error: false, data: data })
}

exports.leaveGroup = async (req, res) => {
    const data = await WhatsAppInstances[req.params.name].leaveGroup(req.query.id)
    return res.status(201).json({ error: false, data: data })
}

exports.getInviteCodeGroup = async (req, res) => {
    const data = await WhatsAppInstances[req.params.name].getInviteCodeGroup(
        req.query.id
    )
    return res
        .status(201)
        .json({ error: false, link: 'https://chat.whatsapp.com/' + data })
}

exports.getInstanceInviteCodeGroup = async (req, res) => {
    const data = await WhatsAppInstances[
        req.params.name
    ].getInstanceInviteCodeGroup(req.query.id)
    return res
        .status(201)
        .json({ error: false, link: 'https://chat.whatsapp.com/' + data })
}

exports.getGroupParticipants = async (req, res) => {
    const sessionName = req.params.name;
    const id = req.query.id;
    const instance = WhatsAppInstances[sessionName]

    try {
        data = await instance.groupFetchAllParticipating();
    } catch (error) {
        data = {}
    }

    const groupsArray = Array.isArray(data) ? data : Object.values(data);

    return res.json({
        error: false,
        message: 'Instance fetched successfully',
        data: groupsArray.find(group => group.id == id) || {},
    })
}

exports.groupParticipantsUpdate = async (req, res) => {
    const data = await WhatsAppInstances[req.params.name].groupParticipantsUpdate(
        req.body.id,
        req.body.users,
        req.body.action
    )
    return res.status(201).json({ error: false, data: data })
}

exports.groupSettingUpdate = async (req, res) => {
    const data = await WhatsAppInstances[req.params.name].groupSettingUpdate(
        req.body.id,
        req.body.action
    )
    return res.status(201).json({ error: false, data: data })
}

exports.groupUpdateSubject = async (req, res) => {
    const data = await WhatsAppInstances[req.params.name].groupUpdateSubject(
        req.body.id,
        req.body.subject
    )
    return res.status(201).json({ error: false, data: data })
}

exports.groupUpdateDescription = async (req, res) => {
    const data = await WhatsAppInstances[req.params.name].groupUpdateDescription(
        req.body.id,
        req.body.description
    )
    return res.status(201).json({ error: false, data: data })
}

exports.groupInviteInfo = async (req, res) => {
    const data = await WhatsAppInstances[req.params.name].groupGetInviteInfo(
        req.body.code
    )
    return res.status(201).json({ error: false, data: data })
}

exports.groupJoin = async (req, res) => {
    const data = await WhatsAppInstances[req.params.name].groupAcceptInvite(
        req.body.code
    )
    return res.status(201).json({ error: false, data: data })
}
