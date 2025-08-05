const express = require('express')
const controller = require('../controllers/message.controller')
const keyVerify = require('../middlewares/keyCheck')
const loginVerify = require('../middlewares/loginCheck')
const multer = require('multer')

const router = express.Router()
const storage = multer.memoryStorage()
const upload = multer({ storage: storage, inMemory: true }).single('file')


/**
 * @swagger
 * tags:
 *   name: Mensagens
 *   description: Envio de mensagens no WhatsApp
 */

/**
 * @swagger
 * /message/text/{name}:
 *   post:
 *     summary: Envia mensagem de texto
 *     tags: [Mensagens]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome da sessão/instância
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               number:
 *                 type: string
 *               message:
 *                 type: string
 *               mentions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Lista de números mencionados (opcional)
 *     responses:
 *       200:
 *         description: Mensagem enviada
 */
router.route('/text/:name').post(keyVerify, controller.Text)


/**
 * @swagger
 * /message/image/{name}:
 *   post:
 *     summary: Envia imagem
 *     tags: [Mensagens]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome da sessão/instância
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               number:
 *                 type: string
 *               url:
 *                 type: string
 *                 format: uri
 *               path:
 *                 type: string
 *                 description: MimeType do arquivo
 *               caption:
 *                 type: string
 *               mentions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Lista de números mencionados (opcional)
 *               viewOnce:
 *                 type: boolean
 *                 description: Se true, a mídia será visualizada apenas uma vez
 *     responses:
 *       200:
 *         description: Imagem enviada
 */
router.route('/image/:name').post(keyVerify, upload, controller.Image)

/**
 * @swagger
 * /message/video/{name}:
 *   post:
 *     summary: Envia vídeo
 *     tags: [Mensagens]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome da sessão/instância
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               number:
 *                 type: string
 *               url:
 *                 type: string
 *                 format: uri
 *               caption:
 *                 type: string
 *               mentions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Lista de números mencionados (opcional)
 *               viewOnce:
 *                 type: boolean
 *                 description: Se true, a mídia será visualizada apenas uma vez
 *     responses:
 *       200:
 *         description: Vídeo enviado
 */
router.route('/video/:name').post(keyVerify, upload, controller.Video)

/**
 * @swagger
 * /message/audio/{name}:
 *   post:
 *     summary: Envia áudio
 *     tags: [Mensagens]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome da sessão/instância
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               number:
 *                 type: string
 *               url:
 *                 type: string
 *                 format: uri
 *               path:
 *                 type: string
 *                 description: MimeType do arquivo [Recomendado ser sempre "audio/ogg; codecs=opus"]
 *               viewOnce:
 *                 type: boolean
 *                 description: Se true, o áudio será visualizado apenas uma vez
 *     responses:
 *       200:
 *         description: Áudio enviado
 */
router.route('/audio/:name').post(keyVerify, upload, controller.Audio)

/**
 * @swagger
 * /message/doc/{name}:
 *   post:
 *     summary: Envia documento
 *     tags: [Mensagens]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome da sessão/instância
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               number:
 *                 type: string
 *               url:
 *                 type: string
 *                 format: uri
 *               path:
 *                 type: string
 *                 description: MimeType do arquivo
 *               fileName:
 *                 type: string
 *                 description: Nome do arquivo a ser enviado
 *               caption:
 *                 type: string
 *               mentions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Lista de números mencionados (opcional)
 *               viewOnce:
 *                 type: boolean
 *                 description: Se true, a mídia será visualizada apenas uma vez
 *     responses:
 *       200:
 *         description: Documento enviado
 */
router.route('/doc/:name').post(keyVerify, upload, controller.Document)

/**
 * @swagger
 * /message/set-presence/{name}:
 *   post:
 *     summary: Atualiza o status de presença (online, digitando, etc)
 *     tags: [Mensagens]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome da sessão/instância
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [unavailable, available, composing, recording, paused]
 *               number:
 *                 type: string
 *               delay:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Status de presença atualizado
 */
router.route('/set-presence/:name').post(keyVerify, controller.SetStatus)

/**
 * @swagger
 * /message/send-seen/{name}:
 *   post:
 *     summary: Marca como visualizada a conversa de contato ou grupo
 *     tags: [Mensagens]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome da sessão/instância
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               number:
 *                 type: string
 *                 description: Número do contato ou JID do grupo
 *     responses:
 *       200:
 *         description: Mensagem marcada como visualizada
 */
router.route('/send-seen/:name').post(keyVerify, controller.sendSeen)

module.exports = router
