const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const User = require('../dist/Models/userModel').default;
const { saveOpenRouterKey, getOpenRouterKey } = require('../dist/service/openrouterAuth');

test('OpenRouter credentials are encrypted and bound to the user', async () => {
  const previous = process.env.MCP_ENCRYPTION_KEY;
  process.env.MCP_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
  let stored;
  const update = mock.method(User, 'updateOne', async (_filter, change) => { stored = change.$set.openrouter_key; });
  const find = mock.method(User, 'findById', () => ({ select: async () => ({ openrouter_key: stored }) }));
  try {
    await saveOpenRouterKey('user-one', 'sk-or-secret');
    assert.ok(!stored.includes('sk-or-secret'));
    assert.equal(await getOpenRouterKey('user-one'), 'sk-or-secret');
    await assert.rejects(getOpenRouterKey('user-two'));
  } finally {
    update.mock.restore(); find.mock.restore();
    if (previous === undefined) delete process.env.MCP_ENCRYPTION_KEY; else process.env.MCP_ENCRYPTION_KEY = previous;
  }
});
