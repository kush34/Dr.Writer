import User from '../Models/userModel';
import admin from "../Config/firebaseConfig";
import { NextFunction, Request,Response } from 'express';



const firebaseTokenVerify = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const idToken = req.headers.authorization?.split(' ')[1];
        // console.log(idToken);
        if (!idToken) {
            return res.status(401).json({ error: 'Unauthorized: No token provided' });
        }
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        // console.log(decodedToken)
        if (decodedToken) {
            const user = await User.findOne({ email: decodedToken.email });
            if (!user) {
                // console.log(`user not found...`)
                const newUser = await User.create({
                    name: decodedToken.name,
                    email: decodedToken.email,
                });
                req.user = decodedToken.email;
                req.user_id = newUser._id.toString();
                console.log(req.user);
                console.log(req.user_id);
                // console.log(`new user created =>`);
                // console.log(newUser);
            } else {
                req.user = decodedToken.email;
                req.user_id = user._id.toString();
            }
            next();
        }
        else {
            res.status(401).send("Invalid Token")
        }
    } catch (error) {
        console.log(error)
        res.status(401).send({ error: 'Invalid token' });
    }
}

export default firebaseTokenVerify;