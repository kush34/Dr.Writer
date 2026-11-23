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
  const outline = readOutline(reopened.host).map(slide => slide.filter(Boolean));
  assert.deepEqual(outline, [
    ["User title", "Revised summary"], ["AI title", "AI body"],
  ]);
  const slides = reopened.host.execute({ operations: [{ op: "listSlides" }] }).results[0].value.handles;
  const appendedShapes = reopened.host.execute({ operations: [{ op: "listShapes", container: slides[1] }] }).results[0].value.handles;
  assert.equal(appendedShapes.length, 2);
});

test("deleteSlide and moveSlide use original slide numbers and survive a save round-trip", () => {
  const bytes = readFileSync(new URL("../src/assets/blank.pptx", import.meta.url));
  const { host } = createServerAutomationHost(bytes);
  applyPresentationEdits(host, host.revision(), ["B", "C", "D", "E"].map(title => ({ type: "append", title })));
  // Original slides are numbered 0..4. Delete 1 and 3, move original slide 4 to the front, edit slide 2 meanwhile.
  const before = readOutline(host);
  const edit = [
    { type: "deleteSlide", slide: 1 },
    { type: "deleteSlide", slide: 3 },
    { type: "moveSlide", slide: 4, to: 0 },
    { type: "addText", slide: 2, text: "note" },
  ];
  applyPresentationEdits(host, host.revision(), edit);
  const after = readOutline(host).map(slide => slide.filter(Boolean));
  assert.equal(after.length, before.length - 2);
  assert.deepEqual(after.map(slide => slide[0]), [before[4].find(Boolean), before[0].find(Boolean), before[2].find(Boolean)]);
  assert.ok(after[2].includes("note"));
  const reopened = createServerAutomationHost(host.save().bytes);
  assert.equal(readOutline(reopened.host).length, 3);
  assert.throws(() => applyPresentationEdits(host, host.revision(), [{ type: "deleteSlide", slide: 9 }]));
});
