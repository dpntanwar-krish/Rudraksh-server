var mongoose = require("mongoose");

var EnquirySchema = mongoose.Schema;

var EnquiryColSchema = {
  fullname: String,
  email: { type: String, required: true, index: true, unique: true },
  phone: Number,
  subject: String,
  message: String,
};

var ver = {
  versionKey: false,
};

var EnquiryColSchemaObj = new EnquirySchema(EnquiryColSchema, ver);

var EnquiryRef = mongoose.model("EnquiryCollection", EnquiryColSchemaObj);

module.exports = EnquiryRef;