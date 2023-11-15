const functions=require("@google-cloud/functions-framework")
async function converter(data) {
  const {GoogleAuth} = require('google-auth-library');
    const auth = new GoogleAuth();
  url=process.env.SPEECH_TO_TEXT_CONVERTER
  console.info(`request ${url} with target audience ${url}`);
  const authClient = await auth.getIdTokenClient(url);

  const res = await authClient.request({url,method:"POST",body: JSON.stringify(data),
  headers: {
    'Content-Type': 'application/json',
  }});
  console.info(res.data);
  console.log("function completed")
}
functions.cloudEvent("summarizer",async(cloudEvent)=>{
    
    const {DocumentProcessorServiceClient} = require('@google-cloud/documentai').v1;
        const data=cloudEvent.data 
        const filename=data.name 
        const bucket=data.bucket
       file=`gs://${bucket}/${filename}`
      const client = new DocumentProcessorServiceClient();
   //   const name=`projects/${process.env.GOOGLE_CLOUD_PROJECT}/locations/us/processors/${process.env.PROCESSOR_ID}`
    const  name=process.env.PROCESSOR
   
     
       
          const request = {
              name,
             
          gcsDocument: {
                gcsUri: file,
                
                mimeType: 'application/pdf',
              },
            };
            const arr=[]
            const [result] = await client.processDocument(request);
            const {document} = result;
            const {text} = document;
            const getText = textAnchor => {
              if (!textAnchor.textSegments || textAnchor.textSegments.length === 0) {
                return '';
              }
          
              // First shard in document doesn't have startIndex property
              const startIndex = textAnchor.textSegments[0].startIndex || 0;
              const endIndex = textAnchor.textSegments[0].endIndex;
          
              return text.substring(startIndex, endIndex);
            };
          
            // Read the text recognition output from the processor
          
            const [page1] = document.pages;
            const {paragraphs} = page1;
          
            for (const paragraph of paragraphs) {
              const paragraphText = getText(paragraph.layout.textAnchor);
              
             // console.log(`${paragraphText}`);
              arr.push(paragraphText)
              
           
          }
          console.log("generated text:-",arr.join(" "))
       const outtext=arr.join(" ")
        const resdata={content:outtext,filename:filename,bucket:bucket}
         converter(resdata)
      
     
    })
