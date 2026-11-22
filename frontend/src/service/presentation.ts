import type { AutomationHost, AutomationOperation } from "@pptx-editor.dev/core/automation";

type Edit = { type: "append"; title: string; body: string }
  | { type: "addText"; slide: number; text: string }
  | { type: "replace"; slide: number; shape: number; text: string };

function getAppendLayout(host: AutomationHost) {
  function read(op: AutomationOperation) {
    const [result] = host.execute({ operations: [op] }).results;
    if (result?.status !== "ok") throw new Error("Unable to inspect presentation layouts.");
    return result.value;
  }
  const masters = read({ op: "listMasters" });
  if (masters.kind !== "handles") throw new Error("Unable to inspect presentation layouts.");
  const candidates: { id: string; name: string; type: string | null }[] = [];
  for (const master of masters.handles) {
    const layouts = read({ op: "listLayouts", master });
    if (layouts.kind !== "handles") throw new Error("Unable to inspect presentation layouts.");
    for (const layout of layouts.handles) {
      const value = read({ op: "readLayout", layout });
      if (value.kind === "layout") candidates.push(value.layout);
    }
  }
  const layout = candidates.find(item => item.type === "obj")
    ?? candidates.find(item => item.type === "titleOnly")
    ?? candidates.find(item => item.type === "title" || item.type === "secHead")
    ?? candidates.find(item => item.type === "blank" || item.name?.toLowerCase() === "blank");
  if (!layout) throw new Error("No suitable slide layout is available for AI-generated slides.");
  return layout;
}

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
  const appendLayout = edits.some(edit => edit.type === "append") ? getAppendLayout(host) : undefined;
  for (const edit of edits) {
    const container = { result: operations.length };
    operations.push(edit.type === "append"
      ? { op: "addSlide", layoutId: appendLayout?.id }
      : { op: "getSlide", key: { index: edit.slide } });
    if (edit.type === "replace") {
      const shape = { result: operations.length };
      operations.push({ op: "getShape", container, key: { index: edit.shape } }, { op: "setText", shape, text: edit.text });
    } else {
      if (edit.type === "append" && (appendLayout?.type === "obj" || appendLayout?.type === "titleOnly" || appendLayout?.type === "title" || appendLayout?.type === "secHead")) {
        const titleShape = { result: operations.length };
        operations.push({ op: "getShape", container, key: { index: 0 } }, { op: "setText", shape: titleShape, text: edit.title });
        if (appendLayout.type === "obj" || appendLayout.type === "title" || appendLayout.type === "secHead") {
          const bodyShape = { result: operations.length };
          operations.push({ op: "getShape", container, key: { index: 1 } }, { op: "setText", shape: bodyShape, text: edit.body });
        } else {
          operations.push({ op: "addShape", container, shape: { kind: "textBox", text: edit.body }, box: { left: 40, top: 110, width: 640, height: 320 } });
        }
      } else {
        if (edit.type === "append") operations.push({ op: "addShape", container, shape: { kind: "textBox", text: edit.title }, box: { left: 40, top: 30, width: 640, height: 64 } });
        operations.push({ op: "addShape", container, shape: { kind: "textBox", text: edit.type === "append" ? edit.body : edit.text }, box: { left: 40, top: 110, width: 640, height: 320 } });
      }
    }
  }
  if (!operations.length || !host.execute({ operations, expectedRevision: revision }).ok)
    throw new Error("Slides changed or an edit was invalid. Request the edit again.");
}
