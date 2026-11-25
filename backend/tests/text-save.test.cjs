const { test } = require("node:test");
const assert = require("node:assert/strict");
const Document = require("../dist/Models/documentModel").default;
const { syncDocument, updateDocument } = require("../dist/Services/documentService");
const { updateDocumentSchema, syncDocumentSchema } = require("../dist/validation/documentSchemas");

// Evaluates the small subset of Mongo filters that text saves use, against one stored document.
const matches = (doc, filter) => Object.entries(filter).every(([key, value]) => {
  if (key === "$and") return value.every(part => matches(doc, part));
  if (key === "$or") return value.some(part => matches(doc, part));
  if (key === "users") return doc.users.includes(value);
  if (value && typeof value === "object" && "$exists" in value) return (key in doc) === value.$exists;
  return doc[key] === value;
});

const setup = (t, stored) => {
  const doc = { _id: "doc", kind: "document", user_id: "owner", users: ["member"], title: "Old", content: "old", ...stored };
  // getDocumentData reads through Mongoose, which fills the schema default for a missing revision.
  t.mock.method(Document, "findById", async () => ({ ...doc, revision: doc.revision ?? 0 }));
  t.mock.method(Document, "updateOne", async (filter, change) => {
    if (!matches(doc, filter)) return { modifiedCount: 0 };
    Object.assign(doc, change.$set);
    doc.revision = (doc.revision ?? 0) + change.$inc.revision;
    return { modifiedCount: 1 };
  });
  return doc;
};

test("text saves and offline sync require a revision", () => {
  const body = { file_id: "doc", title: "T", newContent: {} };
  for (const schema of [updateDocumentSchema, syncDocumentSchema]) {
    assert.ok(!schema.safeParse(body).success);
    assert.ok(!schema.safeParse({ ...body, revision: -1 }).success);
    assert.ok(!schema.safeParse({ ...body, revision: 1.5 }).success);
    assert.ok(schema.safeParse({ ...body, revision: 0 }).success);
  }
});

test("a stale text save is rejected with 409 and does not overwrite newer content", async t => {
  const doc = setup(t, { revision: 0 });
  assert.equal(await updateDocument("owner", "doc", "Mine", "mine", 0), 1);
  assert.equal(await updateDocument("member", "doc", "Theirs", "theirs", 1), 2);
  // The owner is still on revision 1 and must not clobber the member's save.
  await assert.rejects(updateDocument("owner", "doc", "Stale", "stale", 1), { statusCode: 409 });
  assert.deepEqual([doc.title, doc.content, doc.revision], ["Theirs", "theirs", 2]);
  assert.equal(await updateDocument("owner", "doc", "Rebased", "rebased", 2), 3);
});

test("offline sync is revision checked and never overwrites a newer version", async t => {
  const doc = setup(t, { revision: 3, content: "server edit" });
  await assert.rejects(syncDocument("owner", "doc", "Offline", "offline edit", 2), { statusCode: 409 });
  assert.equal(doc.content, "server edit");
  assert.equal(await syncDocument("owner", "doc", "Offline", "offline edit", 3), 4);
  assert.equal(doc.content, "offline edit");
  // Syncing identical content used to be a silent no-op or a blind write; it is now an ordinary versioned save.
  assert.equal(await syncDocument("owner", "doc", "Offline", "offline edit", 4), 5);
});

test("documents created before revisions existed can still be saved", async t => {
  const doc = setup(t, {});
  assert.equal("revision" in doc, false);
  assert.equal(await updateDocument("owner", "doc", "New", "new", 0), 1);
  assert.equal(doc.revision, 1);
});

test("text saves still enforce document access", async t => {
  const doc = setup(t, { revision: 0 });
  await assert.rejects(updateDocument("outsider", "doc", "Hack", "hack", 0), { statusCode: 403 });
  await assert.rejects(syncDocument("outsider", "doc", "Hack", "hack", 0), { statusCode: 403 });
  assert.equal(doc.content, "old");
});
