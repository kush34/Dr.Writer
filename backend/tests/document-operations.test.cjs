const { test } = require("node:test");
const assert = require("node:assert/strict");
const Document = require("../dist/Models/documentModel").default;
const Chat = require("../dist/Models/chatModel").default;
const cloudinary = require("../dist/Config/cloudinary").default;
const { documentAccessEvents } = require("../dist/utils/documentAccessEvents");
const { setTagsSchema, documentActionParamsSchema } = require("../dist/validation/documentSchemas");
const { setDocumentTags, deleteDocument } = require("../dist/Services/documentService");

const stored = extra => ({ _id: "doc", kind: "document", user_id: "owner", users: ["editor"], commenters: ["commenter"], viewers: ["viewer"], title: "T", revision: 4, tags: [], relatedImages: [], ...extra });

const mockStore = (t, doc) => {
  t.mock.method(Document, "findById", async () => doc);
  const updates = t.mock.method(Document, "updateOne", async (filter, change) => { Object.assign(doc, change.$set); return { modifiedCount: 1 }; });
  const removed = t.mock.method(Document, "deleteOne", async () => ({ deletedCount: 1 }));
  const chats = t.mock.method(Chat, "deleteMany", async () => ({ deletedCount: 2 }));
  return { updates, removed, chats };
};

test("tag input is trimmed, bounded and unique ignoring case", () => {
  assert.deepEqual(setTagsSchema.parse({ tags: [" work ", "Plan"] }).tags, ["work", "Plan"]);
  assert.ok(setTagsSchema.safeParse({ tags: [] }).success);
  assert.ok(!setTagsSchema.safeParse({ tags: ["a", "A"] }).success);
  assert.ok(!setTagsSchema.safeParse({ tags: ["   "] }).success);
  assert.ok(!setTagsSchema.safeParse({ tags: ["x".repeat(31)] }).success);
  assert.ok(!setTagsSchema.safeParse({ tags: Array.from({ length: 11 }, (_, i) => `t${i}`) }).success);
  assert.ok(!setTagsSchema.safeParse({ tags: "work" }).success);
  assert.ok(!documentActionParamsSchema.safeParse({}).success);
});

test("the owner and editors can set tags, and that never bumps the revision or touches content", async t => {
  const doc = stored();
  const { updates } = mockStore(t, doc);
  assert.deepEqual(await setDocumentTags("owner", "doc", ["a"]), ["a"]);
  assert.deepEqual(await setDocumentTags("editor", "doc", ["a", "b"]), ["a", "b"]);
  assert.deepEqual(doc.tags, ["a", "b"]);
  for (const [, change] of updates.mock.calls.map(call => call.arguments)) {
    assert.deepEqual(Object.keys(change), ["$set"]);
    assert.deepEqual(Object.keys(change.$set), ["tags"]);
  }
  assert.equal(doc.revision, 4);
});

test("commenters, viewers and outsiders cannot set tags", async t => {
  const doc = stored();
  const { updates } = mockStore(t, doc);
  for (const user of ["commenter", "viewer", "outsider"]) {
    await assert.rejects(setDocumentTags(user, "doc", ["x"]), { statusCode: 403 });
  }
  assert.equal(updates.mock.callCount(), 0);
  assert.deepEqual(doc.tags, []);
});

test("only the owner can delete; every other role gets 403 and nothing is removed", async t => {
  const { removed, chats } = mockStore(t, stored());
  for (const user of ["editor", "commenter", "viewer", "outsider"]) {
    await assert.rejects(deleteDocument(user, "doc"), { statusCode: 403 });
  }
  assert.equal(removed.mock.callCount(), 0);
  assert.equal(chats.mock.callCount(), 0);
});

test("deleting a missing document is a 404", async t => {
  t.mock.method(Document, "findById", async () => null);
  await assert.rejects(deleteDocument("owner", "gone"), { statusCode: 404 });
});

test("delete removes the document and its chats, announces the access change, and cleans up Cloudinary images", async t => {
  const { removed, chats } = mockStore(t, stored({ relatedImages: [{ publicId: "documents/doc/1-a" }] }));
  const cleanup = t.mock.method(cloudinary.api, "delete_resources_by_prefix", async () => ({}));
  const previous = process.env.CLOUDINARY_CLOUD_NAME;
  process.env.CLOUDINARY_CLOUD_NAME = "demo";
  t.after(() => { if (previous === undefined) delete process.env.CLOUDINARY_CLOUD_NAME; else process.env.CLOUDINARY_CLOUD_NAME = previous; });
  const seen = [];
  const listener = id => seen.push(id);
  documentAccessEvents.on("changed", listener);
  t.after(() => documentAccessEvents.off("changed", listener));

  await deleteDocument("owner", "doc");
  assert.deepEqual(removed.mock.calls[0].arguments[0], { _id: "doc" });
  assert.deepEqual(chats.mock.calls[0].arguments[0], { documentId: "doc" });
  assert.deepEqual(cleanup.mock.calls[0].arguments, ["documents/doc/"]);
  assert.deepEqual(seen, ["doc"]);
});

test("a Cloudinary failure never fails or undoes the delete", async t => {
  const { removed } = mockStore(t, stored({ relatedImages: [{ publicId: "documents/doc/1-a" }] }));
  t.mock.method(cloudinary.api, "delete_resources_by_prefix", async () => { throw new Error("cloudinary down"); });
  t.mock.method(console, "error", () => {});
  const previous = process.env.CLOUDINARY_CLOUD_NAME;
  process.env.CLOUDINARY_CLOUD_NAME = "demo";
  t.after(() => { if (previous === undefined) delete process.env.CLOUDINARY_CLOUD_NAME; else process.env.CLOUDINARY_CLOUD_NAME = previous; });
  await deleteDocument("owner", "doc");
  assert.equal(removed.mock.callCount(), 1);
});

test("documents without images skip the Cloudinary call", async t => {
  mockStore(t, stored());
  const cleanup = t.mock.method(cloudinary.api, "delete_resources_by_prefix", async () => ({}));
  await deleteDocument("owner", "doc");
  assert.equal(cleanup.mock.callCount(), 0);
});
