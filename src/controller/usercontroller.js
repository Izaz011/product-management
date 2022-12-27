const { isValidName, forName, isValidEmail, isValidNumber, isValidPassword, isValidObjectId, isValidPincode } = require('../validator/validation.js')
const userModel = require('../models/usermodel.js')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const aws = require("aws-sdk")

aws.config.update({
    accessKeyId: "AKIAY3L35MCRZNIRGT6N",
    secretAccessKey: "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",
    region: "ap-south-1"
})

let uploadFile = async (file) => {
    return new Promise(function (resolve, reject) {

        let s3 = new aws.S3({ apiVersion: '2006-03-01' }); // we will be using the s3 service of aws

        var uploadParams = {
            ACL: "public-read",
            Bucket: "classroom-training-bucket",
            Key: "abc/" + file.originalname,
            Body: file.buffer
        }


        s3.upload(uploadParams, function (err, data) {
            if (err) {
                return reject({ "error": err })
            }
            console.log(data)
            console.log("file uploaded succesfully")
            return resolve(data.Location)
        })



    })
}


// ........................................................................... POST API .......................................................................
const registerUser = async function (req, res) {
    try {
        let files = req.files
        if (files && files.length > 0) {
            let uploadedFileURL = await uploadFile(files[0])
            req.body.profileImage = uploadedFileURL
        }
        else {
            return res.status(400).send({ message: "profile image is mandatory" })
        }



        // checking requirements
        if (Object.keys(req.body).length == 0) { return res.status(400).send({ status: false, message: "body is important" }) }

        if (!req.body.fname) { return res.status(400).send({ status: false, message: "fname is mandatory" }) }

        if (!req.body.lname) { return res.status(400).send({ status: false, message: "lname is mandatory" }) }

        if (!req.body.email) { return res.status(400).send({ status: false, message: "email is mandatory" }) }

        if (!req.body.profileImage) { return res.status(400).send({ status: false, message: "profileImage is mandatory" }) }

        if (!req.body.phone) { return res.status(400).send({ status: false, message: "phone is mandatory" }) }

        if (!req.body.password) { return res.status(400).send({ status: false, message: "password is mandatory" }) }

        if (!req.body.address) { return res.status(400).send({ status: false, message: "address is mandatory" }) }


        req.body.address = JSON.parse(req.body.address)

        if(!req.body.address.shipping){
            return res.status(400).send({status:false,message:"shipping field is mandatory"})
        }
        if(!req.body.address.billing){
            return res.status(400).send({status:false,message:"billing field is mandatory"})
        }

        if (!req.body.address.shipping.street) { return res.status(400).send({ status: false, message: "street is mandatory" }) }

        if (!req.body.address.shipping.city) { return res.status(400).send({ status: false, message: "city is mandatory" }) }

        if (!req.body.address.shipping.pincode) { return res.status(400).send({ status: false, message: "pincode is mandatory" }) }

        if (!req.body.address.billing.street) { return res.status(400).send({ status: false, message: "street is mandatory" }) }

        if (!req.body.address.billing.city) { return res.status(400).send({ status: false, message: "city is mandatory" }) }

        if (!req.body.address.billing.pincode) { return res.status(400).send({ status: false, message: "pincode is mandatory" }) }

        // validation starts
        if (!forName(req.body.fname) || !isValidName(req.body.fname)) { return res.status(400).send({ status: false, message: "fname is not valid" }) }

        if (!forName(req.body.lname) || !isValidName(req.body.lname)) { return res.status(400).send({ status: false, message: "lname is not valid" }) }

        if (!forName(req.body.fname) || !isValidName(req.body.fname)) { return res.status(400).send({ status: false, message: "fname is not valid" }) }

        if (!isValidEmail(req.body.email)) { return res.status(400).send({ status: false, message: "email is not valid" }) }

        if (!isValidName(req.body.profileImage)) { return res.status(400).send({ status: false, message: "profileImage is not valid" }) }

        if (!isValidNumber(req.body.phone)) { return res.status(400).send({ status: false, message: "phone no. is not valid" }) }

        if (!isValidPassword(req.body.password)) { return res.status(400).send({ status: false, message: "password is not valid.uppercase,special character and lowercase is mandatory and length should be between 8 and 15." }) }

        if (!isValidName(req.body.address.shipping.street)) { return res.status(400).send({ status: false, message: "street is not valid" }) }

        if (!isValidName(req.body.address.shipping.city)) { return res.status(400).send({ status: false, message: "city is not valid" }) }

        if (!isValidPincode(req.body.address.shipping.pincode)) { return res.status(400).send({ status: false, message: "pincode is not valid" }) }

        req.body.address.shipping.pincode = Number(req.body.address.shipping.pincode)

        if (!isValidName(req.body.address.billing.street)) { return res.status(400).send({ status: false, message: "street is not valid" }) }

        if (!isValidName(req.body.address.billing.city)) { return res.status(400).send({ status: false, message: "city is not valid" }) }

        if (!isValidPincode(req.body.address.billing.pincode)) { return res.status(400).send({ status: false, message: "pincode is not valid" }) }

        req.body.address.billing.pincode = Number(req.body.address.billing.pincode)
        //validation ends
        //==========================================================

        // checking uniqueness
        if (await userModel.findOne({ email: req.body.email})) { return res.status(409).send({ status: false, message: "email already exist" }) }

        if (await userModel.findOne({ phone: req.body.phone})) { return res.status(409).send({ status: false, message: "phone number already exist" }) }

        // encrypting the password
        req.body.password = await bcrypt.hash(req.body.password, 1)
        //==========================================================
        // storing document
        res.status(201).send({ status: true, message: "User created successfully", data: await userModel.create(req.body) })
    }
    catch (err) { res.status(500).send({ status: false, message: "Internal Server Error" }) }
}


//............................................................ SIGNIN API ..............................................................................

const logIn = async function (req, res) {
    try {
        const data = req.body
        const { email, password } = data
        if (Object.keys(data).length == 0) { return res.status(400).send({ status: false, message: "body is required" }) }

        if (!email) {
            return res.status(400).send({ status: false, message: "please provide email" })
        }

        if (!isValidEmail(email)) {
            return res.status(400).send({ status: false, message: "please provide valid email" })
        }

        if (!password) {
            return res.status(400).send({ status: false, message: "please provide password" })
        }

        if (!isValidPassword(password)) {
            return res.status(400).send({ status: false, message: "please provide valid password" })
        }

        const user = await userModel.findOne({ email: email }).select({ password: 1 })

        if (!user) {
            return res.status(404).send({ status: false, message: "no user found" })
        }

        const matchedPassword = await bcrypt.compare(password, user.password)

        if (!matchedPassword) {
            return res.status(400).send({ status: false, message: "user is not valid" })
        }

        const userId = user._id.toString()
        const token = jwt.sign(
            {
                userId: userId
            }, "productManagementKey",
            {
                expiresIn: "24h"
            }
        )

        return res.status(200).send({ status: true, message: "user log in successfully", data: { userId: userId, token: token } })
    }
    catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}
//............................................................ GET API ..............................................................................



const getUserParam = async function (req, res) {
    try {
        const decodedToken=req.decodedToken
        const userId=req.params.userId

        if(!isValidObjectId(userId)){
            return res.status(400).send({ status: true, message: "user ID is not valid"}) 
        }
        const user=await userModel.findOne({_id:userId})

        if(!user){
            return res.status(404).send({ status: true, message: "user not found"})
        }
        if(userId!==decodedToken.userId){

            return res.status(403).send({ status: true, message: "forbidden request"})
        }
        let { fname, lname, email, profileImage, phone, password, address, _id } = user
        let data = {}
        data.address = address
        data._id = _id
        data.fname = fname
        data.lname = lname
        data.email = email
        data.profileImage = profileImage
        data.phone = phone
        data.password = password

        return res.status(200).send({ status: true, message: "User profile details", data: data })

    } catch (err) {
        return res.status(500).send({ status: false, error: err.message })
    }
}
//............................................................. UPDATE API .............................................................................

const updateUser = async function (req, res) {
    try {
        const data = req.body;
        const userId = req.params.userId;
        const files = req.files;
        const update = {};

        const { fname, lname, email, phone, password, address } = data;

        // tempAddress.billing.pincode = data.address.billing.pincode


        if (Object.keys(data).length == 0 && !files) {
            return res.status(400).send({
                status: false,
                message: "Please provide data in the request body!",
            });
        }

        if (fname) {
            if (!forName(fname) || !isValidName(fname)) {
                return res
                    .status(400)
                    .send({ status: false, message: "fname is invalid" });
            }

            update["fname"] = fname;
        }

        if (lname) {
            if (!forName(lname) || !isValidName(lname)) {
                return res
                    .status(400)
                    .send({ status: false, message: "lname is invalid" });
            }
            update["lname"] = lname;
        }

        if (email) {
            if (!isValidEmail(email)) {
                return res
                    .status(400)
                    .send({ status: false, message: "Email is invalid!" });
            }

            let userEmail = await userModel.findOne({ email: email });
            if (userEmail) {
                return res.status(409).send({
                    status: false,
                    message:
                        "This email address already exists, please enter a unique email address!",
                });
            }
            update["email"] = email;
        }

        if (phone) {
            if (!isValidNumber(phone)) {
                return res
                    .status(400)
                    .send({ status: false, message: "Phone is invalid" });
            }

            let userNumber = await userModel.findOne({ phone: phone });
            if (userNumber)
                return res.status(409).send({
                    status: false,
                    message:
                        "This phone number already exists, please enter a unique phone number!",
                });
            update["phone"] = phone;
        }

        if (password) {
            if (isValidPassword(password)) {
                return res.status(400).send({
                    status: false,
                    message:
                        "Password should be strong, please use one number, one upper case, one lower case and one special character and characters should be between 8 to 15 only!",
                });
            }

            update.password = await bcrypt.hash(password, 10);
        }

        if (address) {
            data.address = JSON.parse(address)
            const { shipping, billing } = data.address;

            if (shipping) {
                const { street, city, pincode } = shipping;

                if (street) {
                    if (!isValidName(street)) {
                        return res
                            .status(400)
                            .send({ status: false, message: "Invalid shipping street!" });
                    }
                    update["address.shipping.street"]= street;
                }

                if (city) {
                    if (!isValidName(city)) {
                        return res
                            .status(400)
                            .send({ status: false, message: "Invalid shipping city!" });
                    }
                    update["address.shipping.city"] = city;
                }

                if (pincode) {
                    if (!isValidPincode(pincode)) {
                        return res
                            .status(400)
                            .send({ status: false, message: "Invalid shipping pincode!" });
                    }
                    update["address.shipping.pincode"] = pincode;
                }
            }

            if (billing) {
                const { street, city, pincode } = billing;

                if (street) {
                    if (!isValidName(street)) {
                        return res
                            .status(400)
                            .send({ status: false, message: "Invalid billing street!" });
                    }
                    update["address.billing.street"] = street;
                }

                if (city) {
                    if (!isValidName(city)) {
                        return res
                            .status(400)
                            .send({ status: false, message: "Invalid billing city!" });
                    }
                    update["address.billing.city"] = city;
                }

                if (pincode) {
                    if (!isValidPincode(pincode)) {
                        return res
                            .status(400)
                            .send({ status: false, message: "Invalid billing pincode!" });
                    }
                    update["address.billing.pincode"] = pincode;
                }
            }
        }
       
        if (files && files.length > 0) {
            let uploadedFileURL = await uploadFile(files[0]);
            update["profileImage"] = uploadedFileURL;
        }
        const updateUser = await userModel.findOneAndUpdate(
            { _id: userId },
            update,
            { new: true }
        );
        return res.status(200).send({
            status: true,
            message: "user profile successfully updated",
            data: updateUser,
        });
    } catch (error) {
        res.status(500).send({ status: false, message: error.message });
    }
};


module.exports = {
    registerUser, logIn, getUserParam, updateUser
}





















