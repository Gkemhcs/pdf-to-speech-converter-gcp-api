#! /bin/bash
echo "ENTER THE GOOGLE CLOUD PROJECT ID:-"
read PROJECT_ID
# ENABLING  THE SERVICES
gcloud config set project $PROJECT_ID
gcloud services enable cloudfunctions.googleapis.com \
run.googleapis.com cloudbuild.googleapis.com \
apigateway.googleapis.com documentai.googleapis.com cloudresourcemanager.googleapis.com \
texttospeech.googleapis.com pubsub.googleapis.com eventarc.googleapis.com \
iamcredentials.googleapis.com
servicemanagement.googleapis.com servicecontrol.googleapis.com 
# CREATING THE SERVICE ACCOUNTS FOR CLOUD FUNCTIONS 
export GCS_SA=$(gsutil kms serviceaccount)
gcloud iam service-accounts create eventarc-sa
gcloud iam service-accounts create  converter-sa 
gcloud iam service-accounts create summary-sa
gcloud iam service-accounts create  frontend-api 
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format "value(projectNumber)")
export PUBSUB_SA="service-${PROJECT_NUMBER}@gcp-sa-pubsub.iam.gserviceaccount.com"

#ADDING IAM POLICY BINDINGS

gcloud projects add-iam-policy-binding $PROJECT_ID \
--member "serviceAccount:${GCS_SA}" \
--role roles/pubsub.publisher
gcloud projects add-iam-policy-binding $PROJECT_ID \
--member "serviceAccount:${PUBSUB_SA}" \
--role roles/iam.serviceAccountTokenCreator
gcloud projects add-iam-policy-binding $PROJECT_ID \
--member "serviceAccount:eventarc-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
--role roles/eventarc.eventReceiver
gcloud projects add-iam-policy-binding $PROJECT_ID \
--member "serviceAccount:eventarc-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
--role roles/run.invoker
gcloud projects add-iam-policy-binding $PROJECT_ID \
--member "serviceAccount:summary-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
--role roles/run.invoker
gcloud projects add-iam-policy-binding $PROJECT_ID \
--member "serviceAccount:frontend-api@${PROJECT_ID}.iam.gserviceaccount.com" \
--role roles/iam.serviceAccountTokenCreator
gcloud projects add-iam-policy-binding $PROJECT_ID \
--member "serviceAccount:converter-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
--role roles/iam.serviceAccountTokenCreator
gcloud projects add-iam-policy-binding $PROJECT_ID \
--member "serviceAccount:frontend-api@${PROJECT_ID}.iam.gserviceaccount.com" \
--role roles/storage.admin
gcloud projects add-iam-policy-binding $PROJECT_ID \
--member "serviceAccount:converter-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
--role roles/storage.admin
gcloud projects add-iam-policy-binding $PROJECT_ID \
--member "serviceAccount:summary-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
--role roles/storage.admin
gcloud projects add-iam-policy-binding $PROJECT_ID \
--member "serviceAccount:summary-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
--role roles/documentai.apiUser
#CREATING THE CLOUD RUN SERVICES
cd auth-server
# CREATING THE AUTHENTICATION SERVER FOR GENERATING AND VERIFYING JWTS 
gcloud run deploy auth-server --region us-central1 \
--source . \
--allow-unauthenticated

cd ../app
# CREATING THE BUCKET TO STORE APP MEDIA
GCS_BUCKET=$PROJECT_ID-api
gsutil mb -l us-central1 gs://$GCS_BUCKET
AUTH_SERVER_URL=$(gcloud run services describe auth-server --region  us-central1 --format "value(status.address.url)")
gcloud run deploy frontend-api --region us-central1 \
--source . \
--service-account frontend-api@$PROJECT_ID.iam.gserviceaccount.com \
--set-env-vars AUTH_SERVER=$AUTH_SERVER_URL,GOOGLE_CLOUD_STORAGE_BUCKET=$GCS_BUCKET \
--allow-unauthenticated
API_SERVER_URL=$(gcloud run services describe frontend-api --region  us-central1 --format "value(status.address.url)")
cd ../text-to-speech
gcloud  functions deploy converter --region=us-central1 --entry-point=speech_generator \
--runtime=nodejs20 --source=. --ignore-file=.gitignore \
--gen2 --trigger-http --no-allow-unauthenticated \
--service-account converter-sa@${PROJECT_ID}.iam.gserviceaccount.com \
--max-instances 3
cd ../create-processor
npm i
node server.js
cd ../pdf-content-extractor
#NOTE THE PROCESS GENERATED HERE AND COPY IT TO ENTER 
echo "ENTER THE PROCESSOR"
read PROCESSOR
CONVERTER_URL=$(gcloud functions describe converter --region us-central1 --format "value(url)")
gcloud functions deploy summary-generator --region us-central1 \
--gen2 --runtime nodejs20 --trigger-bucket $GCS_BUCKET \
--service-account summary-sa@${PROJECT_ID}.iam.gserviceaccount.com \
--trigger-service-account eventarc-sa@${PROJECT_ID}.iam.gserviceaccount.com \
--entry-point summarizer --source . \
--set-env-vars PROCESSOR=$PROCESSOR,SPEECH_TO_TEXT_CONVERTER=$CONVERTER_URL  \
--max-instances 3
cd ../gateways
sed -i "s/AUTH_SERVER/${AUTH_SERVER_URL}/g" openapi.yaml
sed -i "s/API_SERVER/${API_SERVER_URL}/g" openapi.yaml
gcloud api-gateways apis create gcp-api --display-name API FOR MY PROJECT 
gcloud api-gateways api-configs create config-1 --api gcp-api  --openapi-spec openapi.yaml
gcloud api-gateways gateways create gateway-us --location us-central1 \
--api-config config-1 --api gcp-api 
export URL=https://$(gcloud api-gateway gateways describe gateway-us --location us-central1 --format "value(defaultHostname)")
echo "THE GATEWAY URL IS:-   ${URL}"