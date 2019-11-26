const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const Image = require('../models/image')
const Question = require('../models/question');
const User = require('../models/user');
const bcrypt = require('bcrypt')



if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

mongoose.connect(process.env.DATABASE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    socketTimeoutMS: 0,
})
const db = mongoose.connection

fs.readdir(path.join('public', Image.imageBasePath), async (err, files) => {
    try {
        let promises = [];
        files.forEach(async file => {
            const image = new Image({
                name: file,
            })
            promises.push(image.save());
        });
    
        const savedImages = await Promise.all(promises)
        promises = [];
        for(let i = 0; i < savedImages.length; i += 3) {
            const primaryImage = savedImages[i];
            const secondaryImage_1 = savedImages[i+1];
            const secondaryImage_2 = savedImages[i+2];
            const question = new Question({
                primaryImage: primaryImage.id,
                secondaryImages: [secondaryImage_1.id, secondaryImage_2.id],
            })
            promises.push(question.save());
        }
    
        await Promise.all(promises);
    
        const user = new User({
            name: "Admin",
            username: "admin",
            password: await bcrypt.hash("admin", 10),
            isAdmin: true,
        })

        const savedUser = await user.save();
        db.close();
    } catch(e) {
        console.log(e);
        db.close();
    }
    
});

