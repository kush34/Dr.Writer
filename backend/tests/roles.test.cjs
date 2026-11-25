const { test } = require("node:test");
const assert = require("node:assert/strict");
const { mockBalance } = require("./meter-helper.cjs");
const Document = require("../dist/Models/documentModel").default;
const User = require("../dist/Models/userModel").default;
const auth = require("../dist/service/openrouterAuth");
const router = require("../dist/service/openrouter");
const { documentAccessEvents } = require("../dist/utils/documentAccessEvents");
const { addUserSchema } = require("../dist/validation/documentSchemas");
const service = require("../dist/Services/documentService");
const { getDocumentRole, canEditRole, updateDocument, syncDocument, savePresentation, performDocumentAction, saveActionHistory,
  addUserToDocument, removeUserFromDocument, listDocumentMembers, createDocumentImageSignature } = service;

const content = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Original" }] }] };
const reply = JSON.stringify({ operations: [{ type: "insert", at: 1, blocks: [{ type: "heading", level: 2, text: "New" }] }] });

// One stored document with every role: owner, editor, commenter, viewer.
const fresh = extra => ({ _id: "doc", kind: "document", user_id: "owner", users: ["editor"], commenters: ["commenter"], viewers: ["viewer"], title: "Old", content, revision: 0, ...extra });

// Evaluates the filter subset the save paths use against the stored document.
const matches = (doc, filter) => Object.entries(filter).every(([key, value]) => {
  if (key === "$and") return value.every(part => matches(doc, part));
  if (key === "$or") return value.some(part => matches(doc, part));
  if (["users", "commenters", "viewers"].includes(key)) return (doc[key] ?? []).includes(value);
  if (value && typeof value === "object" && "$exists" in value) return (key in doc) === value.$exists;
  return doc[key] === value;
});

const store = (t, stored) => {
  const doc = fresh(stored);
  t.mock.method(Document, "findById", async () => ({ ...doc, revision: doc.revision ?? 0 }));
  t.mock.method(Document, "updateOne", async (filter, change) => {
    if (!matches(doc, filter)) return { modifiedCount: 0 };
    if (change.$set) Object.assign(doc, change.$set);
    if (change.$inc) doc.revision = (doc.revision ?? 0) + change.$inc.revision;
    for (const [field, id] of Object.entries(change.$addToSet ?? {})) doc[field] = [...new Set([...(doc[field] ?? []), id])];
    for (const [field, id] of Object.entries(change.$pull ?? {})) doc[field] = (doc[field] ?? []).filter(item => item !== id);
    return { modifiedCount: 1 };
  });
  return doc;
};

const changes = () => {
  const seen = [];
  const listener = id => seen.push(id);
  documentAccessEvents.on("changed", listener);
  return { seen, stop: () => documentAccessEvents.off("changed", listener) };
};

test("roles resolve to the strongest one, and older documents without role arrays still work", () => {
  const doc = fresh();
  assert.deepEqual(["owner", "editor", "commenter", "viewer", "nobody"].map(user => getDocumentRole(user, doc)), ["owner", "editor", "commenter", "viewer", null]);
  assert.equal(getDocumentRole("editor", { user_id: "owner", users: ["editor"] }), "editor");
  assert.equal(getDocumentRole("viewer", { user_id: "owner", users: [] }), null);
  assert.deepEqual(["owner", "editor", "commenter", "viewer", null].map(canEditRole), [true, true, false, false, false]);
  // Listed twice, the higher role wins.
  assert.equal(getDocumentRole("both", { user_id: "owner", users: ["both"], viewers: ["both"] }), "editor");
});

test("only the owner and editors can save; commenters and viewers get 403 and nothing is written", async t => {
  const doc = store(t);
  for (const user of ["viewer", "commenter"]) {
    await assert.rejects(updateDocument(user, "doc", "Hack", "hack", 0), { statusCode: 403, message: /view-only/ });
    await assert.rejects(syncDocument(user, "doc", "Hack", "hack", 0), { statusCode: 403 });
  }
  assert.deepEqual([doc.title, doc.content, doc.revision], ["Old", content, 0]);
  assert.equal(await updateDocument("editor", "doc", "By editor", "e", 0), 1);
  assert.equal(await updateDocument("owner", "doc", "By owner", "o", 1), 2);
});

test("a role downgrade that lands between the access check and the write still loses (the atomic filter is editor-only)", async t => {
  const doc = store(t, { users: [] });
  // Simulate the stale pre-check: the editor passed it, but the write finds them demoted.
  t.mock.method(Document, "findById", async () => ({ ...doc, users: ["editor"] }));
  await assert.rejects(updateDocument("editor", "doc", "Late", "late", 0), { statusCode: 409 });
  assert.equal(doc.title, "Old");
});

test("presentation saves are editor-only too", async t => {
  const doc = store(t, { kind: "presentation", pptx: "AAAA" });
  await assert.rejects(savePresentation("viewer", "doc", 0, "BBBB"), { statusCode: 403 });
  await assert.rejects(savePresentation("commenter", "doc", 0, "BBBB"), { statusCode: 403 });
  assert.equal(doc.pptx, "AAAA");
  assert.equal(await savePresentation("editor", "doc", 0, "BBBB"), 1);
});

test("editors can run AI edits and pay for them themselves; viewers and commenters cannot", async t => {
  store(t);
  t.mock.method(auth, "getOpenRouterKey", async () => undefined);
  const state = mockBalance(t, 1_000_000);
  const complete = t.mock.method(router, "openRouterComplete", async () => reply);
  for (const user of ["viewer", "commenter", "stranger"]) {
    await assert.rejects(performDocumentAction(user, "doc", "add", content, "m"), { statusCode: 403 });
  }
  assert.equal(complete.mock.callCount(), 0);
  assert.equal(state.balance, 1_000_000);
  const result = await performDocumentAction("editor", "doc", "add a heading", content, "m");
  assert.ok(result.operations?.length);
  assert.ok(state.balance < 1_000_000, "the editor's balance is what was charged");
  assert.equal(state.holds, 1);
});

test("action history can be saved by editors but not viewers", async t => {
  store(t);
  const Chat = require("../dist/Models/chatModel").default;
  const create = t.mock.method(Chat, "create", async value => value);
  await assert.rejects(saveActionHistory("viewer", "doc", "p", "r"), { statusCode: 403 });
  await saveActionHistory("editor", "doc", "p", "r");
  assert.equal(create.mock.callCount(), 1);
});

test("image upload signatures require edit rights", async t => {
  store(t);
  await assert.rejects(createDocumentImageSignature("viewer", "doc", "a.png"), { statusCode: 403 });
});

test("sharing takes a role, defaults to editor, and moves a person between roles", async t => {
  assert.equal(addUserSchema.parse({ file_id: "doc", userToAddMail: "a@b.co" }).role, "editor");
  assert.ok(!addUserSchema.safeParse({ file_id: "doc", userToAddMail: "a@b.co", role: "owner" }).success);

  const doc = store(t, { users: [], commenters: [], viewers: [] });
  t.mock.method(User, "findOne", async ({ email }) => ({ _id: { toString: () => email === "owner@x.co" ? "owner" : "guest" } }));
  const events = changes();
  try {
    await addUserToDocument("owner", "doc", "guest@x.co", "viewer");
    assert.deepEqual([doc.users, doc.commenters, doc.viewers], [[], [], ["guest"]]);
    await addUserToDocument("owner", "doc", "guest@x.co", "editor");
    assert.deepEqual([doc.users, doc.commenters, doc.viewers], [["guest"], [], []]);
    await addUserToDocument("owner", "doc", "guest@x.co", "commenter");
    assert.deepEqual([doc.users, doc.commenters, doc.viewers], [[], ["guest"], []]);
    assert.deepEqual(events.seen, ["doc", "doc", "doc"]);
    await assert.rejects(addUserToDocument("owner", "doc", "owner@x.co", "viewer"), { statusCode: 400 });
    await assert.rejects(addUserToDocument("guest", "doc", "guest@x.co", "editor"), { statusCode: 403 });
    assert.equal(events.seen.length, 3);
  } finally { events.stop(); }
});

test("the owner can remove any collaborator, a collaborator can only remove themselves, the owner cannot be removed", async t => {
  const doc = store(t);
  const events = changes();
  try {
    await assert.rejects(removeUserFromDocument("viewer", "doc", "editor"), { statusCode: 403 });
    await assert.rejects(removeUserFromDocument("stranger", "doc", "editor"), { statusCode: 403 });
    await assert.rejects(removeUserFromDocument("owner", "doc", "owner"), { statusCode: 400 });
    assert.deepEqual(events.seen, []);
    await removeUserFromDocument("owner", "doc", "editor");
    await removeUserFromDocument("viewer", "doc", "viewer"); // leave
    assert.deepEqual([doc.users, doc.commenters, doc.viewers], [[], ["commenter"], []]);
    assert.deepEqual(events.seen, ["doc", "doc"]);
    // The removed editor can no longer save.
    await assert.rejects(updateDocument("editor", "doc", "x", "x", 0), { statusCode: 403 });
  } finally { events.stop(); }
});

test("only the owner can list members, and each comes back with a role", async t => {
  store(t);
  t.mock.method(User, "find", () => ({ select: () => ({ lean: async () => [
    { _id: "owner", email: "o@x.co", name: "Olive" }, { _id: "editor", email: "e@x.co" }, { _id: "commenter", email: "c@x.co" }, { _id: "viewer", email: "v@x.co" },
  ] }) }));
  await assert.rejects(listDocumentMembers("editor", "doc"), { statusCode: 403 });
  const members = await listDocumentMembers("owner", "doc");
  assert.deepEqual(members.map(({ userId, role }) => [userId, role]), [["owner", "owner"], ["viewer", "viewer"], ["commenter", "commenter"], ["editor", "editor"]]);
  assert.equal(members[0].email, "o@x.co");
});

test("Home lists documents for every role and says which role the user has", async t => {
  const docs = [fresh({ _id: "a", content: "" })];
  t.mock.method(Document, "find", () => ({ select: () => ({ lean: async () => docs }) }));
  t.mock.method(User, "find", () => ({ select: () => ({ lean: async () => [{ _id: "owner", name: "Olive" }] }) }));
  const roles = [];
  for (const user of ["owner", "editor", "commenter", "viewer"]) roles.push((await service.getDocumentList(user))[0].role);
  assert.deepEqual(roles, ["owner", "editor", "commenter", "viewer"]);
  const [item] = await service.getDocumentList("viewer");
  assert.deepEqual([item.owned, item.sharedBy, "viewers" in item, "users" in item], [false, "Olive", false, false]);
});
