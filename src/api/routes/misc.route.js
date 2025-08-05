const express = require('express')
const controller = require('../controllers/misc.controller')
const keyVerify = require('../middlewares/keyCheck')
const loginVerify = require('../middlewares/loginCheck')

const router = express.Router()

/**
 * @swagger
 * tags:
 *   name: Chats
 *   description: Chats da instancia no WhatsApp
 */


/**
 * @swagger
 * /misc/onwhatsapp/{name}:
 *   get:
 *     summary: Verifica se um número está no WhatsApp
 *     tags: [Chats]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome da sessão/instância
 *       - in: query
 *         name: number
 *         required: true
 *         schema:
 *           type: string
 *         description: Número para verificação
 *     responses:
 *       200:
 *         description: Resultado da verificação
 */
router.route('/onwhatsapp/:name').get(keyVerify, loginVerify, controller.onWhatsapp)

/**
 * @swagger
 * /misc/downProfile/{name}:
 *   get:
 *     summary: Faz download da foto de perfil de um número
 *     tags: [Chats]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome da sessão/instância
 *       - in: query
 *         name: number
 *         required: true
 *         schema:
 *           type: string
 *         description: Número do contato
 *     responses:
 *       200:
 *         description: Foto de perfil retornada
 */
router.route('/downProfile/:name').get(keyVerify, loginVerify, controller.downProfile)

router.route('/getStatus').get(keyVerify, loginVerify, controller.getStatus)
router.route('/blockUser').get(keyVerify, loginVerify, controller.blockUser)
router
    .route('/updateProfilePicture')
    .post(keyVerify, loginVerify, controller.updateProfilePicture)
router
    .route('/getuserorgroupbyid')
    .get(keyVerify, loginVerify, controller.getUserOrGroupById)
module.exports = router
