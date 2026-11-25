import { test } from "node:test";
import assert from "node:assert/strict";
import { addTag, collectTags, filterByTag, MAX_TAGS } from "../src/service/tags.ts";

test("addTag trims, refuses blanks, duplicates (any case), long tags and too many tags", () => {
  assert.deepEqual(addTag(["a"], "  b "), { tags: ["a", "b"] });
  assert.ok("error" in addTag([], "   "));
  assert.ok("error" in addTag(["Plan"], "plan"));
  assert.ok("error" in addTag([], "x".repeat(31)));
  assert.ok("error" in addTag(Array.from({ length: MAX_TAGS }, (_, i) => `t${i}`), "one more"));
});

test("collectTags returns each tag once, sorted, ignoring case", () => {
  assert.deepEqual(collectTags([{ tags: ["work", "Plan"] }, { tags: ["plan", "alpha"] }, {}]), ["alpha", "Plan", "work"]);
  assert.deepEqual(collectTags([]), []);
});

test("filterByTag keeps matching files and everything when no tag is chosen", () => {
  const files = [{ id: 1, tags: ["Work"] }, { id: 2, tags: ["home"] }, { id: 3 }];
  assert.deepEqual(filterByTag(files, "work").map((f) => f.id), [1]);
  assert.equal(filterByTag(files, null).length, 3);
  assert.deepEqual(filterByTag(files, "nope"), []);
});
