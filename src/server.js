const dotenv = require('dotenv')
const mongoose = require('mongoose')
const logger = require('pino')()
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

dotenv.config()

const app = require('./config/express')
const config = require('./config/config')

const { Session } = require('./api/class/session')
const connectToCluster = require('./api/helper/connectMongoClient')

let server

if (config.mongoose.enabled) {
    mongoose.set('strictQuery', true);
    mongoose.connect(config.mongoose.url, config.mongoose.options).then(() => {
        logger.info('Connected to MongoDB')
    })
}

server = app.listen(config.port, async () => {
    logger.info(`Listening on port ${config.port}`)
    global.mongoClient = await connectToCluster(config.mongoose.url)
    if (config.restoreSessionsOnStartup) {
        logger.info(`Restoring Sessions`)
        const session = new Session()
        let restoreSessions = await session.restoreSessions()
        logger.info(`${restoreSessions.length} Session(s) Restored`)
    }
})

const exitHandler = () => {
    if (server) {
        server.close(() => {
            logger.info('Server closed')
            process.exit(1)
        })
    } else {
        process.exit(1)
    }
}

const unexpectedErrorHandler = (error) => {
    logger.error(error)
    exitHandler()
}

process.on('uncaughtException', unexpectedErrorHandler)
process.on('unhandledRejection', unexpectedErrorHandler)

process.on('SIGTERM', () => {
    logger.info('SIGTERM received')
    if (server) {
        server.close()
    }
})

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API WhatsApp Resgata Fácil',
            description: 'https://beta.resgatafacil.com',
            version: '1.0.0',
        },
        components: {
            securitySchemes: {
                ApiKeyAuth: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'x-api-key',
                    description: 'Token de autenticação via header x-api-key'
                }
            }
        },
        security: [
            {
                ApiKeyAuth: []
            }
        ]
    },
    apis: ['./src/api/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

module.exports = server
