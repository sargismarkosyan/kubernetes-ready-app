const fs = require('fs')
const { promisify } = require('util')
const path = require('path')
const express = require('express')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const mustacheExpress = require('mustache-express')
const multer = require('multer')
const CatalogItem = require('./schemas/catalog-item')
const accessAsync = promisify(fs.access)
const unlinkAsync = promisify(fs.unlink)
const app = express()
const port = process.env.PORT || 3000
const upload = multer({ dest: __dirname + '/../files' })
const homeURL = process.env.HOME_URL || '/'

const mongoDB = process.env.DBURI || 'mongodb://root:root@localhost:27017/simple-catalog?authSource=admin';
mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.connection.on('error', (e) => {
    throw 'Can\'t connect to DB'
})
mongoose.connection.on('disconnected', (e) => {
    throw 'Disconnected from the DB'
})

app.engine('html', mustacheExpress())
app.set('views', __dirname + '/views')
app.set('view engine', 'html')
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.get('/', async (req, res) => {
    let items = []
    let error = ''
    try {
        items = await CatalogItem.find({}, null, { sort: { date: -1 } })
    } catch (err) {
        error = err
        console.error(err)
    }
    res.render('index', { items: items, error: error, homeURL: homeURL })
})

app.get('/image/:imageUrl', async (req, res) => {
    const file = path.resolve(`files/${req.params.imageUrl}`)
    try {
        await accessAsync(file, fs.F_OK)
    } catch (err) {
        console.error(err)
        return res.send('Can\'t access the file')
    }
    const s = fs.createReadStream(file)
    s.on('open', function () {
        res.set('Content-Type', 'image/png')
        res.setHeader('Cache-Control', 'public, max-age=86400');
        s.pipe(res)
    });
})

app.post('/add', upload.single('image'), async (req, res) => {
    if (!req.body.title) {
        return res.send('No title was provided')
    }

    let imageUrl = req.file && req.file.filename || undefined

    const item = new CatalogItem({ title: req.body.title, imageUrl: imageUrl })

    try {
        await item.save()
    } catch (err) {
        await unlinkAsync(req.file.path)
        console.error(err)
        return res.send('Can\'t save the record.')
    }

    res.redirect(301, homeURL)
})

app.get('/remove/:itemId', upload.single('image'), async (req, res) => {
    let item
    try {
        item = await CatalogItem.findById(req.params.itemId)
    } catch (err) {
        console.error(err)
        return res.send('Can\'t find the record.')
    }

    const filePath = path.resolve(`files/${item.imageUrl}`)

    try {
        await item.remove()
    } catch (err) {
        console.error(err)
        return res.send('Can\'t remove the record.')
    }

    await unlinkAsync(filePath)

    res.redirect(301, homeURL)
})

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})