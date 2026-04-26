import { Router } from "express";
import { registerUserRoutes } from "../Controllers/userController";

const userRouter = Router();

registerUserRoutes(userRouter);

export default userRouter;
