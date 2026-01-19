import { Request } from "express";

declare module "express-serve-static-core" {
  interface Request {
    user?: string;
    user_id?: string;
    file?: Express.Multer.File;
    files?: Express.Multer.File[];
  }
}