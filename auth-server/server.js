const express=require("express")
const app=express()
const jwt=require("jsonwebtoken")
const bodyParser=require("body-parser")
app.use(express.json())
app.use(bodyParser.json())
require("dotenv").config()


function verify_jwt_token(token){
 return jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,data)=>{

    if(err) return {status:"invalid token"}
    else{
        
        console.log("user",data.user)
    return {status:"authorized",user:data.user}}
})
}
app.post("/login",(req,res)=>{
  const accessToken = jwt.sign({user:req.body.user},process.env.ACCESS_TOKEN_SECRET)
   res.json({token:accessToken})
})
app.post("/verify",async(req,res)=>{
  
    const accessToken=req.body.accessToken
    const response=await verify_jwt_token(accessToken)

    res.json(response)

})
app.listen(8080,()=>{
    console.log("server started")
})