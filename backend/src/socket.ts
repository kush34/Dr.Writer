import type { Server } from "socket.io";
import { verifyFirebaseTokenAndEnsureUser } from "./Services/userService";
import { canEditRole, getDocumentData, getDocumentRole } from "./Services/documentService";
import { documentAccessEvents } from "./utils/documentAccessEvents";

/**
 * Socket handshake and room rules:
 * - The client must send a Firebase ID token in `auth.token`; otherwise the connection is refused.
 * - A socket joins a document room only when that user owns the document or is a collaborator.
 * - Messages are relayed only into rooms the sender has joined, so knowing a document id is not enough.
 * - Only the owner and editors may relay `text-changes`; viewers and commenters receive them read-only.
 * - When access changes (member removed, role changed, document deleted) live sockets are kicked or re-roled.
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

  // Re-checks every socket in the room against the current document, so a removed collaborator stops receiving content at once.
  documentAccessEvents.on("changed", async (documentId: string) => {
    try {
      for (const socket of await io.in(documentId).fetchSockets()) {
        try {
          const role = getDocumentRole(socket.data.userId, await getDocumentData(socket.data.userId, documentId));
          socket.data.canEdit = { ...socket.data.canEdit, [documentId]: canEditRole(role) };
        } catch {
          socket.leave(documentId);
          socket.emit("enter-denied", documentId);
        }
      }
    } catch (error) {
      console.error("Could not refresh socket access:", error);
    }
  });

  io.on("connection", socket => {
    socket.on("enter", async (_email: unknown, code: unknown) => {
      if (typeof code !== "string" || !code) return;
      try {
        const role = getDocumentRole(socket.data.userId, await getDocumentData(socket.data.userId, code));
        socket.data.canEdit = { ...socket.data.canEdit, [code]: canEditRole(role) };
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
      if (typeof code !== "string" || !socket.rooms.has(code) || !socket.data.canEdit?.[code]) return;
      socket.to(code).emit("text-changes", delta);
    });
  });
};
