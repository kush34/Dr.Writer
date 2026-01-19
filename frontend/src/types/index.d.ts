import type { JSONContent } from "@tiptap/react";

export type DocumentDTO = {
  _id: string;
  title: string;
  content: JSONContent;
  updatedAt?: string;
};
