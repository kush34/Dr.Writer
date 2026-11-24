const { test } = require("node:test");
const assert = require("node:assert/strict");
// firebaseConfig initializes the Admin SDK on import; dummy values are enough because verification is mocked.
process.env.FIREBASE_PROJECT_ID ||= "test";
process.env.FIREBASE_CLIENT_EMAIL ||= "test@test.iam.gserviceaccount.com";
process.env.FIREBASE_PRIVATE_KEY ||= require("node:crypto").generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" });
const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const userService = require("../dist/Services/userService");
const queue = require("../dist/service/documentUploadQueue");
const { registerDocumentRoutes } = require("../dist/Controllers/documentController");

const uploadsDir = path.join(__dirname, "../uploads");
const listUploads = () => (fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : []);

const start = async t => {
  t.mock.method(userService, "verifyFirebaseTokenAndEnsureUser", async () => ({ decodedToken: { email: "a@example.com" }, user: { _id: "user1" } }));
  const app = express();
  const router = express.Router();
  registerDocumentRoutes(router);
  app.use("/api/document", router);
  const server = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)); });
  t.after(() => server.close());
  return `http://127.0.0.1:${server.address().port}/api/document`;
};
const post = (url, name, bytes) => {
  const form = new FormData();
  form.append("file", new Blob([bytes]), name);
  return fetch(`${url}/fileUpload`, { method: "POST", headers: { authorization: "Bearer t" }, body: form });
};

test("an oversized .docx is refused with 413 and nothing is left on disk or queued", async t => {
  const url = await start(t);
  const enqueue = t.mock.method(queue, "enqueueDocumentUpload", async () => ({ success: true }));
  const before = listUploads();
  const response = await post(url, "big.docx", Buffer.alloc(10 * 1024 * 1024 + 1024));
  assert.equal(response.status, 413);
  assert.match((await response.json()).message, /too large/i);
  assert.equal(enqueue.mock.callCount(), 0);
  assert.deepEqual(listUploads(), before, "multer removes the partial file");
});

test("a wrong file type is a 400, not a 500", async t => {
  const url = await start(t);
  const enqueue = t.mock.method(queue, "enqueueDocumentUpload", async () => ({ success: true }));
  const response = await post(url, "notes.txt", Buffer.from("hello"));
  assert.equal(response.status, 400);
  assert.match((await response.json()).message, /\.docx/);
  assert.equal(enqueue.mock.callCount(), 0);
});

test("a normal .docx upload is queued and answers 202", async t => {
  const url = await start(t);
  const enqueue = t.mock.method(queue, "enqueueDocumentUpload", async (userId, file) => { fs.unlinkSync(file.path); return { success: true, document: { _id: "d1" } }; });
  const response = await post(url, "ok.docx", Buffer.from("PK"));
  assert.equal(response.status, 202);
  assert.equal(enqueue.mock.callCount(), 1);
  assert.equal(enqueue.mock.calls[0].arguments[0], "user1");
});

test("an unexpected multer failure returns a fixed message, never multer's own text", async t => {
  const url = await start(t);
  const form = new FormData();
  form.append("unexpected_field", new Blob(["x"]), "a.docx"); // multer: LIMIT_UNEXPECTED_FILE
  const response = await fetch(`${url}/fileUpload`, { method: "POST", headers: { authorization: "Bearer t" }, body: form });
  assert.equal(response.status, 400);
  const { message } = await response.json();
  assert.equal(message, "Upload failed. Please try again.");
});
