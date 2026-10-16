@echo off
set GOOGLE_APPLICATION_CREDENTIALS=c:\Users\User\OneDrive\Desktop\e-Commerce\backend\firebase-service-account.json
firebase deploy --only firestore:rules
