function loginVerification(req, res, next) {
    const key = req.headers['x-api-key']?.toString()
    if (!key) {
        return res
            .status(403)
            .send({ error: true, message: 'no API key header was present' })
    }
    if (key !== process.env.TOKEN) {
        return res
            .status(403)
            .send({ error: true, message: 'invalid API key supplied' })
    }
    next()
}

module.exports = loginVerification
