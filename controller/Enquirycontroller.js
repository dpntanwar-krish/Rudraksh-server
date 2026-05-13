var config = require('../config/cloudinary');
var EnquiryColRef = require('../Modal/EnquiryModal');

async function Dosave(req, resp) {
    console.log(req.body);

    const payload = {
        fullname: req.body.fullname || req.body.fullName || "",
        email: req.body.email || "",
        phone: req.body.phone ? String(req.body.phone) : "",
        subject: req.body.subject || "General Enquiry",
        message: req.body.message || "",
    };

    var enquiryObj = new EnquiryColRef(payload);
    enquiryObj.save()
        .then((docu) => {
            console.log(docu);
            resp.json({ status: true, msg: docu });
        })
        .catch((err) => {
            resp.json({ status: false, msg: err.message });

        });
}
module.exports = { Dosave };
