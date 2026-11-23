const { test } = require("node:test");
const assert = require("node:assert/strict");
const { mockBalance } = require("./meter-helper.cjs");
const Document = require("../dist/Models/documentModel").default;
const auth = require("../dist/service/openrouterAuth");
const router = require("../dist/service/openrouter");
const { MAX_TOKENS_PER_REQUEST } = require("../dist/Config/llm");
const { performDocumentAction } = require("../dist/Services/documentService");

const content = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Original" }] }] };
const reply = JSON.stringify({ operations: [{ type: "insert", at: 1, blocks: [{ type: "heading", level: 2, text: "New" }] }] });
const run = () => performDocumentAction("owner", "doc", "add a heading", content, "test-model");

const setup = (t, { ownKey, balance }) => {
  t.mock.method(Document, "findById", async () => ({ user_id: "owner", kind: "document", content }));
  t.mock.method(auth, "getOpenRouterKey", async () => ownKey);
  return mockBalance(t, balance);
};

test("a user with no key and no balance is refused before any model call on the server key", async t => {
  const state = setup(t, { balance: 0 });
  const complete = t.mock.method(router, "openRouterComplete", async () => reply);
  await assert.rejects(run(), { statusCode: 402 });
  assert.equal(complete.mock.callCount(), 0);
  assert.equal(state.balance, 0);
});

test("a balance below the worst-case cost of one call is refused", async t => {
  const state = setup(t, { balance: MAX_TOKENS_PER_REQUEST - 1 });
  const complete = t.mock.method(router, "openRouterComplete", async () => reply);
  await assert.rejects(run(), { statusCode: 402 });
  assert.equal(complete.mock.callCount(), 0);
  assert.equal(state.balance, MAX_TOKENS_PER_REQUEST - 1);
});

test("a metered call is charged for its estimated use and the rest of the hold is refunded", async t => {
  const state = setup(t, { balance: 1_000_000 });
  t.mock.method(router, "openRouterComplete", async () => reply);
  await run();
  const charged = 1_000_000 - state.balance;
  assert.ok(charged > 0 && charged < MAX_TOKENS_PER_REQUEST, `charged ${charged}`);
  assert.equal(state.holds, 1);
  assert.equal(state.refunds, 1);
});

test("a failed model call is refunded and every retry attempt is metered", async t => {
  const state = setup(t, { balance: 1_000_000 });
  const complete = t.mock.method(router, "openRouterComplete", async () => { throw new Error("provider down"); });
  await assert.rejects(run());
  assert.equal(state.holds, state.refunds);
  assert.equal(state.holds, complete.mock.callCount());
  // Nothing was produced, so only the prompt is charged, never the full hold.
  assert.ok(1_000_000 - state.balance < MAX_TOKENS_PER_REQUEST);
});

test("a user with their own OpenRouter key is not charged", async t => {
  const state = setup(t, { ownKey: "sk-own", balance: 0 });
  const complete = t.mock.method(router, "openRouterComplete", async () => reply);
  await run();
  assert.equal(complete.mock.callCount(), 1);
  assert.equal(complete.mock.calls[0].arguments[2], "sk-own");
  assert.deepEqual([state.holds, state.refunds, state.balance], [0, 0, 0]);
});
