let express=require("express")
let EnquiryObj=require("../controller/Enquirycontroller")

let appRouter=express.Router()


appRouter.post("/Esave",EnquiryObj.Dosave)
appRouter.get("/Eall",EnquiryObj.Dofetchall)
module.exports=appRouter;