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

export type DocumentDTO = {
  _id: string;
  title: string;
  content: JSONContent;
  relatedImages?: RelatedImageDTO[];
  updatedAt?: string;
};
