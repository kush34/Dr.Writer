const { test } = require("node:test");
const assert = require("node:assert/strict");
const Document = require("../dist/Models/documentModel").default;
const User = require("../dist/Models/userModel").default;
const { getDocumentList } = require("../dist/Services/documentService");

// Evaluates the small filter subset getDocumentList uses against an in-memory collection.
const matches = (doc, filter) => Object.entries(filter).every(([key, value]) => {
  if (key === "$or") return value.some(part => matches(doc, part));
  if (key === "users") return doc.users.includes(value);
  return String(doc[key]) === String(value);
});

const chain = rows => ({ select: () => ({ lean: async () => rows }) });

test("Home lists documents the user owns and documents shared with them, and marks which is which", async t => {
  const docs = [
    { _id: "mine", title: "Mine", content: "<p>own text</p>", user_id: "me", users: [] },
    { _id: "shared", title: "Shared", content: "<p>their text</p>", user_id: "alice", users: ["me"] },
    { _id: "private", title: "Private", content: "x", user_id: "alice", users: ["someone-else"] },
  ];
  t.mock.method(Document, "find", filter => chain(docs.filter(doc => matches(doc, filter))));
  const lookups = [];
  t.mock.method(User, "find", filter => {
    lookups.push(filter);
    return chain([{ _id: "alice", name: "Alice", email: "alice@example.com" }]);
  });

  const list = await getDocumentList("me");
  assert.deepEqual(list.map(item => item._id), ["mine", "shared"]);
  const [mine, shared] = list;
  assert.equal(mine.owned, true);
  assert.equal("sharedBy" in mine, false);
  assert.equal(shared.owned, false);
  assert.equal(shared.sharedBy, "Alice");
  assert.equal(shared.preview, "their text");
  assert.equal("user_id" in shared, false);
  assert.deepEqual(lookups, [{ _id: { $in: ["alice"] } }]);
});

test("owner lookup is skipped when nothing is shared", async t => {
  t.mock.method(Document, "find", () => chain([{ _id: "mine", title: "Mine", content: "", user_id: "me", users: [] }]));
  const lookup = t.mock.method(User, "find", () => chain([]));
  const list = await getDocumentList("me");
  assert.equal(list.length, 1);
  assert.equal(lookup.mock.callCount(), 0);
});

test("Home list carries each document's tags and asks the database for them", async t => {
  let selected = "";
  t.mock.method(Document, "find", () => ({ select: fields => { selected = fields; return { lean: async () => [{ _id: "mine", title: "Mine", content: "", user_id: "me", users: [], tags: ["work", "q3"] }] }; } }));
  const [item] = await getDocumentList("me");
  assert.deepEqual(item.tags, ["work", "q3"]);
  assert.match(selected, /\btags\b/);
});
