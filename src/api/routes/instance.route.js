const express = require('express')
const controller = require('../controllers/instance.controller')
const keyVerify = require('../middlewares/keyCheck')
const loginVerify = require('../middlewares/loginCheck')

const router = express.Router()

/**
 * @swagger
 * tags:
 *   name: Instancia
 *   description: Gerenciamento das instâncias
 */

/**
 * @swagger
 * /instance/create:
 *   post:
 *     summary: Cria uma nova instância do WhatsApp
 *     tags: [Instancia]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               webhook:
 *                 type: boolean
 *                 description: Ativa/desativa o webhook (opcional)
 *               webhookUrl:
 *                 type: string
 *                 format: uri
 *                 description: URL do webhook (opcional)
 *     responses:
 *       200:
 *         description: Instância criada com sucesso
 */
router.route('/create').post(keyVerify, controller.init)

/**
 * @swagger
 * /instance/connect/{name}:
 *   get:
 *     summary: Retorna o QR Code para conexão
 *     tags: [Instancia]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: QR Code retornado
 */
router.route('/connect/:name').get(keyVerify, controller.qr)

/**
 * @swagger
 * /instance/request-code/{name}:
 *   post:
 *     summary: Solicita código de verificação [Inativo]
 *     tags: [Instancia]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Código solicitado
 */
router.route('/request-code/:name').post(keyVerify, controller.requestCode)

/**
 * @swagger
 * /instance/info/{name}:
 *   get:
 *     summary: Retorna informações da instância
 *     tags: [Instancia]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Informações retornadas
 */
router.route('/info/:name').get(keyVerify, controller.info)

/**
 * @swagger
 * /instance/profile/{name}:
 *   get:
 *     summary: Retorna perfil da instância
 *     tags: [Instancia]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Perfil retornado
 */
router.route('/profile/:name').get(keyVerify, controller.profile)

/**
 * @swagger
 * /instance/logout/{name}:
 *   delete:
 *     summary: Faz logout da instância
 *     tags: [Instancia]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Logout realizado
 */
router.route('/logout/:name').delete(keyVerify, loginVerify, controller.logout)

/**
 * @swagger
 * /instance/delete/{name}:
 *   delete:
 *     summary: Deleta a instância
 *     tags: [Instancia]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Instância deletada
 */
router.route('/delete/:name').delete(keyVerify, controller.delete)

/**
 * @swagger
 * /instance/list:
 *   get:
 *     summary: Lista todas as instâncias
 *     tags: [Instancia]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Lista retornada
 */
router.route('/list').get(keyVerify, controller.list)

/**
 * @swagger
 * /instance/restore:
 *   get:
 *     summary: Restaura instâncias
 *     tags: [Instancia]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Instâncias restauradas
 */
router.route('/restore').get(keyVerify, controller.restore)

module.exports = router
