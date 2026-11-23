import { EventEmitter } from "node:events";

/**
 * Emitted with a document id whenever who can open it, or in what role, may have changed
 * (a collaborator was added, removed or re-roled, or the document was deleted).
 * The socket layer listens so live connections lose or change access immediately.
 */
export const documentAccessEvents = new EventEmitter();
export const documentAccessChanged = (documentId: string) => documentAccessEvents.emit("changed", documentId);
