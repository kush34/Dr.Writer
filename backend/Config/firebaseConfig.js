import admin from 'firebase-admin';
import serviceAccount from './secret-file.json' with { type: "json" };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.databaseURL // Replace with your project's database URL
});

export default admin;
