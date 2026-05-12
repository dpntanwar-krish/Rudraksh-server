const mongoose = require("mongoose");
var fileSchema = new mongoose.Schema;


var fileColSchema = {

    title: String,
    imageUrl: String,
    public_id: String,

};

var ver = {
  versionKey: false,
  timestamps: true,
};

var fileSchemaObj = new mongoose.Schema(fileColSchema, ver);

var FileRef = mongoose.model("FileCollection", fileSchemaObj);

module.exports = FileRef;
