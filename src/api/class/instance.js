/* eslint-disable no-unsafe-optional-chaining */
const QRCode = require('qrcode')
const pino = require('pino')
const {
    default: makeWASocket,
    DisconnectReason,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys')
const { v4: uuidv4 } = require('uuid')
const path = require('path')
const processButton = require('../helper/processbtn')
const generateVC = require('../helper/genVc')
const Chat = require('../models/chat.model')
const axios = require('axios')
const config = require('../../config/config')
const downloadMessage = require('../helper/downloadMsg')
const logger = require('pino')()
const useMongoDBAuthState = require('../helper/mongoAuthState')

const {
    createCollection: createHistoryCollection,
    deleteCollection: deleteHistoryCollection,
    getLabels,
    getLabelsAssociationByLabelId,
    modifyLabel,
    modifyLabelAssociation,
    addChat,
    getAllChats,
    getAllChatsByKeyNumberFn
} = require('../helper/history')
const Group = require('../models/group.model')

class WhatsAppInstance {
    socketConfig = {
        syncFullHistory: true,
        defaultQueryTimeoutMs: undefined,
        printQRInTerminal: false,
        logger: pino({
            level: config.log.level
        }),
    }
    key = ''
    authState
    allowWebhook = undefined
    webhook = undefined

    instance = {
        key: this.key,
        chats: [],
        qr: '',
        messages: [],
        qrRetry: 0,
        startDate: new Date(),
        customWebhook: '',
    }

    axiosInstance = axios.create({
        baseURL: config.webhookUrl,
    })

    constructor(key, allowWebhook, webhook) {
        this.key = key ? key : uuidv4()
        this.instance.customWebhook = this.webhook ? this.webhook : webhook
        this.allowWebhook = config.webhookEnabled
            ? config.webhookEnabled
            : allowWebhook
        if (this.allowWebhook && this.instance.customWebhook !== null) {
            this.allowWebhook = true
            this.instance.customWebhook = webhook
            this.axiosInstance = axios.create({
                baseURL: webhook,
            })
        }
    }

    async SendWebhook(type, body, key) {
        if (!this.allowWebhook) return
        if (!this.webhook) return

        this.axiosInstance
            .post('', {
                type,
                body,
                instanceKey: key,
            })
            .catch(() => { })
    }

    async init() {
        this.collection = mongoClient.db('whatsapp-api').collection(this.key)
        const { state, saveCreds } = await useMongoDBAuthState(this.collection)
        this.authState = { state: state, saveCreds: saveCreds }
        this.socketConfig.auth = {
            creds: this.authState.state.creds,
            keys: makeCacheableSignalKeyStore(this.authState.state.keys, logger),
        };

        this.socketConfig.browser = Object.values(config.browser)
        const { version } = await fetchLatestBaileysVersion()
        this.instance.sock = makeWASocket({
            ...this.socketConfig,
            version
        })
        this.setHandler()
        return this
    }

    isStartedMoreThan2Hours() {
        if (!this.instance.startDate) return false;
        const now = new Date();
        const diffMs = now - this.instance.startDate;
        const diffHours = diffMs / (1000 * 60 * 60);
        return diffHours > 2;
    }

    setHandler() {
        const sock = this.instance.sock

        sock?.ev.on('labels.association', async (labels) => {
            await modifyLabelAssociation(this.key, labels)
        });

        sock?.ev.on('labels.edit', async (labels) => {
            await modifyLabel(this.key, labels)
        });

        // on credentials update save state
        sock?.ev.on('creds.update', this.authState.saveCreds)

        // on socket closed, opened, connecting
        sock?.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update

            if (connection === 'connecting') return

            if (connection === 'close') {
                // reconnect if not logged out
                if (
                    lastDisconnect?.error?.output?.statusCode !==
                    DisconnectReason.loggedOut
                ) {
                    await this.init()
                } else {
                    await this.collection.drop().then((r) => {
                        logger.info('STATE: Droped collection')
                    });
                    await deleteHistoryCollection(this.key)
                    this.instance.online = false
                }

                if (
                    [
                        'all',
                        'connection',
                        'connection.update',
                        'connection:close',
                    ].some((e) => config.webhookAllowedEvents.includes(e))
                )
                    await this.SendWebhook(
                        'connection',
                        {
                            connection: connection,
                        },
                        this.key
                    )
            } else if (connection === 'open') {
                if (config.mongoose.enabled) {
                    await createHistoryCollection(this.key);
                    let alreadyThere = await Chat.findOne({
                        key: this.key,
                    }).exec()
                    if (!alreadyThere) {
                        const saveChat = new Chat({ key: this.key })
                        await saveChat.save()
                    }
                }
                this.instance.online = true
                if (
                    [
                        'all',
                        'connection',
                        'connection.update',
                        'connection:open',
                    ].some((e) => config.webhookAllowedEvents.includes(e))
                )
                    await this.SendWebhook(
                        'connection',
                        {
                            connection: connection,
                        },
                        this.key
                    )

            }

            if (qr) {
                QRCode.toDataURL(qr).then((url) => {
                    this.instance.qr = url
                    this.instance.qrRetry++

                    if (this.isStartedMoreThan2Hours()) {
                        if (this.instance.qrRetry >= config.instance.maxRetryQr) {
                            // close WebSocket connection
                            this.instance.sock.ws.close()
                            // remove all events
                            this.instance.sock.ev.removeAllListeners()
                            this.instance.qr = ' '
                            logger.info('socket connection terminated')
                        }
                    }
                })
            }
        })

        sock?.ev.on('messaging-history.set', async (json) => {
            await addChat(this.key, json)
        })

        /*
        if(events['messaging-history.set']) {
            const { chats, contacts, messages, isLatest, progress, syncType } = events['messaging-history.set']
            if (syncType === proto.HistorySync.HistorySyncType.ON_DEMAND) {
                console.log('received on-demand history sync, messages=', messages)
            }
            console.log(`recv ${chats.length} chats, ${contacts.length} contacts, ${messages.length} msgs (is latest: ${isLatest}, progress: ${progress}%), type: ${syncType}`)
        }
        */

        // sending presence
        sock?.ev.on('presence.update', async (json) => {
            if (
                ['all', 'presence', 'presence.update'].some((e) =>
                    config.webhookAllowedEvents.includes(e)
                )
            )
                await this.SendWebhook('presence', json, this.key)
        })

        // on receive all chats
        sock?.ev.on('chats.set', async ({ chats }) => {
            this.instance.chats = []
            const recivedChats = chats.map((chat) => {
                return {
                    ...chat,
                    messages: [],
                }
            })
            this.instance.chats.push(...recivedChats)
            await this.updateDb(this.instance.chats)
            await this.updateDbGroupsParticipants()
        })

        // on recive new chat
        sock?.ev.on('chats.upsert', (newChat) => {
            //console.log('chats.upsert')
            //console.log(newChat)
            const chats = newChat.map((chat) => {
                return {
                    ...chat,
                    messages: [],
                }
            })
            this.instance.chats.push(...chats)
        })

        // on chat change
        sock?.ev.on('chats.update', (changedChat) => {
            //console.log('chats.update')
            //console.log(changedChat)
            changedChat.map((chat) => {
                const index = this.instance.chats.findIndex(
                    (pc) => pc.id === chat.id
                )
                const PrevChat = this.instance.chats[index]
                this.instance.chats[index] = {
                    ...PrevChat,
                    ...chat,
                }
            })
        })

        // on chat delete
        sock?.ev.on('chats.delete', (deletedChats) => {
            // console.log('chats.delete')
            // console.log(deletedChats)
            deletedChats.map((chat) => {
                const index = this.instance.chats.findIndex(
                    (c) => c.id === chat
                )
                this.instance.chats.splice(index, 1)
            })
        })

        // on new mssage
        sock?.ev.on('messages.upsert', async (m) => {
            if (m.type === 'prepend')
                this.instance.messages.unshift(...m.messages)
            // if (m.type !== 'notify') return

            if (config.markMessagesRead) {
                const unreadMessages = m.messages.map((msg) => {
                    return {
                        remoteJid: msg.key.remoteJid,
                        id: msg.key.id,
                        participant: msg.key?.participant,
                    }
                })
                await sock.readMessages(unreadMessages)
            }

            this.instance.messages.unshift(...m.messages)

            m.messages.map(async (msg) => {
                if (!msg.message) return

                const messageType = Object.keys(msg.message)[0]
                if (
                    [
                        'protocolMessage',
                        'senderKeyDistributionMessage',
                    ].includes(messageType)
                )
                    return

                const webhookData = {
                    key: this.key,
                    ...msg,
                }

                if (messageType === 'conversation') {
                    webhookData['text'] = m
                }
                if (config.webhookBase64) {
                    switch (messageType) {
                        case 'imageMessage':
                            webhookData['msgContent'] = await downloadMessage(
                                msg.message.imageMessage,
                                'image'
                            )
                            break
                        case 'videoMessage':
                            webhookData['msgContent'] = await downloadMessage(
                                msg.message.videoMessage,
                                'video'
                            )
                            break
                        case 'audioMessage':
                            webhookData['msgContent'] = await downloadMessage(
                                msg.message.audioMessage,
                                'audio'
                            )
                            break
                        default:
                            webhookData['msgContent'] = ''
                            break
                    }
                }

                if (
                    ['all', 'messages', 'messages.upsert'].some((e) =>
                        config.webhookAllowedEvents.includes(e)
                    )
                )
                    await this.SendWebhook(m.type == 'notify' ? 'messages.upsert' : 'messages.send', webhookData, this.key)
            })
        })

        sock?.ev.on('messages.update', async (messages) => {
            if (
                ['all', 'messages', 'messages.upsert'].some((e) =>
                    config.webhookAllowedEvents.includes(e)
                )
            )
                await this.SendWebhook('messages.update', messages, this.key)
        })

        sock?.ws.on('CB:call', async (data) => {
            if (data.content) {
                if (data.content.find((e) => e.tag === 'offer')) {
                    const content = data.content.find((e) => e.tag === 'offer')
                    if (
                        ['all', 'call', 'CB:call', 'call:offer'].some((e) =>
                            config.webhookAllowedEvents.includes(e)
                        )
                    )
                        await this.SendWebhook(
                            'call_offer',
                            {
                                id: content.attrs['call-id'],
                                timestamp: parseInt(data.attrs.t),
                                user: {
                                    id: data.attrs.from,
                                    platform: data.attrs.platform,
                                    platform_version: data.attrs.version,
                                },
                            },
                            this.key
                        )
                } else if (data.content.find((e) => e.tag === 'terminate')) {
                    const content = data.content.find(
                        (e) => e.tag === 'terminate'
                    )

                    if (
                        ['all', 'call', 'call:terminate'].some((e) =>
                            config.webhookAllowedEvents.includes(e)
                        )
                    )
                        await this.SendWebhook(
                            'call_terminate',
                            {
                                id: content.attrs['call-id'],
                                user: {
                                    id: data.attrs.from,
                                },
                                timestamp: parseInt(data.attrs.t),
                                reason: data.content[0].attrs.reason,
                            },
                            this.key
                        )
                }
            }
        })

        sock?.ev.on('groups.upsert', async (newChat) => {
            //console.log('groups.upsert')
            //console.log(newChat)
            this.createGroupByApp(newChat)
            if (
                ['all', 'groups', 'groups.upsert'].some((e) =>
                    config.webhookAllowedEvents.includes(e)
                )
            )
                await this.SendWebhook(
                    'group_created',
                    {
                        data: newChat,
                    },
                    this.key
                )
        })

        sock?.ev.on('groups.update', async (newChat) => {
            //console.log('groups.update')
            //console.log(newChat)
            this.updateGroupSubjectByApp(newChat)
            if (
                ['all', 'groups', 'groups.update'].some((e) =>
                    config.webhookAllowedEvents.includes(e)
                )
            )
                await this.SendWebhook(
                    'group_updated',
                    {
                        data: newChat,
                    },
                    this.key
                )
        })

        sock?.ev.on('group-participants.update', async (newChat) => {
            //console.log('group-participants.update')
            //console.log(newChat)
            this.updateGroupParticipantsByApp(newChat)
            if (
                [
                    'all',
                    'groups',
                    'group_participants',
                    'group-participants.update',
                ].some((e) => config.webhookAllowedEvents.includes(e))
            )
                await this.SendWebhook(
                    'group_participants_updated',
                    {
                        data: newChat,
                    },
                    this.key
                )
        })
    }

    async deleteInstance(key) {
        try {
            await Chat.findOneAndDelete({ key: key });
            await deleteHistoryCollection(key);
        } catch (e) {
            logger.error('Error updating document failed')
        }
    }

    async getInstanceDetail(key) {
        return {
            instance_key: key,
            phone_connected: this.instance?.online,
            webhookUrl: this.instance.customWebhook,
            user: this.instance?.online ? this.instance.sock?.user : {},
        }
    }

    getWhatsAppId(id) {
        if (id.includes('@g.us') || id.includes('@s.whatsapp.net')) {
            return id
        }

        return id.includes('-') ? `${id}@g.us` : `${id}@s.whatsapp.net`
    }

    async verifyId(id) {
        if (id.includes('@g.us')) return id
        const [result] = await this.instance.sock?.onWhatsApp(id)
        if (result?.exists) return result.jid
        throw new Error('no account exists')
    }

    async sendTextMessage(to, message, mentions = []) {
        const number = await this.verifyId(this.getWhatsAppId(to))
        const data = await this.instance.sock?.sendMessage(
            number,
            {
                text: message,
                mentions: mentions ? mentions.map((m) => this.getWhatsAppId(m)) : [],
            }
        )
        return data
    }

    async sendMediaAudio(to, path, type, mimetype, viewOnce = false) {
        const number = await this.verifyId(this.getWhatsAppId(to))
        const data = await this.instance.sock?.sendMessage(
            number,
            {
                [type]: { url: path },
                mimetype: mimetype,
                ptt: true,
                viewOnce: viewOnce,
            }
        )
        return data
    }

    async sendUrlMediaFile(to, url, type, mimeType, caption = '', fileName = '', viewOnce = false, mentions = []) {
        const number = await this.verifyId(this.getWhatsAppId(to))
        const data = await this.instance.sock?.sendMessage(
            number,
            {
                [type]: {
                    url: url,
                },
                caption: caption,
                mimetype: mimeType,
                fileName: fileName,
                viewOnce: viewOnce,
                mentions: mentions ? mentions.map((m) => this.getWhatsAppId(m)) : [],
            }
        )
        return data
    }

    async DownloadProfile(of) {
        await this.verifyId(this.getWhatsAppId(of))
        const ppUrl = await this.instance.sock?.profilePictureUrl(
            this.getWhatsAppId(of),
            'image'
        )
        return ppUrl
    }

    async getUserStatus(of) {
        await this.verifyId(this.getWhatsAppId(of))
        const status = await this.instance.sock?.fetchStatus(
            this.getWhatsAppId(of)
        )
        return status
    }

    async blockUnblock(to, data) {
        await this.verifyId(this.getWhatsAppId(to))
        const status = await this.instance.sock?.updateBlockStatus(
            this.getWhatsAppId(to),
            data
        )
        return status
    }

    async sendButtonMessage(to, data) {
        await this.verifyId(this.getWhatsAppId(to))
        const result = await this.instance.sock?.sendMessage(
            this.getWhatsAppId(to),
            {
                templateButtons: processButton(data.buttons),
                text: data.text ?? '',
                footer: data.footerText ?? '',
                viewOnce: true,
            }
        )
        return result
    }

    async sendContactMessage(to, data) {
        await this.verifyId(this.getWhatsAppId(to))
        const vcard = generateVC(data)
        const result = await this.instance.sock?.sendMessage(
            await this.getWhatsAppId(to),
            {
                contacts: {
                    displayName: data.fullName,
                    contacts: [{ displayName: data.fullName, vcard }],
                },
            }
        )
        return result
    }

    async sendListMessage(to, data) {
        await this.verifyId(this.getWhatsAppId(to))
        const result = await this.instance.sock?.sendMessage(
            this.getWhatsAppId(to),
            {
                text: data.text,
                sections: data.sections,
                buttonText: data.buttonText,
                footer: data.description,
                title: data.title,
                viewOnce: true,
            }
        )
        return result
    }

    async sendMediaButtonMessage(to, data) {
        await this.verifyId(this.getWhatsAppId(to))

        const result = await this.instance.sock?.sendMessage(
            this.getWhatsAppId(to),
            {
                [data.mediaType]: {
                    url: data.image,
                },
                footer: data.footerText ?? '',
                caption: data.text,
                templateButtons: processButton(data.buttons),
                mimetype: data.mimeType,
                viewOnce: true,
            }
        )
        return result
    }

    async setStatus(status, to) {
        await this.verifyId(this.getWhatsAppId(to))
        const result = await this.instance.sock?.sendPresenceUpdate(status, to)
        return result
    }

    // change your display picture or a group's
    async updateProfilePicture(id, url) {
        try {
            const img = await axios.get(url, { responseType: 'arraybuffer' })
            const res = await this.instance.sock?.updateProfilePicture(
                id,
                img.data
            )
            return res
        } catch (e) {
            //console.log(e)
            return {
                error: true,
                message: 'Unable to update profile picture',
            }
        }
    }

    // get user or group object from db by id
    async getUserOrGroupById(id) {
        try {
            let Chats = await this.getChat()
            const group = Chats.find((c) => c.id === this.getWhatsAppId(id))
            if (!group)
                throw new Error(
                    'unable to get group, check if the group exists'
                )
            return group
        } catch (e) {
            logger.error(e)
            logger.error('Error get group failed')
        }
    }

    // Group Methods
    parseParticipants(users) {
        return users.map((users) => this.getWhatsAppId(users))
    }

    async updateDbGroupsParticipants() {
        try {
            let groups = await this.groupFetchAllParticipating()
            let Chats = await this.getChat()
            if (groups && Chats) {
                for (const [key, value] of Object.entries(groups)) {
                    let group = Chats.find((c) => c.id === value.id)
                    if (group) {
                        let participants = []
                        for (const [
                            key_participant,
                            participant,
                        ] of Object.entries(value.participants)) {
                            participants.push(participant)
                        }
                        group.participant = participants
                        if (value.creation) {
                            group.creation = value.creation
                        }
                        if (value.subjectOwner) {
                            group.subjectOwner = value.subjectOwner
                        }
                        Chats.filter((c) => c.id === value.id)[0] = group
                    }
                }
                await this.updateDb(Chats)
            }
        } catch (e) {
            logger.error(e)
            logger.error('Error updating groups failed')
        }
    }

    async createNewGroup(name, users) {
        try {
            const group = await this.instance.sock?.groupCreate(
                name,
                users.map(this.getWhatsAppId)
            )
            return group
        } catch (e) {
            logger.error(e)
            logger.error('Error create new group failed')
        }
    }

    async addNewParticipant(id, users) {
        try {
            const res = await this.instance.sock?.groupAdd(
                this.getWhatsAppId(id),
                this.parseParticipants(users)
            )
            return res
        } catch {
            return {
                error: true,
                message:
                    'Unable to add participant, you must be an admin in this group',
            }
        }
    }

    async makeAdmin(id, users) {
        try {
            const res = await this.instance.sock?.groupMakeAdmin(
                this.getWhatsAppId(id),
                this.parseParticipants(users)
            )
            return res
        } catch {
            return {
                error: true,
                message:
                    'unable to promote some participants, check if you are admin in group or participants exists',
            }
        }
    }

    async demoteAdmin(id, users) {
        try {
            const res = await this.instance.sock?.groupDemoteAdmin(
                this.getWhatsAppId(id),
                this.parseParticipants(users)
            )
            return res
        } catch {
            return {
                error: true,
                message:
                    'unable to demote some participants, check if you are admin in group or participants exists',
            }
        }
    }

    async getAllGroups() {
        let Chats = await this.getChatGroups()
        return Chats.map((data, i) => {
            return {
                index: i,
                name: data.name,
                jid: data.jid,
                participant: data.participant,
                creation: data.creation,
                subjectOwner: data.subjectOwner,
            }
        })
    }

    async leaveGroup(id) {
        try {
            let Chats = await this.getChatGroups()
            const group = Chats.find((c) => c.id === id)
            if (!group) throw new Error('no group exists')
            return await this.instance.sock?.groupLeave(id)
        } catch (e) {
            logger.error(e)
            logger.error('Error leave group failed')
        }
    }

    async getInviteCodeGroup(id) {
        try {
            let Chats = await this.getChatGroups()
            const group = Chats.find((c) => c.id === id)
            if (!group)
                throw new Error(
                    'unable to get invite code, check if the group exists'
                )
            return await this.instance.sock?.groupInviteCode(id)
        } catch (e) {
            logger.error(e)
            logger.error('Error get invite group failed')
        }
    }

    async getInstanceInviteCodeGroup(id) {
        try {
            return await this.instance.sock?.groupInviteCode(id)
        } catch (e) {
            logger.error(e)
            logger.error('Error get invite group failed')
        }
    }

    // get Chat object from db
    async getChat(key = this.key) {
        let dbResult = await Chat.findOne({ key: key }).exec()
        let ChatObj = dbResult.chat
        return ChatObj
    }

    async getChatGroups(key = this.key) {
        let dbResult = await Group.findOne({ key: key }).exec()
        let ChatObj = dbResult?.chat ? dbResult.chat : []
        return ChatObj
    }

    // create new group by application
    async createGroupByApp(newChat) {
        try {
            let Chats = await this.getChatGroups()
            let group = {
                id: newChat[0].id,
                name: newChat[0].subject,
                participant: newChat[0].participants,
                messages: [],
                creation: newChat[0].creation,
                subjectOwner: newChat[0].subjectOwner,
            }
            Chats.push(group)
            await this.updateDb(Chats)
        } catch (e) {
            logger.error(e)
            logger.error('Error updating document failed')
        }
    }

    async updateGroupSubjectByApp(newChat) {
        //console.log(newChat)
        try {
            if (newChat[0] && newChat[0].subject) {
                let Chats = await this.getChatGroups()
                Chats.find((c) => c.id === newChat[0].id).name =
                    newChat[0].subject
                await this.updateDb(Chats)
            }
        } catch (e) {
            logger.error(e)
            logger.error('Error updating document failed')
        }
    }

    async updateGroupParticipantsByApp(newChat) {
        //console.log(newChat)
        try {
            if (newChat && newChat.id) {
                let Chats = await this.getChatGroups()
                let chat = Chats.find((c) => c.id === newChat.id)
                let is_owner = false
                if (chat) {
                    if (chat.participant == undefined) {
                        chat.participant = []
                    }
                    if (chat.participant && newChat.action == 'add') {
                        for (const participant of newChat.participants) {
                            chat.participant.push({
                                id: participant,
                                admin: null,
                            })
                        }
                    }
                    if (chat.participant && newChat.action == 'remove') {
                        for (const participant of newChat.participants) {
                            // remove group if they are owner
                            if (chat.subjectOwner == participant) {
                                is_owner = true
                            }
                            chat.participant = chat.participant.filter(
                                (p) => p.id != participant
                            )
                        }
                    }
                    if (chat.participant && newChat.action == 'demote') {
                        for (const participant of newChat.participants) {
                            if (
                                chat.participant.filter(
                                    (p) => p.id == participant
                                )[0]
                            ) {
                                chat.participant.filter(
                                    (p) => p.id == participant
                                )[0].admin = null
                            }
                        }
                    }
                    if (chat.participant && newChat.action == 'promote') {
                        for (const participant of newChat.participants) {
                            if (
                                chat.participant.filter(
                                    (p) => p.id == participant
                                )[0]
                            ) {
                                chat.participant.filter(
                                    (p) => p.id == participant
                                )[0].admin = 'superadmin'
                            }
                        }
                    }
                    if (is_owner) {
                        Chats = Chats.filter((c) => c.id !== newChat.id)
                    } else {
                        Chats.filter((c) => c.id === newChat.id)[0] = chat
                    }
                    await this.updateDb(Chats)
                }
            }
        } catch (e) {
            logger.error(e)
            logger.error('Error updating document failed')
        }
    }

    async groupFetchAllParticipating() {
        try {
            const result =
                await this.instance.sock?.groupFetchAllParticipating()
            return result
        } catch (e) {
            logger.error('Error group fetch all participating failed')
        }
    }

    // update promote demote remove
    async groupParticipantsUpdate(id, users, action) {
        try {
            const res = await this.instance.sock?.groupParticipantsUpdate(
                this.getWhatsAppId(id),
                this.parseParticipants(users),
                action
            )
            return res
        } catch (e) {
            //console.log(e)
            return {
                error: true,
                message:
                    'unable to ' +
                    action +
                    ' some participants, check if you are admin in group or participants exists',
            }
        }
    }

    // update group settings like
    // only allow admins to send messages
    async groupSettingUpdate(id, action) {
        try {
            const res = await this.instance.sock?.groupSettingUpdate(
                this.getWhatsAppId(id),
                action
            )
            return res
        } catch (e) {
            //console.log(e)
            return {
                error: true,
                message:
                    'unable to ' + action + ' check if you are admin in group',
            }
        }
    }

    async groupUpdateSubject(id, subject) {
        try {
            const res = await this.instance.sock?.groupUpdateSubject(
                this.getWhatsAppId(id),
                subject
            )
            return res
        } catch (e) {
            //console.log(e)
            return {
                error: true,
                message:
                    'unable to update subject check if you are admin in group',
            }
        }
    }

    async getGroupMetadata(id) {
        try {
            const res = await this.instance.sock?.groupMetadata(
                this.getWhatsAppId(id),
            )
            return res
        } catch (e) {
            //console.log(e)
            return {
                error: true,
                message:
                    'unable to get group metadata check if you are admin in group',
            }
        }
    }


    async groupUpdateDescription(id, description) {
        try {
            const res = await this.instance.sock?.groupUpdateDescription(
                this.getWhatsAppId(id),
                description
            )
            return res
        } catch (e) {
            //console.log(e)
            return {
                error: true,
                message:
                    'unable to update description check if you are admin in group',
            }
        }
    }

    async getAllLabels(key, addAssociation) {
        try {
            return await getLabels(key, addAssociation);
        } catch (e) {
            logger.error('Error to get all labels')
        }
    }

    async getLabelAssociations(key, labelId) {
        try {
            if (!labelId) {
                throw new Error('The label id is required');
            }
            return await getLabelsAssociationByLabelId(key, labelId);
        } catch (e) {
            return {
                error: true,
                message: e.message
            }
        }
    }

    // update db document -> chat
    async updateDb(object) {
        try {
            await Chat.updateOne({ key: this.key }, { chat: object })
        } catch (e) {
            logger.error('Error updating document failed')
        }
    }

    async readMessage(msgObj) {
        try {
            const key = {
                remoteJid: msgObj.remoteJid,
                id: msgObj.id,
                participant: msgObj?.participant, // required when reading a msg from group
            }
            const res = await this.instance.sock?.readMessages([key])
            return res
        } catch (e) {
            logger.error('Error read message failed')
        }
    }

    async reactMessage(id, key, emoji) {
        try {
            const reactionMessage = {
                react: {
                    text: emoji, // use an empty string to remove the reaction
                    key: key,
                },
            }
            const res = await this.instance.sock?.sendMessage(
                this.getWhatsAppId(id),
                reactionMessage
            )
            return res
        } catch (e) {
            logger.error('Error react message failed')
        }
    }

    async fetchHistory(instanceKey) {
        return await getAllChats(instanceKey);
    }

    async fetchMessages(instanceKey, chatId, limit, fromMe) {
        return await getAllChatsByKeyNumberFn(instanceKey, chatId, limit, fromMe);
    }

    async sendSeen(instanceKey, number) {
        try {
            const chatId = this.getWhatsAppId(number);
            await this.verifyId(chatId);
            const messages = await getAllChatsByKeyNumberFn(instanceKey, chatId);

            const unreadMessages = messages.map((msg) => {
                return {
                    remoteJid: msg.jid,
                    id: msg.id,
                    participant: msg.participant,
                }
            })

            return await this.instance.sock.readMessages(unreadMessages)
        } catch (e) {
            console.debug(e);
            return {
                error: true,
                message: 'Error sending seen',
            };
        }
    }

    async addHistory(id, url) {
        await createHistoryCollection(this.key);
        let alreadyThere = await Chat.findOne({
            key: this.key,
        }).exec()
        if (!alreadyThere) {
            const saveChat = new Chat({ key: this.key })
            await saveChat.save()
        }

        let chat = {
            chats: [
                {
                    participant: [],
                    id: '5511943912995@s.whatsapp.net',
                    messages: [
                        {
                            message: {
                                key: {
                                    "remoteJid": "5511943912995@s.whatsapp.net",
                                    "fromMe": false,
                                    "id": "3EB0B2D102C3AD64B7193C",
                                    "participant": ""
                                },
                                message: {
                                    conversation: "Mensagem 01"
                                }
                            }
                        },
                        {
                            message: {
                                key: {
                                    "remoteJid": "5511943912995@s.whatsapp.net",
                                    "fromMe": false,
                                    "id": "3EB0B2D102C3AD64B7193C",
                                    "participant": ""
                                },
                                message: {
                                    conversation: "Mensagem 02"
                                }
                            }
                        }
                    ],
                    lastMessageRecvTimestamp: 1743628831
                },
                {
                    participant: [],
                    id: '5511943912995@s.whatsapp.net',
                    messages: [
                        {
                            message: {
                                key: {
                                    "remoteJid": "5511943912995@s.whatsapp.net",
                                    "fromMe": false,
                                    "id": "3EB0B2D102C3AD64B7193C",
                                    "participant": ""
                                },
                                message: {
                                    conversation: "Mensagem 03"
                                }
                            }
                        }
                    ],
                    lastMessageRecvTimestamp: 1743628831
                },
                {
                    participant: [],
                    id: '5511943912996@s.whatsapp.net',
                    messages: [
                        {
                            message: {
                                key: {
                                    "remoteJid": "5511943912995@s.whatsapp.net",
                                    "fromMe": false,
                                    "id": "3EB0B2D102C3AD64B7193C",
                                    "participant": ""
                                },
                                message: {
                                    conversation: "Mensagem de texto vai aqui ..."
                                }
                            }
                        }
                    ],
                    lastMessageRecvTimestamp: 1743628831
                },
                {
                    participant: [],
                    id: 'status@broadcast',
                    messages: [
                        {
                            message: {
                                key: {
                                    "remoteJid": "5511943912995@s.whatsapp.net",
                                    "fromMe": false,
                                    "id": "3EB0B2D102C3AD64B7193C",
                                    "participant": ""
                                },
                                message: {
                                    conversation: "Mensagem de texto vai aqui ..."
                                }
                            }
                        }
                    ],
                    lastMessageRecvTimestamp: 1743628831
                },
            ],
            messages: [
                {
                    key: {
                        "remoteJid": "5511943912995@s.whatsapp.net",
                        "fromMe": false,
                        "id": "3EB0B2D102C3AD64B7193C",
                        "participant": ""
                    },
                    message: {
                        conversation: "Mensagem de texto vai aqui ..."
                    },
                    messageTimestamp: {
                        low: 1743633002
                    }
                }
            ]
        }

        await addChat(this.key, chat)
    }
}

exports.WhatsAppInstance = WhatsAppInstance
