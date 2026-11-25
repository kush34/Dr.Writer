const { test } = require("node:test");
const assert = require("node:assert/strict");
const EventEmitter = require("node:events");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const childProcess = require("node:child_process");
const Document = require("../dist/Models/documentModel").default;
const { enqueueDocumentUpload, recoverStuckUploads, processUploadQueue, MAX_UPLOAD_ATTEMPTS } = require("../dist/service/documentUploadQueue");

// An in-memory stand-in for the Document collection, covering only the calls the queue makes.
const fakeStore = (t, docs) => {
  const matches = (doc, filter) =>
    String(doc._id) === String(filter._id) &&
    (filter.uploadStatus === undefined || (filter.uploadStatus.$in ? filter.uploadStatus.$in.includes(doc.uploadStatus) : doc.uploadStatus === filter.uploadStatus));
  const query = value => ({ select: async () => value, then: (resolve, reject) => Promise.resolve(value).then(resolve, reject) });
  const apply = (doc, update) => {
    Object.assign(doc, update.$set ?? update);
    for (const [key, amount] of Object.entries(update.$inc ?? {})) doc[key] = (doc[key] ?? 0) + amount;
  };
  t.mock.method(Document, "findOneAndUpdate", (filter, update) => {
    const doc = docs.find(candidate => matches(candidate, filter));
    if (doc) apply(doc, update);
    return query(doc ?? null);
  });
  t.mock.method(Document, "findByIdAndUpdate", async (id, update) => {
    const doc = docs.find(candidate => String(candidate._id) === String(id));
    if (doc) apply(doc, update);
    return doc ?? null;
  });
  t.mock.method(Document, "find", () => query(docs.filter(doc => ["queued", "processing"].includes(doc.uploadStatus))));
  t.mock.method(Document, "create", async data => {
    const doc = { _id: `doc${docs.length + 1}`, uploadAttempts: 0, ...data };
    docs.push(doc);
    return { ...doc, _id: { toString: () => doc._id }, toObject: () => ({ ...doc }) };
  });
};

// `script` decides what each fake worker does: "complete" reports a result, "crash" exits without one.
const fakeWorkers = (t, docs, script) => {
  const sent = [];
  t.mock.method(childProcess, "fork", () => {
    const worker = new EventEmitter();
    worker.kill = () => {};
    worker.send = job => {
      const action = script(sent.length);
      sent.push(job);
      setImmediate(() => {
        if (action === "complete") {
          Object.assign(docs.find(doc => doc._id === job.documentId), { uploadStatus: "completed" });
          worker.emit("message", { type: "completed", documentId: job.documentId });
          worker.emit("exit", 0);
        } else if (action === "fail") {
          Object.assign(docs.find(doc => doc._id === job.documentId), { uploadStatus: "failed", uploadError: "bad file" });
          worker.emit("message", { type: "failed", documentId: job.documentId, error: "bad file" });
          worker.emit("exit", 1);
        } else if (action === "error") worker.emit("error", new Error("spawn ENOENT")); // no "exit" follows
        else worker.emit("exit", 137);
      });
    };
    return worker;
  });
  return sent;
};

const tempFile = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "upload-queue-"));
  const file = path.join(dir, "a.docx");
  fs.writeFileSync(file, "x");
  return file;
};

test("an upload is queued, processed and its server path is not returned to the client", async t => {
  const docs = [];
  fakeStore(t, docs);
  const sent = fakeWorkers(t, docs, () => "complete");
  const file = tempFile();
  const result = await enqueueDocumentUpload("user1", { path: file, originalname: "a.docx" });
  assert.equal(result.document.uploadFilePath, undefined);
  assert.equal(result.document.uploadAttempts, undefined);
  assert.equal(docs[0].uploadFilePath, file, "the path is stored for recovery");
  await processUploadQueue();
  assert.equal(sent.length, 1);
  assert.equal(docs[0].uploadStatus, "completed");
  assert.equal(docs[0].uploadAttempts, 1);
});

test("draining an empty queue at startup does not block later uploads", async t => {
  const docs = [];
  fakeStore(t, docs);
  const sent = fakeWorkers(t, docs, () => "complete");
  // Startup recovery calls this with nothing queued. It used to leave the queue permanently "busy".
  await processUploadQueue();
  await enqueueDocumentUpload("user1", { path: tempFile(), originalname: "a.docx" });
  await processUploadQueue();
  assert.equal(sent.length, 1, "the worker ran for the upload that arrived after the empty drain");
  assert.equal(docs[0].uploadStatus, "completed");
});

test("a worker that dies without a result is retried, then the import is failed after the attempt limit", async t => {
  const docs = [];
  fakeStore(t, docs);
  const sent = fakeWorkers(t, docs, () => "crash");
  const file = tempFile();
  await enqueueDocumentUpload("user1", { path: file, originalname: "a.docx" });
  await processUploadQueue();
  assert.equal(sent.length, MAX_UPLOAD_ATTEMPTS);
  assert.equal(docs[0].uploadStatus, "failed");
  assert.match(docs[0].uploadError, /upload the file again/);
  assert.equal(fs.existsSync(file), false, "the temp file is removed once we give up");
});

test("a worker that cannot be spawned (error, no exit) does not hang the queue", async t => {
  const docs = [];
  fakeStore(t, docs);
  const sent = fakeWorkers(t, docs, index => (index === 0 ? "error" : "complete"));
  await enqueueDocumentUpload("user1", { path: tempFile(), originalname: "a.docx" });
  await processUploadQueue(); // would never resolve before the fix
  assert.equal(sent.length, 2, "the failed spawn counted as an attempt and was retried");
  assert.equal(docs[0].uploadStatus, "completed");
  // And later uploads still run.
  await enqueueDocumentUpload("user1", { path: tempFile(), originalname: "b.docx" });
  await processUploadQueue();
  assert.equal(docs[1].uploadStatus, "completed");
});

test("fork throwing synchronously and a failed IPC send also settle the job", async t => {
  const docs = [];
  fakeStore(t, docs);
  t.mock.method(childProcess, "fork", () => { throw new Error("EMFILE"); });
  const file = tempFile();
  await enqueueDocumentUpload("user1", { path: file, originalname: "a.docx" });
  await processUploadQueue();
  assert.equal(docs[0].uploadStatus, "failed");
  assert.equal(docs[0].uploadAttempts, MAX_UPLOAD_ATTEMPTS);

  t.mock.restoreAll();
  const docs2 = [];
  fakeStore(t, docs2);
  t.mock.method(childProcess, "fork", () => {
    const worker = new EventEmitter();
    worker.kill = () => {};
    worker.send = (_job, callback) => callback(new Error("channel closed"));
    return worker;
  });
  await enqueueDocumentUpload("user1", { path: tempFile(), originalname: "b.docx" });
  await processUploadQueue();
  assert.equal(docs2[0].uploadStatus, "failed");
});

test("a crash followed by a success completes the import", async t => {
  const docs = [];
  fakeStore(t, docs);
  const sent = fakeWorkers(t, docs, index => (index === 0 ? "crash" : "complete"));
  await enqueueDocumentUpload("user1", { path: tempFile(), originalname: "a.docx" });
  await processUploadQueue();
  assert.equal(sent.length, 2);
  assert.equal(docs[0].uploadStatus, "completed");
});

test("a deliberate worker failure is not retried", async t => {
  const docs = [];
  fakeStore(t, docs);
  const sent = fakeWorkers(t, docs, () => "fail");
  await enqueueDocumentUpload("user1", { path: tempFile(), originalname: "a.docx" });
  await processUploadQueue();
  assert.equal(sent.length, 1);
  assert.equal(docs[0].uploadStatus, "failed");
});

test("a result that was written but never reported is not overwritten by a retry", async t => {
  const docs = [];
  fakeStore(t, docs);
  // The worker finishes the document, then exits before its message arrives.
  t.mock.method(childProcess, "fork", () => {
    const worker = new EventEmitter();
    worker.send = job => setImmediate(() => { docs.find(doc => doc._id === job.documentId).uploadStatus = "completed"; worker.emit("exit", 0); });
    return worker;
  });
  await enqueueDocumentUpload("user1", { path: tempFile(), originalname: "a.docx" });
  await processUploadQueue();
  assert.equal(docs[0].uploadStatus, "completed");
});

test("a document deleted while queued is skipped and its file removed", async t => {
  const docs = [];
  fakeStore(t, docs);
  const sent = fakeWorkers(t, docs, () => "complete");
  const file = tempFile();
  // The owner deletes the document right after it is created, before the queue claims it.
  const create = Document.create;
  t.mock.method(Document, "create", async data => { const doc = await create(data); docs.length = 0; return doc; });
  await enqueueDocumentUpload("user1", { path: file, originalname: "a.docx" });
  await processUploadQueue();
  assert.equal(sent.length, 0);
  assert.equal(fs.existsSync(file), false);
});

test("startup recovery requeues stuck imports and fails the ones that cannot be retried", async t => {
  const keep = tempFile();
  const exhausted = tempFile();
  const docs = [
    { _id: "queued", uploadStatus: "queued", uploadFilePath: keep, uploadAttempts: 0, sourceFileName: "keep.docx" },
    { _id: "midway", uploadStatus: "processing", uploadFilePath: keep, uploadAttempts: 1, sourceFileName: "mid.docx" },
    { _id: "lost", uploadStatus: "processing", uploadFilePath: "/nonexistent/file.docx", uploadAttempts: 1, title: "lost.docx" },
    { _id: "legacy", uploadStatus: "queued", uploadFilePath: null, uploadAttempts: 0, title: "old.docx" },
    { _id: "tired", uploadStatus: "processing", uploadFilePath: exhausted, uploadAttempts: MAX_UPLOAD_ATTEMPTS, title: "tired.docx" },
    { _id: "done", uploadStatus: "completed", uploadFilePath: null, uploadAttempts: 1 },
  ];
  fakeStore(t, docs);
  const sent = fakeWorkers(t, docs, () => "complete");
  const result = await recoverStuckUploads();
  assert.deepEqual(result, { requeued: 2, failed: 3 });
  await processUploadQueue();
  const status = Object.fromEntries(docs.map(doc => [doc._id, doc.uploadStatus]));
  assert.deepEqual(status, { queued: "completed", midway: "completed", lost: "failed", legacy: "failed", tired: "failed", done: "completed" });
  assert.deepEqual(sent.map(job => job.originalName), ["keep.docx", "mid.docx"]);
  assert.match(docs.find(doc => doc._id === "lost").uploadError, /lost during a restart/);
  assert.equal(fs.existsSync(exhausted), false);
});

test("the new import fields are hidden from normal reads", () => {
  assert.equal(Document.schema.path("uploadFilePath").options.select, false);
  assert.equal(Document.schema.path("uploadAttempts").options.select, false);
});
