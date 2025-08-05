const Chat = require('../models/chat.model')
const Group = require('../models/group.model')

const chatBlackIds = [
    'status@broadcast',
    'g.us',
]

const ChatHelper = {
    async perform(key, messages, chats) {
        const seenGroupJids = new Set();

        for (let messageRow of messages) {
            const m = messageRow;
            if (!m || !m.message || !m.key) continue;

            const jid = m.key.remoteJid;
            if (chatBlackIds.includes(jid)) continue;

            // Previna grupos duplicados
            if (jid.includes('@g.us') && !seenGroupJids.has(jid)) {
                seenGroupJids.add(jid);
                const groupInfo = chats.find(chat => chat.id === jid) ?? {};
                await Group.updateOne(
                    { key: key },
                    { '$addToSet': { chat: { jid, name: groupInfo?.name || '' } } },
                    { upsert: true }
                ).exec();
                continue;
            }

            const chatInfo = chats.find(chat => chat.id === jid) ?? {};
            const date = new Date(m.messageTimestamp.low * 1000);
            const formattedDate = date.toISOString().slice(0, 19).replace('T', ' ');

            const chatData = {
                id: m.key.id,
                jid: jid,
                fromMe: m.key.fromMe,
                conversation: m.message.conversation || '',
                name: chatInfo?.name || '',
                date: formattedDate,
                participant: m.key?.participant || '',
            };

            // Verifica se mensagem já existe antes de adicionar
            const existing = await Chat.findOne({ key: key, 'chat.id': chatData.id }).exec();
            if (!existing) {
                await Chat.updateOne(
                    { key: key },
                    { '$addToSet': { chat: chatData } },
                    { upsert: true }
                ).exec();
            }
        }
    },

    async getAllChatsByKey(key) {
        const data = await Chat.findOne({ key }).exec();
        if (!data || !Array.isArray(data.chat)) return [];

        const seenJids = new Set();
        return data.chat.filter(chat => {
            if (!chat?.jid || chat.jid.includes('@g.us') || seenJids.has(chat.jid)) return false;
            seenJids.add(chat.jid);
            return true;
        });
    },

    async getAllChatsByKeyNumber(key, number, limit = 1000, fromMe = 'all') {
        const data = await Chat.findOne({ key }).exec();
        if (!data || !Array.isArray(data.chat)) return [];

        let filteredChats = data.chat.filter(chat => {
            const matchJid = chat.jid === number || chat.jid.includes(`${number}@s.whatsapp.net`);
            if (!matchJid) return false;

            if (fromMe === 'all') return true;
            const fromMeBool = fromMe === 'true' || fromMe === true;
            return chat.fromMe === fromMeBool;
        });

        return filteredChats.slice(0, limit);
    },

    async deleteAllChatsByKey(key) {
        await Chat.findOneAndDelete({ key }).exec();
        await Group.findOneAndDelete({ key }).exec();
    },
};

module.exports = ChatHelper;
