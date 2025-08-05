const { WhatsAppInstance } = require('../class/instance')
const fs = require('fs')
const path = require('path')
const config = require('../../config/config')
const { Session } = require('../class/session')
const sleep = require('../helper/sleep')

exports.init = async (req, res) => {
    const sessionName = req.body.name
    const webhook = !req.body.webhook ? false : req.body.webhook
    const webhookUrl = !req.body.webhookUrl ? null : req.body.webhookUrl
    const appUrl = config.appUrl || req.protocol + '://' + req.headers.host

    const instance = new WhatsAppInstance(sessionName, webhook, webhookUrl, sessionName)
    const data = await instance.init()
    WhatsAppInstances[sessionName] = instance

    res.json({
        error: false,
        message: 'Initializing successfully',
        key: data.key,
        sessionName: sessionName,
        webhook: {
            enabled: webhook,
            webhookUrl: webhookUrl,
        },
        qrcode: {
            url: appUrl + '/instance/connect/' + sessionName,
        },
        browser: config.browser,
    })
}

exports.qr = async (req, res) => {
    try {
        const sessionName = req.params.name;
        const sessionInfo = await WhatsAppInstances[sessionName]?.getInstanceDetail(sessionName)
        if (!sessionInfo) {
            const instance = new WhatsAppInstance(sessionName, true, config.webhookUrl, sessionName)
            await instance.init()
            WhatsAppInstances[sessionName] = instance
            await sleep(3000);
        }

        const qrcode = await WhatsAppInstances[sessionName]?.instance.qr
        if (!qrcode) {
            return res.status(404).json({
                error: true,
                message: 'QR code not available',
            })
        }
        res.json({
            error: false,
            message: 'QR Base64 fetched successfully',
            qrcode: qrcode,
        })
    } catch {
        res.json({
            error: true,
            qrcode: '',
        })
    }
}

exports.requestCode = async (req, res) => {
    const sessionName = req.params.name;
    const phoneNumber = req.body.phoneNumber;

    try {
        const code = await WhatsAppInstances[sessionName].instance?.sock?.requestPairingCode(WhatsAppInstances[sessionName]?.getWhatsAppId(phoneNumber), '')

        res.json({
            error: false,
            message: 'Request code sent successfully',
            code: code,
        });
    } catch (error) {
        res.status(500).json({
            error: true,
            message: 'Failed to request code',
            details: error.message,
        });
    }
}

exports.info = async (req, res) => {
    const sessionName = req.params.name;
    const instance = WhatsAppInstances[sessionName]
    let data
    try {
        data = await instance.getInstanceDetail(sessionName)
    } catch (error) {
        data = {}
    }
    return res.json({
        error: false,
        message: 'Instance fetched successfully',
        instance_data: data,
    })
}

exports.profile = async (req, res) => {
    const sessionName = req.params.name;
    const instance = WhatsAppInstances[sessionName]
    let dataFinal = {}
    try {
        const data = await instance.getInstanceDetail(sessionName)
        if (!data || !data.user) {
            return res.status(404).json({
                error: true,
                message: 'User not found',
            });
        }
        const number = data?.user?.id ? data?.user?.id.split(':')[0] : null
        dataFinal.id = number;
        dataFinal.name = data?.user?.name || '';
        dataFinal.picture = await instance.instance?.sock?.profilePictureUrl(number + '@s.whatsapp.net')
    } catch (error) {
        dataFinal = {}
    }
    return res.json({
        error: false,
        message: 'Instance fetched successfully',
        data: dataFinal,
    })
}

exports.restore = async (req, res, next) => {
    try {
        const session = new Session()
        let restoredSessions = await session.restoreSessions()
        return res.json({
            error: false,
            message: 'All instances restored',
            data: restoredSessions,
        })
    } catch (error) {
        next(error)
    }
}

exports.logout = async (req, res) => {
    let errormsg
    try {
        const sessionName = req.params.name;
        await WhatsAppInstances[sessionName].instance?.sock?.logout()
    } catch (error) {
        errormsg = error
    }
    return res.json({
        error: false,
        message: 'logout successfull',
        errormsg: errormsg ? errormsg : null,
    })
}

exports.delete = async (req, res) => {
    let errormsg
    try {
        const sessionName = req.params.name;
        delete WhatsAppInstances[sessionName]
        await WhatsAppInstances[sessionName].deleteInstance(sessionName)

        const db = mongoClient.db('whatsapp-api')
        db.dropCollection(sessionName, function (err, result) {
            console.log('Collection ' + sessionName + ' has been deleted!');
        });
    } catch (error) {
        errormsg = error
    }
    return res.json({
        error: false,
        message: 'Instance deleted successfully',
        data: errormsg ? errormsg : null,
    })
}

exports.list = async (req, res) => {
    if (req.query.active) {
        let instance = []
        const db = mongoClient.db('whatsapp-api')
        const result = await db.listCollections().toArray()
        result.forEach((collection) => {
            instance.push(collection.name)
        })

        return res.json({
            error: false,
            message: 'All active instance',
            data: instance,
        })
    }

    let instance = Object.keys(WhatsAppInstances).map(async (key) =>
        WhatsAppInstances[key].getInstanceDetail(key)
    )
    let data = await Promise.all(instance)

    return res.json({
        error: false,
        message: 'All instance listed',
        data: data,
    })
}
