export function documentText(content: unknown): string {
  if (typeof content === "string") {
    try {
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === "object") return documentText(parsed);
    } catch { /* Plain text or HTML. */ }
    return content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
  const parts: string[] = [];
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const item = node as { text?: unknown; content?: unknown };
    if (typeof item.text === "string") parts.push(item.text);
    if (Array.isArray(item.content)) item.content.forEach(visit);
  };
  visit(content);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function searchExcerpt(text: string, query: string): string | null {
  const index = text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  if (index < 0) return null;
  const start = Math.max(0, index - 60);
  const end = Math.min(text.length, index + query.length + 100);
  return `${start ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}
