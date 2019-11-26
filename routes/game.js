const express = require('express');

const router = express.Router();
const User = require('../models/user');
const Question = require('../models/question');
const Answer = require('../models/answer');
const Image = require('../models/image');
const constants = require('../constants');

router.get('/', async (req, res) => {
    if (!req.session.user) {
        res.redirect('/login')
    } else if (req.session.user.isAdmin) {
        res.redirect('/admin');
    } else {
        res.render('game/index');
    }
})

/**
 * Populates the page with only those questions that the user haven't answered
 * yet and gives preference to those questions for which there already exists 
 * an answer from other users.
 */
router.get('/game', async (req, res) => {
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
                return res.redirect('/game/checkBackAgain');
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
            res.render('game/game', {
                questions: qData,
            });
        } catch (e) {
            console.log(e);
        }
    }
})

/**
 * Assigns points to the user and the other users who participated in the
 * game before once the current user submits their responses.
 */
router.post('/game', async (req, res) => {
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

            for (let i = 0; i < otherUsersWithSameAnswer.length; ++i) {
                const otherUserId = otherUsersWithSameAnswer[i].user;
                const otherUser = await User.findById(otherUserId);
                otherUser.score = otherUser.score + 1;
                curUser.score = curUser.score + 1;
                await otherUser.save();
                await curUser.save();
            }
        }
        res.redirect('/game/score');
    } catch (e) {
        console.log(e);
    }

})

/**
 * If the user has answered all the questions in the system, 
 * this page is shown
 */
router.get('/checkBackAgain', (req, res) => {
    if (!req.session.user) {
        res.redirect('/login');
    } else if (req.session.user.isAdmin) {
        res.redirect('/admin');
    } else {
        res.render('game/checkBackAgain')
    }
})

/**
 * Displays the score of the user once they have completed a task
 * a task here comprises of only 3 primary images ( questions )
 */
router.get('/score', async (req, res) => {
    if (!req.session.user) {
        res.redirect('/login');
    } else if (req.session.user.isAdmin) {
        res.redirect('/admin');
    } else {
        const user = await User.findById(req.session.user._id)
        res.render('game/score', {
            user: user,
        });
    }
})

module.exports = router;