const {DocumentProcessorServiceClient} = require('@google-cloud/documentai').v1;

// Instantiates a client
const documentaiClient = new DocumentProcessorServiceClient();

  async function create_processor(){
    const request={
        parent:`projects/${process.env.PROJECT_ID}/locations/us`,processor:{
            name: "summary",type:"SUMMARY_PROCESSOR",displayName:"nodejsprocessor"
        }
       
   }
   const response = await documentaiClient.createProcessor(request);
   console.log(response[0].name);
  }
  create_processor()