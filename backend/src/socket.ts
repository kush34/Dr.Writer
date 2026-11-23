import type { Server } from "socket.io";
import { verifyFirebaseTokenAndEnsureUser } from "./Services/userService";
import { getDocumentData } from "./Services/documentService";

/**
 * Socket handshake and room rules:
 * - The client must send a Firebase ID token in `auth.token`; otherwise the connection is refused.
 * - A socket joins a document room only when that user owns the document or is in its `users` list.
 * - Messages are relayed only into rooms the sender has joined, so knowing a document id is not enough.
 */
export const registerSocket = (io: Server) => {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== "string" || !token) return next(new Error("Authentication required"));
    try {
      const { user } = await verifyFirebaseTokenAndEnsureUser(token);
      socket.data.userId = user._id.toString();
      socket.data.email = user.email;
      next();
    } catch {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", socket => {
    socket.on("enter", async (_email: unknown, code: unknown) => {
      if (typeof code !== "string" || !code) return;
      try {
        await getDocumentData(socket.data.userId, code);
      } catch {
        // Not found, malformed id or no access: stay out of the room without revealing which.
        socket.emit("enter-denied", code);
        return;
      }
      socket.join(code);
      // The sender's identity comes from the verified token, never from the client.
      socket.to(code).emit("enter", socket.data.email, code);
    });

    socket.on("text-changes", (delta: unknown, code: unknown) => {
      if (typeof code !== "string" || !socket.rooms.has(code)) return;
      socket.to(code).emit("text-changes", delta);
    });
  });
};
