const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Create a Schema variable
const Schema = mongoose.Schema;


// Define the userSchema
const userSchema = new Schema({
    userName: {
        type: String,
        unique: true, 
        required: true
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    loginHistory: [{
        dateTime: {
            type: Date,
            required: true
        },
        userAgent: {
            type: String,
            required: true
        }
    }]
});

// To be defined on new connection
let User;

module.exports.initialize = function () {
    return new Promise(function (resolve, reject) {
        let db = mongoose.createConnection(process.env.MONGODB);

        db.on('error', (err) => {
            reject(err); // reject the promise with the provided error
        });

        db.once('open', () => {
            User = db.model("users", userSchema);
            resolve(); // resolve without returning any data
        });
    });
};

module.exports.registerUser = function (userData) {
    return new Promise(async function (resolve, reject) {
        if (userData.password !== userData.password2) {
            reject("Passwords do not match");
        } else {
            try {
                // Hash the password with a salt of 10 rounds
                const hashedPassword = await bcrypt.hash(userData.password, 10);

                let newUser = new User({
                    userName: userData.userName,
                    password: hashedPassword, // Use hashed password here
                    email: userData.email,
                    loginHistory: []
                });

                await newUser.save();
                resolve();
            } catch (err) {
                console.log(err);
                reject("There was an error encrypting the password");
            }
        }
    });
};

module.exports.checkUser = function (userData) {
    return new Promise(async function (resolve, reject) {
        try {
            // Find the user by userName
            const users = await User.find({ userName: userData.userName });

                if (users.length === 0) {
                    reject("Unable to find user: " + userData.userName);
                } else {
                    // Compare the entered password with the stored hashed password
                    const isMatch = await bcrypt.compare(userData.password, users[0].password);
                        
                    if (!isMatch) {
                        reject("Incorrect Password for user: " + userData.userName);
                    } else {
                        if (users[0].loginHistory.length === 8) {
                            users[0].loginHistory.pop();
                        }
                        users[0].loginHistory.unshift({
                            dateTime: new Date(),
                            userAgent: userData.userAgent || "" 
                        });
    
                        // Update login history in the database
                        await User.updateOne(
                            { userName: users[0].userName },
                            { $set: { loginHistory: users[0].loginHistory } }
                        );
    
                        resolve(users[0]); // Return the user data
                    }
                }
            } catch (err) {
                console.log(err); // Log any errors
                reject("There was an error verifying the user: " + err); // Reject the promise with an error message
            }
        });
    };