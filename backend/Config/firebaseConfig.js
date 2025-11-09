import admin from 'firebase-admin';
import serviceAccount from '../secret-file.json' with { type: "json" }; //for production

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.databaseURL 
});

export default admin;
