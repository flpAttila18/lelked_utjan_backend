const express = require('express');
const { register, login, verifyEmail , whoami,logout } = require('../controllers/userControllesr');
const { auth } = require('../middleware/UserMidleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/verify/:token', verifyEmail);
router.get('/whoami',auth, whoami)
router.post('/logout', auth , logout)



module.exports = router;