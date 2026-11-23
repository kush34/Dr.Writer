/**
 * Deterministic checks on model output. Anything it reports is sent back to the model as feedback
 * on the next attempt, which is cheaper and more reliable than a second "critique" completion.
 */

const PLACEHOLDER = /lorem ipsum|\[(your|insert|company|name|date|placeholder)[^\]]*\]|<(your|insert)[^>]*>|as an ai (language )?model/i;
const CHATTY_START = /^\s*(sure|certainly|of course|here(?:'s| is| are))\b[^\n]{0,40}[:!]/i;
const LEADING_BULLET = /^\s*(?:[•◦▪●○‣⁃*-]|\d+[.)])\s+/;
const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

type SlideLike = { type: string; layout?: string; title?: string; body?: string; bullets?: string[]; table?: { header: string[]; rows: string[][] } };

/** Removes bullet glyphs the deck's own bullets would duplicate. Mutates the plan. */
export function cleanSlides<T extends SlideLike>(ops: T[]): T[] {
  for (const op of ops) {
    if (op.type !== "append") continue;
    if (op.bullets) op.bullets = op.bullets.map(item => item.replace(LEADING_BULLET, "").trim()).filter(Boolean);
    if (op.body) op.body = op.body.split("\n").map(line => line.replace(LEADING_BULLET, "").trim()).filter(Boolean).join("\n");
  }
  return ops;
}

export function lintSlides(ops: SlideLike[]): string[] {
  const problems: string[] = [];
  const titles = new Set<string>();
  ops.forEach((op, index) => {
    if (op.type !== "append") return;
    const at = `Operation ${index} ("${(op.title ?? "").slice(0, 40)}")`;
    const title = (op.title ?? "").trim().toLowerCase();
    if (words(op.title ?? "") > 12) problems.push(`${at}: title is longer than 12 words`);
    if (titles.has(title)) problems.push(`${at}: another new slide already has this title`);
    titles.add(title);
    const lines = [op.title ?? "", op.body ?? "", ...(op.bullets ?? []), ...(op.table ? [...op.table.header, ...op.table.rows.flat()] : [])];
    if (lines.some(line => PLACEHOLDER.test(line) || CHATTY_START.test(line))) problems.push(`${at}: contains placeholder or chatty text; write the real content`);
    if (op.bullets?.some(item => words(item) > 25)) problems.push(`${at}: a bullet is longer than 25 words; split it or shorten it`);
    if (op.bullets && op.bullets.length > 6) problems.push(`${at}: more than 6 bullets; split into two slides`);
    if (op.body && op.layout !== "title" && op.layout !== "section" && words(op.body) > 80) problems.push(`${at}: body text is a wall of text; use bullets of at most 12 words`);
  });
  return problems;
}

type DocOp = { type: string; markdown?: string; text?: string; blocks?: unknown[] };

export function lintDocumentOps(ops: DocOp[]): string[] {
  const problems: string[] = [];
  ops.forEach((op, index) => {
    if (op.type === "delete") return;
    const text = op.markdown ?? op.text;
    if (text === undefined) return;
    const at = `Operation ${index}`;
    if (!text.trim()) problems.push(`${at}: markdown is empty`);
    else if (PLACEHOLDER.test(text) || CHATTY_START.test(text)) problems.push(`${at}: contains placeholder or chatty text; write the real content`);
    if (/^\s*```(?:json|markdown|md)\s*\n[\s\S]*\n```\s*$/i.test(text)) problems.push(`${at}: the whole markdown is wrapped in a code fence; remove the fence`);
    if (/^\s*\{\s*"(operations|type)"/.test(text)) problems.push(`${at}: markdown contains JSON instead of document text`);
  });
  return problems;
}

export function assertClean(problems: string[]) {
  if (problems.length) throw new Error(`Fix these problems: ${problems.slice(0, 8).join("; ")}`);
}
