const mongoose = require('mongoose')
const { Schema } = mongoose

const catalogItemSchema = new Schema({
    title: String,
    imageUrl: String,
    date: { type: Date, default: Date.now }
})

const CatalogItem = mongoose.model('CatalogItem', catalogItemSchema)
module.exports = CatalogItem