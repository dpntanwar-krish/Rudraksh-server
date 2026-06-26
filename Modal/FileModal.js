const mongoose = require("mongoose");
var fileSchema = new mongoose.Schema;


var fileColSchema = {

    title: String,
    folder: { type: String, default: "gallery" },
    parentId: { type: String, default: null },
    sequence: { type: Number, default: 0 },
    imageUrl: String,
    public_id: String,
    resourceType: { type: String, default: "image" },
    mimeType: { type: String, default: "" },
    originalName: { type: String, default: "" },

};

var ver = {
  versionKey: false,
  timestamps: true,
};

var fileSchemaObj = new mongoose.Schema(fileColSchema, ver);

var FileRef = mongoose.model("FileCollection", fileSchemaObj);

module.exports = FileRef;
