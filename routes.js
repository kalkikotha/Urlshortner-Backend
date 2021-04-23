const express = require("express")
const app = express()
const cors = require("cors")
const mongoDb = require("mongodb")
const DB = "URLshortnerdb"
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const nanoid = require('nanoid')

require("dotenv").config()
const URL = process.env.URL


app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

function authenticate(req, res, next) {

    if (req.headers.authorization) {
        try {
            let jwtValid = jwt.verify(req.headers.authorization, process.env.SECRET)
            if (jwtValid) {
                req.userID = jwtValid._id;
                next()
            }
        } catch (error) {
            res.status(401).json({
                message: "Invalid Token"
            })
        }
    } else {
        res.status(401).json({
            message: "No token Present"
        })
    }

}

app.post("/register", async (req, res) => {
    try {
        let connection = await mongoDb.connect(URL, { useUnifiedTopology: true })
        let db = connection.db(DB)
        let isEmailUnique = await db.collection("users").findOne({ email: req.body.email })
        if (isEmailUnique) {
            res.status(401).json({
                message: "Email already exists"
            })
        } else {
            let salt = await bcrypt.genSalt(10)
            let hash = await bcrypt.hash(req.body.password, salt)
            console.log(hash)
            req.body.password = hash;
            let users = await db.collection("users").insertOne(req.body)
            await connection.close()
            res.json({
                message: "user registered"
            })
        }
    } catch (error) {
        console.log(error)
    }
})

app.post("/login", async (req, res) => {
    try {
        let connection = await mongoDb.connect(URL, { useUnifiedTopology: true })
        let db = connection.db(DB)
        let user = await db.collection("users").findOne({ email: req.body.email })

        if (user) {
            let ispassword = await bcrypt.compare(req.body.password, user.password)
            if (ispassword) {
                let token = jwt.sign({ _id: user._id }, process.env.SECRET)
                res.json({
                    message: "Allow",
                    token: token,
                    id: user._id
                })
            } else {
                res.status(404).json({
                    message: "Email or password is incorrect"
                })
            }
        } else {
            res.status(404).json({
                message: "Email or password is incorrect"
            })
        }

    } catch (error) {
        console.log(error)
    }

})

app.get("/urls/:id", authenticate, async (req, res) => {
    try {
        let connection = await mongoDb.connect(URL, { useUnifiedTopology: true })
        let db = connection.db(DB)
        let data = await db.collection('users').findOne({ _id: mongoDb.ObjectID(req.params.id) })
        res.json(data)
        await connection.close()
    } catch (error) {
        console.log(error)
    }
})

app.post('/urls/:id', authenticate, async (req, res) => {
    try {
        let connection = await mongoDb.connect(URL, { useUnifiedTopology: true })
        let db = connection.db(DB)
        let shortURL = nanoid(6);
        let data = await db.collection('users').updateOne({ _id: mongoDb.ObjectID(req.params.id) }, { $push: { links: { $each: [{ longUrl: req.body.fullUrl, shortURL: shortURL }] } } })
            .then((result) => {
                res.json({shortURL})
            }).catch((err) => {
                res.json({ message: "update failure" })
            });
        await connection.close()

    } catch (error) {
        console.log(error)
    }
})

app.listen(process.env.PORT || 5000)