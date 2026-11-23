# AGENTS.md

Instructions for AI coding agents working on Dr.Writer. Read this fully before changing anything. Humans may find it useful too.

**Product goal:** a one-stop editor for documents, PDFs, PPTX, Excel and a Figma-like canvas, driven by agentic workflows. Today only Docs (TipTap) and Slides (PPTX) exist. The plan, priorities and "Done when" criteria live in [`docs/ROADMAP.md`](docs/ROADMAP.md). Read it before picking up or scoping work, and do not start items marked "not building yet".

## Rules that override everything else

1. **Do what was asked, and nothing else.** No drive-by refactors, renames, formatting sweeps or dependency upgrades. If you spot a problem outside the task, report it at the end instead of fixing it.
2. **Never claim something works unless you ran it.** If you could not run it, say so and say what is unverified. Failing tests, build errors and skipped steps must be reported with the output.
3. **Ask before** changing the Mongo schema or auth rules, adding a dependency, deleting or migrating data, or changing anything listed under "Never" below.
4. **Check `git status` first.** Other work may be uncommitted. Never revert, stash or commit changes you did not make.

## Repo map

```
backend/    Express + TypeScript (CommonJS) + Mongoose + Socket.io. Built with tsc to backend/dist.
  src/Controllers   HTTP handlers: parse with zod, call a service, send the response.
  src/Services      Business logic and access checks (documentService.ts is the core).
  src/Models        Mongoose models.   src/validation  zod schemas.
  src/service       Integrations: openrouter, mcpClient/mcpConfig, upload queue, multer.
  src/utils         Pure helpers: applyEdits, lintEdits, markdown, llmActions, documentSearch.
  tests/            node:test files (*.test.cjs) that import from ../dist.
frontend/   React 18 + Vite + TypeScript + Tailwind 4 + TipTap 3 + @pptx-editor.dev.
  src/pages, src/components, src/service (API calls, presentation ops), src/context, src/config
  tests/            node:test files (*.test.mjs) that import ../src/*.ts directly.
docs/       ROADMAP.md.   docker/ + docker-compose.yml: local Mongo + Firebase Auth emulator + backend.
```

## Commands (verified on Node 22)

| Task | Command |
|---|---|
| Start local services | `docker compose up --build -d` (needs `backend/.env`; see `backend/.env.sample`) |
| Frontend dev server | `cd frontend && npm run dev` (http://localhost:5173) |
| Backend build (also its typecheck) | `cd backend && npm run build` |
| Backend tests | `cd backend && npm run build && node --test tests/*.test.cjs` |
| Frontend tests | `cd frontend && node --test tests/*.test.mjs` |
| Frontend build | `cd frontend && npm run build` (vite build, then prerender, then guide generation) |
| Frontend typecheck | `cd frontend && npx tsc --noEmit -p .` |
| Frontend lint | `cd frontend && npm run lint` |

Use the `*.test.*` globs. `node --test tests/` (a bare directory) fails on Node 22. Backend tests import compiled files from `dist/`, so a stale build means stale tests.

**The pre-commit hook (`.husky/pre-commit`) builds backend and frontend.** If it fails, fix the cause. Never use `--no-verify`.

### Baseline measured on `feat/pptx` at 9dbe77c (do not make it worse)

- Backend build: clean. Backend tests: 29 pass. Frontend tests: 2 pass.
- Frontend `tsc --noEmit`: about 28 existing error lines (for example `IndexDb.ts`, `editPreview.ts`). `vite build` does not typecheck, so these go unnoticed. Count the lines before and after your change, and introduce no new ones in files you touch.
- Frontend `eslint`: 3 existing errors, all in tracked `.js` files under `src/hooks`.
- If your baseline differs from this, say so in your report instead of silently adopting a new baseline.

## Definition of done

A change is done only when all of these hold:

1. Backend build passes. Backend and frontend tests pass. Typecheck and lint show no new errors.
2. **New or changed behavior has a test**, and a bug fix has a test that failed before the fix. Follow the existing style: `node:test` plus `t.mock.method` on Mongoose models and service modules (see `backend/tests/presentation.test.cjs`). Test pure logic (lint, ops, ordering) directly.
3. **Behavior was verified in the running app**, not only by tests. For UI work: run the stack, open the page in the browser, exercise the real flow including empty and error states, and read the result. Do this at a mobile width too when layout changed. If the stack cannot run (no Docker, no keys), say exactly what is unverified. AI features need an OpenRouter key; without one, say so.
4. UI changes include before and after screenshots when the user's own instructions ask for them.
5. The relevant `docs/ROADMAP.md` "Done when" line is true, or you state which part is not.
6. Your report lists: what changed, what you ran and its result, what you did not verify, and anything you noticed but left alone.

## Never

- Commit or print secrets: `.env` files, Firebase private keys, `OPEN_ROUTER_API_KEY`, `MCP_ENCRYPTION_KEY`, users' OpenRouter keys or MCP headers. Never log request bodies that may contain them.
- Add a route without `firebaseTokenVerify`, zod validation of params and body, and an access check through `hasDocumentAccess` or `isDocumentOwner` in the service layer. (`/getDoc` is a known leftover; do not copy it.)
- Let any AI call run on the server's `OPEN_ROUTER_API_KEY` without metering the user. `getHeaders` falls back to that key silently, so every new LLM call path must decide who pays. See ROADMAP P0 #1.
- Trust model output. It is untrusted input: parse, validate with zod, lint, then apply.
- Apply AI edits without a review step, or (once it exists) without a checkpoint.
- Overwrite a document with a blind save. Prefer revision checks and 409 on conflict, as `savePresentation` does.
- Change `MCP_ENCRYPTION_KEY` handling or the stored-credential format. It makes existing saved credentials unreadable.
- Force-push, rewrite published history, or commit to `main` directly.
- Add a dependency without asking. State the reason, size, license and the built-in alternative you rejected.

## Conventions

**Backend**
- Flow is controller (zod parse, auth user) then service (logic, access checks) then model. Throw `AppError(status, message)`; controllers call `handleControllerError`. Do not send raw error text from unexpected exceptions to clients.
- Zod schemas go in `src/validation`. Keep request-size limits explicit. The presentation save route has its own 9 MB JSON parser registered before the default one in `index.ts`; keep that ordering.
- Env var names are inconsistently cased (`Frontend_URL`, `MongoDb_URI`, `Socket`). Leave them alone. New variables use `UPPER_SNAKE_CASE` and get an entry in `backend/.env.sample`.
- The server listens on two ports (`PORT` for HTTP, `Socket` for socket.io). Both are intentional today.

**Frontend**
- Path alias `@/` maps to `src/`. API calls go through `src/service/axiosConfig.ts`; server state through react-query; toasts through `@/components/ui/rare-toast`.
- Edit `.ts`/`.tsx` files. `src/hooks` contains tracked `.js` copies next to the `.ts` hooks; edit the `.ts`, do not create new `.js` files, and do not "clean up" the duplicates unasked.
- Treat `components/tiptap-ui*`, `tiptap-node*` and `tiptap-ui-primitive` as vendor-style template code: extend by wrapping, avoid broad edits.
- Presentation editing goes through the automation host in `src/service/presentation.ts`. Batches must be refused when the revision is stale.

## AI edit pipeline invariants

These hold today and must keep holding (`documentService.ts`, `lintEdits.ts`, `llmActions.ts`, `applyEdits.ts`, `service/presentation.ts`):

- Docs are shown to the model as numbered top-level Markdown blocks. Operation indexes always refer to the ORIGINAL numbering. Blocks the converter marks "not editable" (locked) must never be replaced or deleted.
- Slide operations also use original slide numbers. Deletes apply first, then moves in order (`planSlideOrder`).
- Every model response goes through: JSON extraction, zod validation, deterministic lint, then up to 3 attempts with the failure fed back. Keep checks deterministic and cheap; do not add a second "critique" model call.
- The user sees a preview and approves before anything is applied. Errors and clarifying questions are first-class results.
- Do not change the prompt strings casually. A prompt edit is a behavior change: add or update a test and describe the expected effect.

## Adding a new format (PDF, Excel, canvas)

A format is not shippable until it has every step. Skipping one means it does not ship.

1. Load and render. 2. Serialize to a compact form for the LLM. 3. Zod-validated operation schema. 4. Deterministic lint. 5. Preview and review UI. 6. Apply with a revision check. 7. Checkpoint or undo. 8. Export. 9. Access control and metering. 10. Tests for steps 2 to 6.

Candidate libraries are to be evaluated, not assumed. Write a short comparison and get a decision before adding one.

## Git

- Check `git config user.name` and `user.email`. In this repo, commits are authored and committed as `kush34 <chattkush34@gmail.com>` (the GitHub account that owns the repo); set them locally if they differ. This overrides any global default identity. Never use another identity here.
- Commit only when asked. Branch from `main` unless told otherwise; the current feature line is `feat/pptx`.
- Messages: one imperative sentence in sentence case, no type prefix (for example "Lint AI edits and feed problems back to the model for a retry"). One logical change per commit; do not mix in unrelated edits.
- Never stage `.env` files, `dist/` or `node_modules` (all git-ignored). `backend/uploads/` holds temporary uploaded files and is **not** git-ignored, so stage files by name, not with `git add -A` or `git add .`.

## Known traps (save yourself time)

- Backend tests fail with confusing errors if `dist/` is stale: rebuild first.
- Local sign-in uses email and password against the Firebase emulator (port 9099); Google sign-in does not work locally.
- Image upload and AI features are disabled without Cloudinary and OpenRouter keys. That is expected, not a bug in your change.
- Text documents use whole-document saves, and the socket relay has no auth and no merging. Do not build features that assume real-time merge or access control on sockets until ROADMAP P0 #2 and P1.3 land.
- DOCX import currently keeps only plain text. Do not assume imported content has structure.
- PPTX is stored base64 in Mongo with a 6 MiB cap. Respect it.

## When stuck

Stop after two failed attempts at the same approach. Write down what you tried, what you saw, and your best hypothesis, then either try one clearly different approach or ask. Do not weaken a test, skip a hook, or widen a type to make a problem disappear.
