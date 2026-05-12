var config = require('../config/cloudinary');
var EnquiryColRef = require('../Modal/EnquiryModal');

async function Dosave(req, resp) {
      console.log(req.body);
    
    var enquiryObj = new EnquiryColRef(req.body);
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
