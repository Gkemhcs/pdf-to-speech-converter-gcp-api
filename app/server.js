const {Storage}=require("@google-cloud/storage")
const storage=new Storage()
const axios=require("axios")

const express=require("express")
const app=express()
const AUTH_SERVER=process.env.AUTH_SERVER+"/verify"
app.use(express.json())
app.get("/",async(req,res)=>{
  console.log("request headers:-",req.headers)
  const authHeader=req.headers && req.headers['authorization']
  if(!authHeader) res.status(401).json({message:"PLEASE ENTER YOUR TOKEN IN AUTHORIZATION HEADER"})

  const token=authHeader.split(" ")[1]
const response=await axios({method:"POST",url:AUTH_SERVER,data:{accessToken:token},headers:{'Content-Type':'application/json'}})
if(response.data.status=="authorized"){
 
  res.json({msg:"you are authorized"})
}
else{
   res.json({message:"please enter valid jwt access token"})
}
})
app.post("/upload",async(req,res)=>{
    const options = {
        version: 'v4',
        action: 'write',
        expires: Date.now() + 5 * 60 * 1000, // 5 minutes
        contentType: 'application/octet-stream',
      };
      console.log("headers:- ",req.headers)
      const authHeader=req.headers && req.headers['x-forwarded-authorization']
      if(!authHeader) res.status(401).json({message:"PLEASE ENTER YOUR TOKEN IN AUTHORIZATION HEADER"})

      const token=authHeader.split(" ")[1]
    const response=await axios({method:"POST",url:AUTH_SERVER,data:{accessToken:token},headers:{'Content-Type':'application/json'}})
    console.log(response.data)
    if(response.data.status=="authorized"){
      console.log(response.data)
      const filename="api"+Date.now()+".pdf"
     
      console.log("filename:",filename)
      console.log("bucket "+process.env.GOOGLE_CLOUD_STORAGE_BUCKET)
        const signedUrl=await storage.bucket(process.env.GOOGLE_CLOUD_STORAGE_BUCKET).file(filename).getSignedUrl(options)
      res.json({url:signedUrl,msg:"PLEASE MAKE A PUT CURL REQUEST TO UPLOAD THE FILE"})
    }
    else{
       res.json({message:"please enter valid jwt access token"})
    }
      
})
app.listen(8080,()=>{
    console.log("server started")
})