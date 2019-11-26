const express = require('express');
const bcrypt = require('bcrypt');

const router = express.Router();
const User = require('../models/user');
const Question = require('../models/question');
const Answer = require('../models/answer');
const Image = require('../models/image');
const errorCodes = require('../errors');
const constants = require('../constants');

router.get('/', async (req, res) => {
    if (!req.session.user) {
        res.redirect('/login')
    } else if (req.session.user.isAdmin) {
        res.redirect('/admin');
    } else {
        try {
            const curUserId = req.session.user._id;
            let qToAsk = [];
            let qAnsweredByUser = await Answer.find({
                user: curUserId
            }).distinct('question');
            console.log(qAnsweredByUser);
            //Questions that should be asked to reach consensus
            let qIdsPreferred = await Answer.find({
                question: {
                    $nin: qAnsweredByUser,
                },
            }).distinct('question')
            qIdsPreferred = qIdsPreferred.slice(0, constants.TASK_SIZE)
            if (qIdsPreferred.length > 0) {
                qToAsk = await Question.find({
                    _id: {
                        $in: qIdsPreferred,
                    }
                })
            } else {
                qToAsk = await Question.find({
                    _id: {
                        $nin: qAnsweredByUser,
                    }
                }).limit(constants.TASK_SIZE);
            }

            if (qToAsk.length === 0) {
                return res.redirect('/checkBackAgain');
            }


            const qData = [];
            for (let i = 0; i < qToAsk.length; ++i) {
                const q = qToAsk[i];
                const pImageId = q.primaryImage;
                const sImageIds = q.secondaryImages;
                const pImage = await Image.findById(pImageId);
                const sImagesPromises = sImageIds.map(sImageId => {
                    return Image.findById(sImageId);
                })
                const sImages = await Promise.all(sImagesPromises);
                qData.push({
                    qId: q._id,
                    pImage: pImage,
                    sImages: sImages,
                })
            }
            res.render('index', {
                questions: qData,
            });
        } catch (e) {
            console.log(e);
        }
    }
})

router.post('/', async (req, res) => {
    console.log(req.session.user._id);


    try {
        const curUserId = req.session.user._id;
        const curUser = await User.findById(curUserId)

        let promises = [];
        Object.keys(req.body).forEach(qId => {
            const answer = new Answer({
                question: qId,
                answer: req.body[qId],
                user: curUserId,
            })
            promises.push(answer.save());
        })

        const savedAnswers = await Promise.all(promises);
        console.log("SAVED ANSWERS", savedAnswers);
        for (let i = 0; i < savedAnswers.length; ++i) {
            const ans = savedAnswers[i];
            const qId = ans.question;
            const optionChosenId = ans.answer;
            const otherUsersWithSameAnswer = await Answer.find({
                question: qId,
                answer: optionChosenId,
                user: {
                    $ne: curUserId,
                }
            }, 'user')

            console.log("OTHER USER IDs with same answer", otherUsersWithSameAnswer);

            for (let i = 0; i < otherUsersWithSameAnswer.length; ++i) {
                const otherUserId = otherUsersWithSameAnswer[i].user;
                const otherUser = await User.findById(otherUserId);
                otherUser.score = otherUser.score + 1;
                curUser.score = curUser.score + 1;
                const savedOtherUser = await otherUser.save();
                const savedCurUser = await curUser.save();
                console.log(savedOtherUser, savedCurUser);
            }
        }
        res.redirect('/score');
    } catch (e) {
        console.log(e);
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
        res.redirect('/');
    }
})

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
                res.redirect('/');
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
        res.redirect('/');
    }
})

router.get('/checkBackAgain', (req, res) => {
    if (!req.session.user) {
        res.redirect('/login');
    } else if (req.session.user.isAdmin) {
        res.redirect('/admin');
    } else {
        res.render('checkBackAgain')
    }
})

router.get('/score', async (req, res) => {
    if (!req.session.user) {
        res.redirect('/login');
    } else if (req.session.user.isAdmin) {
        res.redirect('/admin');
    } else {
        const user = await User.findById(req.session.user._id)
        res.render('score', {
            user: user,
        });
    }
})

router.get('/admin', async (req, res) => {
    if (!req.session.user) {
        res.redirect('/login');
    } else if (!req.session.user.isAdmin) {
        res.send("You are not authorized to view this page")
    } else {
        try {
            const questions = await Question.find({});
            console.log(questions);
            const aggregatorOpts = [
                {
                    $group: {
                        _id: {
                            question: "$question",
                            answer: "$answer",
                        },
                        count: { $sum: 1 }
                    }
                }
            ]

            const questionsAnswerPairCount = await Answer.aggregate(aggregatorOpts)
            const questionsConsensusSet = new Set();
            questionsAnswerPairCount
                .filter(q => q.count >= 2)
                .map(q => q._id.question)
                .forEach(qId => questionsConsensusSet.add(qId));
            if (questions.length === questionsConsensusSet.size)
                res.render('admin', {
                    user: req.session.user,
                    message: "All questions have reached consensus!"
                });
            else {
                res.render('admin', {
                    user: req.session.user,
                    message: "All questions are yet to reach consensus!"
                });
            }
        } catch(e) {
            console.log(e);
        }

    }
})

router.delete('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
})

module.exports = router;