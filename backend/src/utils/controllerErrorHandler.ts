import { Response } from "express";
import { ZodError } from "zod";
import { isAppError } from "./appError";

export const handleControllerError = (res: Response, error: unknown) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: "Invalid request data",
      errors: error.flatten(),
    });
  }

  if (isAppError(error)) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  console.error(error);
  return res.status(500).json({ message: "Something went wrong" });
};
