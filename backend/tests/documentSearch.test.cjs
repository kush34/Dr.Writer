const { test } = require("node:test");
const assert = require("node:assert/strict");
const { documentText, searchExcerpt } = require("../dist/utils/documentSearch");

test("finds text in structured, serialized, and imported documents", () => {
  const doc = { type: "doc", content: [{ type: "paragraph", content: [{ text: "Hello" }, { text: "world" }] }] };
  for (const content of [doc, JSON.stringify(doc), "<p>Hello world</p>"]) {
    assert.match(searchExcerpt(documentText(content), "WORLD"), /Hello world/);
    assert.equal(searchExcerpt(documentText(content), "missing"), null);
  }
});
