const express = require('express')
const router = express.Router()
const instanceRoutes = require('./instance.route')
const messageRoutes = require('./message.route')
const miscRoutes = require('./misc.route')
const groupRoutes = require('./group.route')
const labelRoutes = require('./label.route')
const historyRoutes = require('./history.route')


/**
 * @swagger
 * /status:
 *   get:
 *     summary: Verifica o status da API
 *     tags: [Status]
 *     responses:
 *       200:
 *         description: Retorna OK se a API está ativa
 */
router.get('/status', (req, res) => res.send('OK'))
router.use('/instance', instanceRoutes)
router.use('/message', messageRoutes)
router.use('/group', groupRoutes)
router.use('/label', labelRoutes)
router.use('/misc', miscRoutes)
router.use('/chat', historyRoutes)

module.exports = router
