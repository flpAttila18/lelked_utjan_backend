const jwt = require("jsonwebtoken")
const {config} = require('../config/dotenvConfig')

function auth(req ,  res , next ){
    const token = req.cookies?.[config.COOKIE_NAME]

    if(!token){
        return res.status(401).json({error:'nincs cookie'})
    }

    try {
            req.user  = jwt.verify(token, config.JWT_SECRET)

            next()
    } catch (err) {
        return res.status(401).json({error:'Érvénytelen a token'})
    }
}

module.exports = {auth}