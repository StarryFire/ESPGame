if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

const express = require('express');
const app = express();
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser');
const session = require('express-session');
const methodOverride = require('method-override');


const indexRouter = require('./routes/index')
const gameRouter = require('./routes/game')
const adminRouter = require('./routes/admin')


const mongoose = require('mongoose');
mongoose.connect(process.env.DATABASE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    socketTimeoutMS: 0,
})
mongoose.set('useCreateIndex', true);
const db = mongoose.connection
db.on('error', error => console.error(error));
db.once('open', () => console.log("Connected to Mongoose"));


app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.set('layout', 'layouts/layout');
app.use(expressLayouts);
app.use(express.static('public'));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
}))
app.use(methodOverride('_method'));
app.use(bodyParser.urlencoded({
    limit: '10mb',
    extended: false,
}))

app.use('/', indexRouter);
app.use('/game', gameRouter);
app.use('/admin', adminRouter);

app.listen(process.env.PORT);