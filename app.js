const express = require('express')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const path = require('path')
const userRoutes = require('./routes/UserRoutes')
const appointmentRoutes = require('./routes/AppointmentRoutes')

const app = express()

app.use(express.json())
app.use(cookieParser())
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));


app.use('/users/' , userRoutes)
app.use('/appointment' , appointmentRoutes )

module.exports  = app