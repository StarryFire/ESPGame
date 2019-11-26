const express = require('express');

const router = express.Router();
const Question = require('../models/question');
const Answer = require('../models/answer');

router.get('/', async (req, res) => {
    if (!req.session.user) {
        res.redirect('/login');
    } else if (!req.session.user.isAdmin) {
        res.send("You are not authorized to view this page")
    } else {
        try {
            const questions = await Question.find({});
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
                res.render('admin/index', {
                    user: req.session.user,
                    message: "All questions have reached consensus!"
                });
            else {
                res.render('admin/index', {
                    user: req.session.user,
                    message: "All questions are yet to reach consensus!"
                });
            }
        } catch(e) {
            console.log(e);
        }

    }
})

module.exports = router;