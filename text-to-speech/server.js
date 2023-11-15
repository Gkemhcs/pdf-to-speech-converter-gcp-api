const functions=require("@google-cloud/functions-framework")
functions.http("speech_generator",async(req,res)=>{
    if(req.method=="POST"){
        const textToSpeech = require('@google-cloud/text-to-speech');
        const {Storage}=require("@google-cloud/storage")
        const storage=new Storage()
        const content=req.body.content
        const filename=req.body.filename.split(".")[0]+".mp3" 
        const bucket=req.body.bucket
        
        const util=require("util")
        const fs=require("fs")
        const speechClient = new textToSpeech.TextToSpeechClient()
        const request = {
            input: {text: content},
            // Select the language and SSML voice gender (optional)
            voice: {languageCode: 'en-US', ssmlGender: 'NEUTRAL'},
            // select the type of audio encoding
            audioConfig: {audioEncoding: 'MP3'},
          };
          const [response] = await speechClient.synthesizeSpeech(request);
          const writeFile = util.promisify(fs.writeFile);
          await writeFile(filename, response.audioContent, 'binary');
          console.log('Audio content written to file: output.mp3');
          generationMatchPrecondition = 0
          const fileoptions = {
            destination: filename,
          preconditionOpts: {ifGenerationMatch: generationMatchPrecondition},
          };
      
          await storage.bucket(bucket).upload(filename, fileoptions);
          console.log(`${filename} uploaded to ${bucket}`);
          const options = {
            version: 'v4',
            action: 'read',
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
          }; 
          const [url] = await storage
          .bucket(bucket)
          .file(filename)
          .getSignedUrl(options);
      
        console.log('Generated GET signed URL:');
        console.log(url);
      
           
          
          res.send("ok")

    }
})