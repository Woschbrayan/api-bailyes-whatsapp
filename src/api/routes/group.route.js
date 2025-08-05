const express = require('express')
const controller = require('../controllers/group.controller')
const keyVerify = require('../middlewares/keyCheck')
const loginVerify = require('../middlewares/loginCheck')

const router = express.Router()

/**
 * @swagger
 * tags:
 *   name: Grupos
 *   description: Gerenciamento de grupos no WhatsApp
 */


/**
 * @swagger
 * /group/all/{name}:
 *   get:
 *     summary: Lista todos os grupos da instância
 *     tags: [Grupos]
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
 *         description: Lista de grupos retornada
 */
router.route('/all/:name').get(keyVerify, loginVerify, controller.listAll)

/**
 * @swagger
 * /group/participants/{name}:
 *   get:
 *     summary: Lista os participantes de um grupo específico
 *     tags: [Grupos]
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
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do grupo
 *     responses:
 *       200:
 *         description: Lista de participantes retornada
 */
router.route('/participants/:name').get(keyVerify, loginVerify, controller.getGroupParticipants);


router.route('/create/:name').post(keyVerify, loginVerify, controller.create)
router.route('/leave/:name').get(keyVerify, loginVerify, controller.leaveGroup)

router
    .route('/inviteuser/:name')
    .post(keyVerify, loginVerify, controller.addNewParticipant)
router.route('/makeadmin').post(keyVerify, loginVerify, controller.makeAdmin)
router
    .route('/demoteadmin/:name')
    .post(keyVerify, loginVerify, controller.demoteAdmin)
router
    .route('/getinvitecode/:name')
    .get(keyVerify, loginVerify, controller.getInviteCodeGroup)
router
    .route('/getinstanceinvitecode/:name')
    .get(keyVerify, loginVerify, controller.getInstanceInviteCodeGroup)
router
    .route('/participantsupdate/:name')
    .post(keyVerify, loginVerify, controller.groupParticipantsUpdate)
router
    .route('/settingsupdate/:name')
    .post(keyVerify, loginVerify, controller.groupSettingUpdate)
router
    .route('/updatesubject/:name')
    .post(keyVerify, loginVerify, controller.groupUpdateSubject)
router
    .route('/updatedescription/:name')
    .post(keyVerify, loginVerify, controller.groupUpdateDescription)
router
    .route('/inviteinfo/:name')
    .post(keyVerify, loginVerify, controller.groupInviteInfo)
router.route('/groupjoin/:name').post(keyVerify, loginVerify, controller.groupJoin)
module.exports = router
