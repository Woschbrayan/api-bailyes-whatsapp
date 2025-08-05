const express = require('express')
const controller = require('../controllers/label.controller')
const keyVerify = require('../middlewares/keyCheck')
const loginVerify = require('../middlewares/loginCheck')

const router = express.Router()

/**
 * @swagger
 * tags:
 *   name: Etiquetas
 *   description: Gerenciamento de etiquetas no WhatsApp
 */


/**
 * @swagger
 * /label/all/{name}:
 *   get:
 *     summary: Lista todas as etiquetas da instância
 *     tags: [Etiquetas]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome da sessão/instância
 *     responses:
 *       200:
 *         description: Lista de etiquetas retornada
 */
router.route('/all/:name').get(keyVerify, loginVerify, controller.listAll)

/**
 * @swagger
 * /label/chats/{name}:
 *   get:
 *     summary: Lista as associações de chats com etiquetas
 *     tags: [Etiquetas]
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
 *         name: id
 *         required: false
 *         schema:
 *           type: string
 *         description: ID da etiqueta (labelId)
 *     responses:
 *       200:
 *         description: Lista de associações retornada
 */
router.route('/chats/:name').get(keyVerify, loginVerify, controller.listLabelAssociations)
module.exports = router
