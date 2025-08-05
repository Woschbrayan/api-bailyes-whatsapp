const crypto_2 = require("@whiskeysockets/baileys/lib/Utils/crypto");
const generics_1 = require("@whiskeysockets/baileys/lib/Utils/generics");
const crypto_1 = require("crypto");
const uuid_1 = require("uuid");
const WAProto_1 = require("@whiskeysockets/baileys/WAProto");

const initAuthCreds = () => {
    const identityKey = crypto_2.Curve.generateKeyPair()
    return {
        noiseKey: crypto_2.Curve.generateKeyPair(),
        pairingEphemeralKeyPair: crypto_2.Curve.generateKeyPair(),
        signedIdentityKey: identityKey,
        signedPreKey: (0, crypto_2.signedKeyPair)(identityKey, 1),
        registrationId: (0, generics_1.generateRegistrationId)(),
        advSecretKey: (0, crypto_1.randomBytes)(32).toString('base64'),
        processedHistoryMessages: [],
        nextPreKeyId: 1,
        firstUnuploadedPreKeyId: 1,
        accountSyncCounter: 0,
        accountSettings: {
            unarchiveChats: false
        },
        // mobile creds
        deviceId: Buffer.from((0, uuid_1.v4)().replace(/-/g, ''), 'hex').toString('base64url'),
        phoneId: (0, uuid_1.v4)(),
        identityId: (0, crypto_1.randomBytes)(20),
        registered: false,
        backupToken: (0, crypto_1.randomBytes)(20),
        registration: {},
        pairingCode: undefined,
    }
}

module.exports = useMongoDBAuthState = async (collection) => {
    const writeData = (data, id) => {
        return collection.replaceOne(
            { _id: id },
            JSON.parse(JSON.stringify(data, generics_1.BufferJSON.replacer)),
            { upsert: true }
        )
    }
    const readData = async (id) => {
        try {
            const data = JSON.stringify(await collection.findOne({ _id: id }))
            return JSON.parse(data, generics_1.BufferJSON.reviver)
        } catch (error) {
            return null
        }
    }
    const removeData = async (id) => {
        try {
            await collection.deleteOne({ _id: id })
        } catch (_a) {}
    }
    const creds = (await readData('creds')) || (0, initAuthCreds)()
    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {}
                    await Promise.all(
                        ids.map(async (id) => {
                            let value = await readData(`${type}-${id}`)
                            if (type === 'app-state-sync-key' && value) {
                                value = WAProto_1.proto.Message.AppStateSyncKeyData.fromObject(value);
                            }

                            data[id] = value
                        })
                    )
                    return data
                },
                set: async (data) => {
                    const tasks = []
                    for (const category of Object.keys(data)) {
                        for (const id of Object.keys(data[category])) {
                            const value = data[category][id]
                            const key = `${category}-${id}`
                            tasks.push(
                                value ? writeData(value, key) : removeData(key)
                            )
                        }
                    }
                    await Promise.all(tasks)
                },
            },
        },
        saveCreds: () => {
            return writeData(creds, 'creds')
        },
    }
}
