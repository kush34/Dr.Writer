import mammoth from "mammoth";
import type { JSONContent } from "@tiptap/core";
import { htmlToTiptap } from "./htmlToTiptap";

/**
 * Reads a .docx into TipTap JSON, keeping paragraphs, headings, lists, quotes, links and basic marks.
 * Embedded images are dropped: mammoth would inline them as base64, which can push a document past
 * Mongo's 16 MB limit, and there is no import path to Cloudinary yet.
 */
export const docxToTiptap = async (buffer: Buffer): Promise<JSONContent> => {
  const { value } = await mammoth.convertToHtml(
    { buffer },
    {
      styleMap: ["u => u", "p[style-name='Quote'] => blockquote > p:fresh", "p[style-name='Intense Quote'] => blockquote > p:fresh"],
      convertImage: mammoth.images.imgElement(async () => ({ src: "" })),
    }
  );
  return htmlToTiptap(value);
};
