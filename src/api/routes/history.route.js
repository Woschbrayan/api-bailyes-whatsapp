const express = require('express')
const controller = require('../controllers/history.controller')
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
 * /chat/all/{name}:
 *   get:
 *     summary: Lista todos os chats da instância
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
 *     responses:
 *       200:
 *         description: Lista de chats retornada
 */
router.route('/all/:name').get(keyVerify, loginVerify, controller.fetch)

/**
 * @swagger
 * /chat/messages/{number}/{name}:
 *   get:
 *     summary: Lista todas as mensagens de um número específico na instância
 *     tags: [Chats]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: number
 *         required: true
 *         schema:
 *           type: string
 *         description: Número do contato
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome da sessão/instância
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1000
 *         description: Limite de mensagens retornadas
 *       - in: query
 *         name: fromMe
 *         required: false
 *         schema:
 *           type: string
 *           enum: [all, true, false]
 *           default: all
 *         description: Filtra mensagens enviadas pela instancia (true), pelo outro numero (false) ou todas (all)
 *     responses:
 *       200:
 *         description: Lista de mensagens retornada
 */
router.route('/messages/:number/:name').get(keyVerify, loginVerify, controller.fetchMessages)

module.exports = router
