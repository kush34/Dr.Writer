import type { JSONContent } from "@tiptap/core"
import { AlignmentType, Document, ExternalHyperlink, HeadingLevel, ImageRun, Packer, Paragraph, TextRun } from "docx"

export async function createDocx(content: JSONContent): Promise<Blob> {
  const paragraphs: Paragraph[] = []
  const headings = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6] as const
  const alignments = { left: AlignmentType.LEFT, center: AlignmentType.CENTER, right: AlignmentType.RIGHT, justify: AlignmentType.JUSTIFIED }

  async function walk(node: JSONContent, list?: { type: string; level: number; index: number }, quote = false): Promise<void> {
    if (["doc", "blockquote", "bulletList", "orderedList", "taskList", "listItem", "taskItem"].includes(node.type || "")) {
      const listType = ["bulletList", "orderedList", "taskList"].includes(node.type || "") ? node.type : undefined
      let index = Number(node.attrs?.start) || 1
      for (const child of node.content || []) {
        await walk(child, listType ? { type: listType, level: list ? list.level + 1 : 0, index: index++ } : list, quote || node.type === "blockquote")
      }
      return
    }
    if (node.type === "image" && node.attrs?.src) {
      const response = await fetch(node.attrs.src)
      if (!response.ok) throw new Error("Could not load an image")
      const blob = await response.blob()
      const type = ({ "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/bmp": "bmp" } as const)[blob.type as "image/png"]
      if (!type) throw new Error(`Unsupported image type: ${blob.type}`)
      const image = new Image()
      image.src = node.attrs.src
      await image.decode()
      const scale = Math.min(1, 600 / image.naturalWidth)
      paragraphs.push(new Paragraph({ children: [new ImageRun({ type, data: new Uint8Array(await blob.arrayBuffer()), transformation: { width: Math.round(image.naturalWidth * scale), height: Math.round(image.naturalHeight * scale) } })] }))
      return
    }
    if (node.type === "horizontalRule") {
      paragraphs.push(new Paragraph({ text: "", border: { bottom: { style: "single", size: 6, color: "999999" } } }))
      return
    }
    if (!["paragraph", "heading", "codeBlock"].includes(node.type || "")) return
    const children: (TextRun | ExternalHyperlink)[] = []
    if (list) children.push(new TextRun(`${list.type === "orderedList" ? `${list.index}.` : list.type === "taskList" ? "☐" : "•"} `))
    for (const part of node.content || []) {
      if (part.type === "hardBreak") { children.push(new TextRun({ break: 1 })); continue }
      if (part.type !== "text") continue
      const marks = part.marks || []
      const has = (type: string) => marks.some((mark) => mark.type === type)
      const run = new TextRun({ text: part.text || "", bold: has("bold"), italics: has("italic"), strike: has("strike"), underline: has("underline") ? {} : undefined, superScript: has("superscript"), subScript: has("subscript"), font: has("code") || node.type === "codeBlock" ? "Courier New" : undefined, highlight: has("highlight") ? "yellow" : undefined })
      const link = marks.find((mark) => mark.type === "link")?.attrs?.href
      children.push(link ? new ExternalHyperlink({ link, children: [run] }) : run)
    }
    paragraphs.push(new Paragraph({ children, heading: node.type === "heading" ? headings[(node.attrs?.level || 1) - 1] : undefined, alignment: alignments[node.attrs?.textAlign as keyof typeof alignments], indent: list ? { left: 720 * (list.level + 1) } : quote ? { left: 720 } : undefined, spacing: node.type === "paragraph" ? { before: paragraphs.length && !list ? 300 : 0, after: 0, line: 384 } : undefined }))
  }
  await walk(content)
  return Packer.toBlob(new Document({ sections: [{ children: paragraphs }] }))
}
