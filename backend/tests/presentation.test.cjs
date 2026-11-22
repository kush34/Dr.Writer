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
