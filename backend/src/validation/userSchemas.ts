import { z } from "zod";

export const firebaseTokenSchema = z.object({
  token: z.string().trim().min(1),
});
