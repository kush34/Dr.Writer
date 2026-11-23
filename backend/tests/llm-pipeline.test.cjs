const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateDocumentOperations } = require('../dist/utils/llmActions');
const { applyEdits } = require('../dist/utils/applyEdits');

test('structured edits preserve unrelated content and reject unsafe indexes', () => {
  const original = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Keep', marks: [{ type: 'bold' }] }] }] };
  const ops = [{ type: 'insert', at: 1, blocks: [{ type: 'heading', level: 2, text: 'Summary' }, { type: 'bulletList', items: ['One', 'Two'] }] }];
  const result = applyEdits(original, validateDocumentOperations(ops, 1));
  assert.deepEqual(result.content[0], original.content[0]);
  assert.equal(result.content[1].type, 'heading');
  assert.equal(result.content[2].content.length, 2);
  assert.throws(() => validateDocumentOperations([{ type: 'replace', from: 0, to: 3, text: 'bad' }], 1));
  assert.throws(() => validateDocumentOperations([{ type: 'delete', from: 0, to: 0 }, { type: 'insert', at: 0, text: 'bad' }], 1));
  assert.throws(() => validateDocumentOperations([{ type: 'insert', at: 0, blocks: [{ type: 'heading', level: 9, text: 'bad' }] }], 1));
});

test('invalid model edits are repaired before they are applied', async t => {
  const Document = require('../dist/Models/documentModel').default;
  const auth = require('../dist/service/openrouterAuth');
  const router = require('../dist/service/openrouter');
  const { performDocumentAction } = require('../dist/Services/documentService');
  const content = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Original' }] }] };
  t.mock.method(Document, 'findById', async () => ({ user_id: 'owner', kind: 'document', content }));
  t.mock.method(auth, 'getOpenRouterKey', async () => undefined);
  let calls = 0;
  const complete = t.mock.method(router, 'openRouterComplete', async prompt => ++calls === 1
    ? JSON.stringify({ operations: [{ type: 'delete', from: 9, to: 9 }] })
    : (assert.match(prompt, /previous response was invalid/), assert.match(prompt, /"from":9/), JSON.stringify({ operations: [{ type: 'insert', at: 1, blocks: [{ type: 'heading', level: 2, text: 'New' }] }] })));
  const progress = [];
  const result = await performDocumentAction('owner', 'doc', 'add a heading', content, 'test-model', undefined, status => progress.push(status));
  assert.deepEqual(progress, ['Preparing document edits', 'Checking the response', 'Retrying the model response', 'Checking the response']);
  assert.equal(complete.mock.callCount(), 2);
  assert.equal(result.updatedContent.content[1].type, 'heading');
});

test('previews a validated outline and proposed edits before returning', async t => {
  const Document = require('../dist/Models/documentModel').default;
  const auth = require('../dist/service/openrouterAuth');
  const router = require('../dist/service/openrouter');
  const { performDocumentAction } = require('../dist/Services/documentService');
  const content = { type: 'doc', content: [{ type: 'paragraph' }] };
  t.mock.method(Document, 'findById', async () => ({ user_id: 'owner', kind: 'document', content }));
  t.mock.method(auth, 'getOpenRouterKey', async () => undefined);
  let calls = 0;
  t.mock.method(router, 'openRouterComplete', async () => ++calls === 1
    ? JSON.stringify({ audience: 'Readers', goal: 'Explain', sections: [{ heading: 'Intro', purpose: 'Context' }] })
    : JSON.stringify({ operations: [{ type: 'insert', at: 1, blocks: [{ type: 'heading', level: 2, text: 'Intro' }] }] }));
  const previews = [];
  const result = await performDocumentAction('owner', 'doc', 'write an introduction', content, 'model', undefined, () => {}, text => previews.push(text));
  assert.match(previews[0], /Document outline\n1\. Intro/);
  assert.match(previews[1], /Proposed document edits\nIntro/);
  assert.equal(result.updatedContent.content[1].type, 'heading');
});

test('an invalid outline does not prevent a valid direct edit', async t => {
  const Document = require('../dist/Models/documentModel').default;
  const auth = require('../dist/service/openrouterAuth');
  const router = require('../dist/service/openrouter');
  const { performDocumentAction } = require('../dist/Services/documentService');
  const content = { type: 'doc', content: [{ type: 'paragraph' }] };
  t.mock.method(Document, 'findById', async () => ({ user_id: 'owner', kind: 'document', content }));
  t.mock.method(auth, 'getOpenRouterKey', async () => undefined);
  let calls = 0;
  t.mock.method(router, 'openRouterComplete', async () => ++calls <= 3 ? '{}' : JSON.stringify({ operations: [{ type: 'insert', at: 1, text: 'Hello' }] }));
  const result = await performDocumentAction('owner', 'doc', 'write', content, 'model');
  assert.equal(result.updatedContent.content[1].content[0].text, 'Hello');
  assert.equal(calls, 4);
});

test('empty model output is retried and does not hide provider errors', async t => {
  const Document = require('../dist/Models/documentModel').default;
  const auth = require('../dist/service/openrouterAuth');
  const router = require('../dist/service/openrouter');
  const { AppError } = require('../dist/utils/appError');
  const { performDocumentAction } = require('../dist/Services/documentService');
  const content = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Existing' }] }] };
  t.mock.method(Document, 'findById', async () => ({ user_id: 'owner', kind: 'document', content }));
  t.mock.method(auth, 'getOpenRouterKey', async () => undefined);
  let calls = 0;
  const complete = t.mock.method(router, 'openRouterComplete', async prompt => {
    calls++;
    if (calls === 1) return '';
    assert.match(prompt, /response was empty/);
    return JSON.stringify({ operations: [{ type: 'insert', at: 1, text: 'New' }] });
  });
  const progress = [];
  const result = await performDocumentAction('owner', 'doc', 'add text', content, 'model', undefined, status => progress.push(status));
  assert.equal(result.updatedContent.content[1].content[0].text, 'New');
  assert.equal(calls, 2);
  assert.ok(progress.includes('Retrying the model response'));
  complete.mock.mockImplementation(async () => { throw new AppError(429, 'Rate limited'); });
  await assert.rejects(performDocumentAction('owner', 'doc', 'add text', content, 'model'), { statusCode: 429 });
});

test('OpenRouter completion handles missing and text-part content', async t => {
  const { openRouterComplete } = require('../dist/service/openrouter');
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ choices: [{ message: { content: null } }] }), { status: 200 }));
  assert.equal(await openRouterComplete('prompt', 'model'), '');
  fetchMock.mock.mockImplementation(async () => new Response(JSON.stringify({ choices: [{ message: { content: [{ type: 'text', text: '{"ok":true}' }] } }] }), { status: 200 }));
  assert.equal(await openRouterComplete('prompt', 'model'), '{"ok":true}');
});

test('OpenRouter completion sends system prompt, JSON mode, token cap and temperature', async t => {
  const { openRouterComplete } = require('../dist/service/openrouter');
  let body;
  t.mock.method(globalThis, 'fetch', async (_url, init) => (body = JSON.parse(init.body), new Response(JSON.stringify({ choices: [{ message: { content: '{}' } }] }), { status: 200 })));
  await openRouterComplete('prompt', 'model', undefined, { system: 'rules', json: true, temperature: 0.3 });
  assert.deepEqual(body.messages, [{ role: 'system', content: 'rules' }, { role: 'user', content: 'prompt' }]);
  assert.deepEqual(body.response_format, { type: 'json_object' });
  assert.equal(body.temperature, 0.3);
  assert.ok(body.max_tokens > 0);
  await openRouterComplete('prompt', 'model');
  assert.equal(body.messages.length, 1);
  assert.equal(body.response_format, undefined);
});
