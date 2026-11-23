import type { JSONContent } from "@tiptap/react";

export type RelatedImageDTO = {
  publicId: string;
  url: string;
  originalName: string;
  bytes: number;
  format?: string;
  width?: number;
  height?: number;
  uploadedAt: string;
};

export type DocumentRole = "owner" | "editor" | "commenter" | "viewer";

export type DocumentDTO = {
  /** The signed-in user's role on this document. Only owners and editors may change it. */
  role?: DocumentRole;
  kind?: "presentation" | "document";
  pptx?: string;
  revision?: number;
  /** An offline copy that could not be synced because the server document changed. */
  offlineConflict?: { title: string; newContent: JSONContent; revision?: number };
  _id: string;
  title: string;
  content: JSONContent;
  relatedImages?: RelatedImageDTO[];
  updatedAt?: string;
};
