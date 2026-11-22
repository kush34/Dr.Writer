import type { AutomationHost, AutomationOperation } from "@pptx-editor.dev/core/automation";

type Edit = { type: "append"; title: string; body: string }
  | { type: "addText"; slide: number; text: string }
  | { type: "replace"; slide: number; shape: number; text: string };

export function readOutline(host: AutomationHost) {
  function read(op: AutomationOperation) {
    const [result] = host.execute({ operations: [op] }).results;
    if (result?.status !== "ok") throw new Error("Unable to read the presentation.");
    return result.value;
  }
  const slides = read({ op: "listSlides" });
  if (slides.kind !== "handles") throw new Error("Presentation is still opening.");
  return slides.handles.map(slide => {
    const shapes = read({ op: "listShapes", container: slide });
    if (shapes.kind !== "handles") throw new Error("Unable to read slide.");
    return shapes.handles.map(shape => {
      const value = read({ op: "readText", shape, orNull: true });
      return value.kind === "text" ? value.text.slice(0, 2000) : null;
    });
  });
}

export function applyPresentationEdits(host: AutomationHost, revision: number, edits: Edit[]) {
  const operations: AutomationOperation[] = [];
  for (const edit of edits) {
    const container = { result: operations.length };
    operations.push(edit.type === "append" ? { op: "addSlide" } : { op: "getSlide", key: { index: edit.slide } });
    if (edit.type === "replace") {
      const shape = { result: operations.length };
      operations.push({ op: "getShape", container, key: { index: edit.shape } }, { op: "setText", shape, text: edit.text });
    } else {
      if (edit.type === "append") operations.push({ op: "addShape", container, shape: { kind: "textBox", text: edit.title }, box: { left: 40, top: 30, width: 640, height: 64 } });
      operations.push({ op: "addShape", container, shape: { kind: "textBox", text: edit.type === "append" ? edit.body : edit.text }, box: { left: 40, top: 110, width: 640, height: 320 } });
    }
  }
  if (!operations.length || !host.execute({ operations, expectedRevision: revision }).ok)
    throw new Error("Slides changed or an edit was invalid. Request the edit again.");
}
