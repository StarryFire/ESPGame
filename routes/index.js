const express = require('express');
const bcrypt = require('bcrypt');

const router = express.Router();
const User = require('../models/user');
const errorCodes = require('../errors');

router.get('/', (req, res) => {
    if (!req.session.user) {
        res.redirect('login')
    } else if (req.session.user.isAdmin) {
        res.redirect('/admin');
    } else {
        res.redirect('/game');
    }
})

router.get('/register', (req, res) => {
    if (!req.session.user) {
        res.render('register', {
            user: new User(),
        })
    } else if (req.session.user.isAdmin) {
        res.redirect('/admin');
    } else {
        res.redirect('/game');
    }
})

/**
 * Stores the password in encrypted format using bcrypt hashing algorithm
 */
router.post('/register', async (req, res) => {
    const { name, username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
        name: name,
        username: username,
        password: hashedPassword,
    })
    try {
        await user.save();
        res.redirect('/login');
    } catch {
        res.render('register', {
            errorMessage: "Cannot register user!",
            user: user,
        })
    }
})

/**
 * creates a session for the user once the user logs in
 */
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({
            username: username,
        })
        if (!user) {
            throw new Error(errorCodes.USER_NOT_FOUND);
        }
        if (await bcrypt.compare(password, user.password)) {
            req.session.user = user;
            if (user.isAdmin) {
                res.redirect('/admin');
            } else {
                res.redirect('/game');
            }
        } else {
            throw new Error(errorCodes.INCORRECT_PASSWORD);
        }
    } catch (e) {
        let errorMessage;
        switch (e.message) {
            case errorCodes.USER_NOT_FOUND:
                errorMessage = `Error: username ${username} not registered!`
                break;
            case errorCodes.INCORRECT_PASSWORD:
                errorMessage = `Error: incorrect password!`
                break;
            default:
                errorMessage = "Error: Database Error";
        }
        res.render('login', {
            errorMessage: errorMessage,
            user: new User({
                username: username,
            }),
        })
    }
})


router.get('/login', (req, res) => {
    if (!req.session.user) {
        res.render('login', {
            user: new User(),
        })
    } else if (req.session.user.isAdmin) {
        res.redirect('/admin');
    } else {
        res.redirect('/game');
    }
})

/**
 * destroys the session once the user logs out
 */
router.delete('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
})

module.exports = router;