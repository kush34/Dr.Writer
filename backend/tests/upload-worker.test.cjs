const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Document = require("../dist/Models/documentModel").default;
const database = require("../dist/Config/database");

// Loading the worker registers its process "message" handler; the test drives it by emitting that event.
test("a failed import stores a fixed user-safe message, not the parser error", async t => {
  t.mock.method(database, "default", async () => {});
  const update = t.mock.method(Document, "findByIdAndUpdate", async () => null);
  const sent = [];
  const originalSend = process.send; // undefined when not forked
  process.send = (message, callback) => { sent.push(message); callback?.(); };
  t.after(() => { process.send = originalSend; });
  const exited = new Promise(resolve => t.mock.method(process, "exit", code => resolve(code)));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "upload-worker-"));
  const file = path.join(dir, "bad.docx");
  fs.writeFileSync(file, "not a zip file at /srv/secret/path");

  const before = process.listeners("message").length;
  require("../dist/workers/documentUploadWorker");
  const handler = process.listeners("message")[before];
  t.after(() => process.removeListener("message", handler));
  process.emit("message", { documentId: "doc1", filePath: file, originalName: "bad.docx" });

  assert.equal(await exited, 1);
  const stored = update.mock.calls[0].arguments[1];
  assert.equal(stored.uploadStatus, "failed");
  assert.match(stored.uploadError, /Could not read this \.docx/);
  assert.doesNotMatch(stored.uploadError, /zip|secret|end of central/i);
  assert.equal(sent[0].type, "failed");
  assert.ok(sent[0].error, "the real error still goes to the server log through the parent");
  assert.equal(fs.existsSync(file), false);
});
