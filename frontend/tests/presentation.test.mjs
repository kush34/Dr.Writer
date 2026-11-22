import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createServerAutomationHost } from "@pptx-editor.dev/core/automation";
import { applyPresentationEdits, readOutline } from "../src/service/presentation.ts";

test("AI edits round-trip with manual edits intact and stale or invalid batches refused", () => {
  const bytes = readFileSync(new URL("../src/assets/blank.pptx", import.meta.url));
  const { host } = createServerAutomationHost(bytes);
  const before = host.revision();
  assert.equal(host.execute({ operations: [
    { op: "getSlide", key: { index: 0 } },
    { op: "addShape", container: { result: 0 }, shape: { kind: "textBox", text: "User title" } },
  ] }).ok, true);
  const append = { type: "append", title: "AI title", body: "AI body" };
  assert.throws(() => applyPresentationEdits(host, before, [append]));
  assert.throws(() => applyPresentationEdits(host, host.revision(), [append,
    { type: "replace", slide: 99, shape: 0, text: "Invalid" }]));
  assert.deepEqual(readOutline(host), [["User title"]]);
  applyPresentationEdits(host, host.revision(), [append, { type: "addText", slide: 0, text: "Summary" }]);
  applyPresentationEdits(host, host.revision(), [{ type: "replace", slide: 0, shape: 1, text: "Revised summary" }]);
  const reopened = createServerAutomationHost(host.save().bytes);
  assert.deepEqual(readOutline(reopened.host).map(slide => slide.filter(Boolean)), [
    ["User title", "Revised summary"], ["AI title", "AI body"],
  ]);
});
