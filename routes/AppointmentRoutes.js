const express = require('express')
const { auth } = require('../middleware/UserMidleware');
const {booked, bookAppointment, verifyAppointment} = require('../controllers/AppointmentController')

const router = express.Router();

router.get('/booked' , booked)
router.post('/book' ,auth, bookAppointment)
router.get('/verify/:token', verifyAppointment);


module.exports = router