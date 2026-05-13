var mongoose = require("mongoose");

var EnquirySchema = mongoose.Schema;

var EnquiryColSchema = {
  fullname: String,
  // keep email indexed, but do not force unique: same user may submit multiple enquiries
  email: { type: String, required: true, index: true },
  // keep phone as string to preserve leading zeros and avoid cast errors
  phone: String,
  subject: String,
  message: String,
};

var ver = {
  versionKey: false,
};

var EnquiryColSchemaObj = new EnquirySchema(EnquiryColSchema, ver);

var EnquiryRef = mongoose.model("EnquiryCollection", EnquiryColSchemaObj);

module.exports = EnquiryRef;
