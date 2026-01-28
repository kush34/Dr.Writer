import express, { Request, Response } from 'express';
import admin from 'firebase-admin';
import User from '../Models/userModel'
import firebaseTokenVerify from '../Middlewares/firebaseTokenVerify';
const router = express.Router();

router.get("/", (req: Request, res: Response) => {
  res.send('hello from backend ....')
});

router.post("/firebaseTokenVerify", async (req: Request, res: Response) => {
  const idToken = req.body.token;
  // console.log(idToken)
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    // console.log(decodedToken)
    const user = await User.findOne({ email: decodedToken.email });
    // console.log(user);
    if (!user) {
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


router.get("/user", firebaseTokenVerify, async (req: Request, res: Response) => {
  try {
    const user_id = req.user_id;
    const dbUser = await User.findById(user_id).select("email name token_balance");
    res.send(dbUser);
  } catch (error) {
    console.log("ERROR GET /user", error)
    res.status(500).send({ message: "Could not get user" })
  }
})
export default router