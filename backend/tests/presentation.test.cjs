const { test } = require("node:test");
const assert = require("node:assert/strict");
const Document = require("../dist/Models/documentModel").default;
const router = require("../dist/service/openrouter");
const auth = require("../dist/service/openrouterAuth");
const { createDocument, performDocumentAction, savePresentation, syncDocument, updateDocument } = require("../dist/Services/documentService");
const { createDocumentSchema, savePresentationSchema } = require("../dist/validation/documentSchemas");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

test("presentation actions and saves enforce document access, kind, and revision", async t => {
  const pptx = readFileSync(resolve(__dirname, "../../frontend/src/assets/blank.pptx")).toString("base64");
  assert.equal(createDocumentSchema.parse({ title: "Legacy" }).kind, "document");
  assert.ok(savePresentationSchema.safeParse({ pptx, revision: 0 }).success);
  assert.equal(savePresentationSchema.parse({ pptx, revision: 0, title: "Renamed deck" }).title, "Renamed deck");
  const doc = { kind: "presentation", revision: 0, user_id: "owner", users: ["member"] };
  t.mock.method(Document, "create", async properties => properties);
  assert.equal((await createDocument("owner", "Slides", "presentation")).kind, "presentation");
  t.mock.method(Document, "findById", async () => doc);
  t.mock.method(Document, "updateOne", async (filter, change) => {
    assert.equal(filter._id, "deck");
    if (filter.revision !== doc.revision) return { modifiedCount: 0 };
    doc.revision += change.$inc.revision;
    doc.pptx = change.$set.pptx;
    if (change.$set.title) doc.title = change.$set.title;
    return { modifiedCount: 1 };
  });
  t.mock.method(auth, "getOpenRouterKey", async () => undefined);
  const plan = [{ type: "append", title: "Overview", body: "Project status" }];
  const model = t.mock.method(router, "openRouterComplete", async (prompt, name) => {
    assert.ok(prompt.includes("First slide"));
    assert.equal(name, "selected-model");
    return JSON.stringify({ operations: plan });
  });
  const edit = user => performDocumentAction(user, "deck", "Add overview", undefined, "selected-model", [["First slide"]]);
  await assert.rejects(edit("member"), { statusCode: 403 });
  assert.equal(model.mock.callCount(), 0);
  assert.deepEqual((await edit("owner")).operations, plan);
  model.mock.mockImplementation(async () => '{"operations":[{"type":"unknown"}]}');
  await assert.rejects(edit("owner"), { statusCode: 502 });
  await assert.rejects(savePresentation("outsider", "deck", 0, pptx), { statusCode: 403 });
  assert.equal(await savePresentation("member", "deck", 0, pptx, "Renamed deck"), 1);
  assert.equal(doc.title, "Renamed deck");
  await assert.rejects(savePresentation("owner", "deck", 0, pptx), { statusCode: 409 });
  for (const save of [syncDocument, updateDocument]) {
    await assert.rejects(save("owner", "deck", "Oops", {}), { statusCode: 400 });
  }
  doc.kind = "document";
  await assert.rejects(savePresentation("owner", "deck", 1, pptx), { statusCode: 400 });
});

test("slide edits accept layouts, bullets and tables and the prompt describes the deck", async t => {
  const { presentationPlan, documentActionBodySchema } = require("../dist/validation/documentSchemas");
  const deck = { width: 960, height: 540, layouts: [{ name: "Title Slide", type: "title" }, { name: "Title and Content", type: "obj" }], slides: [{ layout: "Blank", shapes: [] }] };
  assert.ok(documentActionBodySchema.safeParse({ command: "x", outline: [[]], deck }).success);
  const plan = [
    { type: "append", layout: "title", title: "Q3 Plan", body: "Priorities" },
    { type: "append", title: "Priorities", bullets: ["Ship", "Measure"] },
    { type: "append", title: "Budget", table: { header: ["Item", "Cost"], rows: [["Hiring", "$1"]] } },
  ];
  assert.ok(presentationPlan.safeParse(plan).success);
  assert.ok(!presentationPlan.safeParse([{ type: "append", title: "Empty" }]).success);
  assert.ok(!presentationPlan.safeParse([{ type: "append", title: "T", table: { header: ["A", "B"], rows: [["only one"]] } }]).success);

  t.mock.method(Document, "findById", async () => ({ kind: "presentation", revision: 0, user_id: "owner", users: [] }));
  t.mock.method(auth, "getOpenRouterKey", async () => undefined);
  let seen = "";
  t.mock.method(router, "openRouterComplete", async prompt => { seen = prompt; return JSON.stringify({ operations: plan }); });
  const result = await performDocumentAction("owner", "deck", "Add a plan", undefined, "m", [["First slide"]], () => {}, () => {}, deck);
  assert.deepEqual(result.operations, plan);
  assert.ok(seen.includes("960x540") && seen.includes("Title and Content (obj)") && seen.includes('"bullets"'));
});

test("slide delete and move edits are planned against the original numbering", async t => {
  const { presentationPlan } = require("../dist/validation/documentSchemas");
  const { planSlideOrder } = require("../dist/utils/lintEdits");
  const del = slide => ({ type: "deleteSlide", slide });
  const move = (slide, to) => ({ type: "moveSlide", slide, to });
  assert.ok(presentationPlan.safeParse([del(1), move(3, 0)]).success);
  assert.ok(!presentationPlan.safeParse([{ type: "moveSlide", slide: 1 }]).success);
  assert.ok(!presentationPlan.safeParse([{ type: "deleteSlide", slide: -1 }]).success);

  assert.deepEqual(planSlideOrder([del(1), del(3), move(4, 0)], 5).order, [4, 0, 2]);
  assert.deepEqual(planSlideOrder([move(0, 2)], 3).order, [1, 2, 0]);
  assert.deepEqual(planSlideOrder([move(0, 1), move(2, 0)], 3).order, [2, 1, 0]);
  const bad = (ops, count) => planSlideOrder(ops, count).problems.join(" | ");
  assert.match(bad([del(5)], 3), /does not exist/);
  assert.match(bad([del(1), del(1)], 3), /already deleted/);
  assert.match(bad([del(1), move(1, 0)], 3), /deleted and also edited or moved/);
  assert.match(bad([del(1), { type: "addText", slide: 1, text: "x" }], 3), /deleted and also edited or moved/);
  assert.match(bad([move(0, 3)], 3), /last position is 2/);
  assert.match(bad([del(0), del(1)], 2), /every slide/);
  assert.equal(bad([del(0), del(1), { type: "append", title: "New", bullets: ["x"] }], 2), "");

  t.mock.method(Document, "findById", async () => ({ kind: "presentation", revision: 0, user_id: "owner", users: [] }));
  t.mock.method(auth, "getOpenRouterKey", async () => undefined);
  const prompts = [];
  const replies = [[del(0), del(1), del(2)], [del(1), move(2, 0)]];
  t.mock.method(router, "openRouterComplete", async prompt => { prompts.push(prompt); return JSON.stringify({ operations: replies.shift() }); });
  const previews = [];
  const result = await performDocumentAction("owner", "deck", "Drop slide 2 and lead with the last one", undefined, "m", [["One"], ["Two"], ["Three"]], () => {}, text => previews.push(text));
  assert.deepEqual(result.operations, [del(1), move(2, 0)]);
  assert.equal(prompts.length, 2);
  assert.match(prompts[0], /deleteSlide/);
  assert.match(prompts[1], /delete every slide/);
  assert.match(previews.at(-1), /Delete slide 2\n\nMove slide 3 to position 1/);
});
