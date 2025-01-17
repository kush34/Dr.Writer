import express from 'express';
import admin from 'firebase-admin';
import User from '../Models/userModel.js'
const router = express.Router();

router.get("/", (req, res) => {
  res.send('hello from backend ....')
});

router.post("/firebaseTokenVerify", async (req,res)=>{
  const idToken = req.body.token;
  // console.log(idToken)
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    // console.log(decodedToken)
    const user = await User.findOne({email:decodedToken.email});
    // console.log(user);
    if(!user){
      console.log(`user not found...`)
      const newUser = await User.create({
        name: decodedToken.name,
        email: decodedToken.email,
      });
      console.log(`new user created =>`);
      // console.log(newUser);
    }
    res.status(200).send(decodedToken);
  } catch (error) {
    console.log(error)
    res.status(401).send({ error: 'Invalid token' });
  }
})

export default router