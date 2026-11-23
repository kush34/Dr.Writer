# Dr.Writer Roadmap

Goal: a one-stop app for editing documents, PDFs, PPTX, Excel and canvas (Figma-like), with agentic workflows.

Evidence below was gathered by reading the code (not by running the app), against branch `feat/pptx`. File references may drift; re-check before acting on one.

## Where the app stands

- **Docs:** TipTap editor. AI edits go through numbered Markdown blocks, Zod validation, a lint pass, retries and a review step. DOCX and PDF export. Image upload via Cloudinary.
- **Slides:** PPTX editing via `@pptx-editor.dev` 0.6.0, with AI slide operations and the same lint and review pattern.
- **Platform:** Firebase auth, bring-your-own OpenRouter key, encrypted MCP config, chat sidebar with tool calls, landing page with SEO.
- **Missing:** PDF, Excel and canvas formats, real collaboration, comments, version history, billing.

The Docs and Slides AI pipeline is the strongest part. The sharing, collaboration and storage layers under it are the weakest, and every new format sits on top of them.

## Rule for "no half-built features"

Docs and Slides already follow a pattern: load, serialize for the LLM, schema-validated operations, lint, review, apply, export. This is the definition of done for any new format. A format does not ship until every step exists, including a checkpoint before each AI apply so the edit can be undone.

Every task below has a "Done when" line. A task is not finished until it holds.

---

## P0: make what the README already claims true and safe

| # | Task | Evidence | Done when |
|---|---|---|---|
| 1 | **Unmetered AI spend on the server key.** `getHeaders` falls back to `OPEN_ROUTER_API_KEY` when the user has no key. `performDocumentAction` never reads or decrements `token_balance`, unlike `streamUserPrompt`. | `backend/src/service/openrouter.ts:10`, `backend/src/Services/documentService.ts:209` | Every AI call is metered or blocked. A user without a key cannot run edits for free. |
| 2 | **Unauthenticated socket rooms.** Anyone who knows a document id can join its room and receive or push content. | `backend/src/index.ts:52-65` | The socket handshake verifies the Firebase token and checks document access before joining a room. |
| 3 | **Blind overwrites on text documents.** `updateDocument` and `syncDocument` overwrite with no version check (presentations have a `revision` check). Offline sync can overwrite a collaborator's edits. | `documentService.ts:132`, `:434` | Text saves carry a revision and return 409 on conflict. Offline sync handles conflicts without data loss. |
| 4 | **Shared documents do not appear on Home.** `getDocumentList` filters on `user_id` only, while search includes `users`. | `documentService.ts:91` | A "Shared with me" view appears on Home. |
| 5 | **No roles in sharing.** Sharing is a flat `users[]`. AI edits are owner-only, so collaborators get 403. | `documentService.ts:66`, `:205`, `:463` | Owner, editor, commenter and viewer roles exist, enforced server-side and in the UI. |
| 6 | **Missing basic document operations.** No delete-document route, no remove-collaborator route, no folders (`folder` appears only as a Cloudinary path). | `backend/src/Controllers/documentController.ts:225-292` | Delete (with confirmation), remove collaborator, and folders or tags. |
| 7 | **Rate limiting is crude.** One global limit of 100 requests per 15 min per IP covers everything, and `trust proxy` is not set, so behind a proxy all users share one IP. Autosave is off by default, but with it on a 1 s debounce can push active sessions into 429s. `/userprompt` is capped at 10 per 5 min, and the AI edit route has no dedicated limiter. | `backend/src/index.ts:17-38`, `documentController.ts:43` | Limits are per user, with separate buckets for AI, save and read. Proxy trust is configured. |
| 8 | **DOCX import is lossy and not durable.** `extractRawText` stores a plain string that `normalizeContent` later parses as HTML, so paragraph breaks and formatting are probably lost. The upload queue is in memory, so a restart leaves documents stuck at "queued". Multer has no size limit. | `backend/src/workers/documentUploadWorker.ts:41`, `backend/src/service/documentUploadQueue.ts:21`, `backend/src/service/multer.ts:13` | Import uses `mammoth.convertToHtml` mapped into TipTap JSON. A size cap exists. A durable queue recovers stuck jobs. |
| 9 | **Leftover test route.** `/getDoc` is unauthenticated and returns the document named in the `testFile` env var. | `documentController.ts:226` | Removed. |
| 10 | **Billing is a stub.** The `Plan` and `Usage` models are never exported or used. Token counts are `length/4` estimates. `Plans.tsx` shows plans that do not exist. | `backend/src/Models/usageModel.ts:29`, `planModel.ts:18`, `frontend/src/components/Plans.tsx` | Either real metering from provider-reported usage, or the plans page is hidden. |
| 11 | **README overclaims.** It advertises real-time collaboration, comments, permissions and folders. | `README.md` | The README matches what is real, or P0 finishes the claims. |
| 12 | **No CI.** No `.github` directory. Tests are 5 backend files and 1 frontend file. | repo root | CI runs lint, build and tests on every PR. |

## P1: foundations every new format depends on

1. **Version history and AI checkpoints.** A `versions` collection that snapshots before each AI apply. Done when AI edits are undoable after a reload and history can be browsed and restored.
2. **Move PPTX out of Mongo.** It is stored as base64 with a 6 MiB cap. Use object storage, a size policy per format, and keep the existing 409 conflict behaviour.
3. **Real text collaboration.** The socket relay is whole-document last-write-wins. Use Yjs with TipTap collaboration, with presence and cursors. Done when two people can type in the same paragraph without losing text.
4. **Decide the model for binary formats.** PPTX, Excel and PDF cannot merge. Choose an explicit edit lock or per-document revision conflicts. Do not pretend they are collaborative.
5. **Durable job queue** for imports, exports and long agent runs, with retries, status and cancel.
6. **One agent loop.** The MCP chat path and the document edit path are separate today. Merge them so one agent can read and edit documents, search, and call MCP tools across steps, with review before apply.
7. **Real usage metering and logging.** Replace the `length/4` estimate with provider-reported usage. Add structured logs and error tracking.

## P2: finish Docs and Slides before adding formats

- **Comments and suggestion mode.** AI edits arrive as suggestions, accepted or rejected per change.
- **AI operations for tables and images in Docs.** The slide pipeline already handles tables.
- **Import and export fidelity** for DOCX and PDF: styles, tables, images, headers and footers.
- **Slides gaps:** speaker notes, themes and layouts, AI image insertion, presenter mode, PPTX export fidelity checks. The editor is a third-party library at 0.6.0, so decide whether to depend on it long term.
- **Templates and a document gallery.**
- **Mobile and accessibility pass** on the editors.

## P3: new formats, one at a time, each gated on P1

Each needs all seven pattern steps before shipping. Libraries below are candidates to evaluate, not decisions.

1. **PDF.** Start with view, annotate, extract text and fill forms. Do not promise true text editing yet. Evaluate PDF.js vs pdf-lib.
2. **Excel.** Evaluate grid engines (for example Univer, Handsontable, AG Grid). Decide formula-engine scope up front, since that is where spreadsheet work gets large. AI operations would be cell and range edits.
3. **Canvas (Figma-like).** The largest item. Evaluate tldraw, Konva and Fabric. Decide the document model (scene graph), multiplayer (CRDT), and what the AI can do (create and move shapes, apply layout). Do not start before real collaboration (P1.3) exists.

## P4: cross-document agentic workflows

"Make a deck from this doc", "fill a sheet from these PDFs", reusable workflows, scheduled runs. Depends on the single agent loop (P1.6).

## Explicitly not building yet

True PDF text editing, spreadsheet formula parity with Excel, a plugin marketplace, a native mobile app, and billing tiers beyond metering.

## Suggested order

P0 items 1, 2 and 3 first (a cost leak, a data-exposure risk and a data-loss risk). Then 4, 5 and 6 so sharing works. Then P1.1 (checkpoints), since it makes every later AI feature safer.
