import type { AutomationHost, AutomationOperation } from "@pptx-editor.dev/core/automation";

export type SlideLayoutHint = "title" | "content" | "section";
export type Edit = { type: "append"; title: string; body?: string; bullets?: string[]; layout?: SlideLayoutHint; table?: { header: string[]; rows: string[][] } }
  | { type: "addText"; slide: number; text: string }
  | { type: "replace"; slide: number; shape: number; text: string }
  | { type: "deleteSlide"; slide: number }
  | { type: "moveSlide"; slide: number; to: number };

type Layout = { id: string; name: string; type: string | null };
type Box = { left: number; top: number; width: number; height: number };

function reader(host: AutomationHost, failure: string) {
  return (op: AutomationOperation) => {
    const [result] = host.execute({ operations: [op] }).results;
    if (result?.status !== "ok") throw new Error(failure);
    return result.value;
  };
}

function listLayouts(host: AutomationHost): Layout[] {
  const read = reader(host, "Unable to inspect presentation layouts.");
  const masters = read({ op: "listMasters" });
  if (masters.kind !== "handles") throw new Error("Unable to inspect presentation layouts.");
  const layouts: Layout[] = [];
  for (const master of masters.handles) {
    const handles = read({ op: "listLayouts", master });
    if (handles.kind !== "handles") throw new Error("Unable to inspect presentation layouts.");
    for (const handle of handles.handles) {
      const value = read({ op: "readLayout", layout: handle });
      if (value.kind === "layout") layouts.push(value.layout);
    }
  }
  return layouts;
}

const PREFERENCES: Record<SlideLayoutHint | "table", string[]> = {
  title: ["title", "secHead", "titleOnly", "obj"],
  section: ["secHead", "title", "titleOnly", "obj"],
  content: ["obj", "titleOnly", "title", "secHead"],
  table: ["titleOnly", "obj", "title", "secHead"],
};

function pickLayout(layouts: Layout[], hint: SlideLayoutHint | "table") {
  for (const type of PREFERENCES[hint]) {
    const layout = layouts.find(item => item.type === type);
    if (layout) return layout;
  }
  const blank = layouts.find(item => item.type === "blank" || item.name?.toLowerCase() === "blank");
  if (!blank) throw new Error("No suitable slide layout is available for AI-generated slides.");
  return blank;
}

function slideSize(host: AutomationHost) {
  const value = reader(host, "Unable to read the presentation.")({ op: "readPresentation" });
  if (value.kind !== "presentation") throw new Error("Unable to read the presentation.");
  return { width: value.presentation.slideWidth, height: value.presentation.slideHeight };
}

/** A template whose title placeholder does not span the slide (e.g. a 4:3 master on a 16:9 slide). */
function placeholdersMisfit(host: AutomationHost, width: number) {
  try {
    const read = reader(host, "Unable to inspect presentation layouts.");
    const masters = read({ op: "listMasters" });
    if (masters.kind !== "handles" || !masters.handles[0]) return false;
    const shapes = read({ op: "listShapes", container: masters.handles[0] });
    if (shapes.kind !== "handles") return false;
    for (const handle of shapes.handles) {
      const shape = read({ op: "readShape", shape: handle });
      if (shape.kind !== "shape" || shape.shape.placeholder?.type !== "title") continue;
      const { left, width: boxWidth } = shape.shape;
      return boxWidth < width * 0.7 || Math.abs(left + boxWidth / 2 - width / 2) > width * 0.05;
    }
  } catch { /* an unreadable master keeps the template's own geometry */ }
  return false;
}

const boxes = (width: number, height: number) => ({
  title: { left: width * 0.06, top: height * 0.05, width: width * 0.88, height: height * 0.17 },
  body: { left: width * 0.06, top: height * 0.26, width: width * 0.88, height: height * 0.64 },
  heroTitle: { left: width * 0.1, top: height * 0.3, width: width * 0.8, height: height * 0.2 },
  heroBody: { left: width * 0.1, top: height * 0.53, width: width * 0.8, height: height * 0.18 },
});

/** What the model needs to know about the deck besides its text: size, layouts and what each shape is. */
export function readDeck(host: AutomationHost) {
  const read = reader(host, "Unable to read the presentation.");
  const { width, height } = slideSize(host);
  const layouts = listLayouts(host);
  const slides = read({ op: "listSlides" });
  if (slides.kind !== "handles") throw new Error("Presentation is still opening.");
  return {
    width: Math.round(width),
    height: Math.round(height),
    layouts: layouts.map(({ name, type }) => ({ name: name.slice(0, 100), type: type ?? "cust" })),
    slides: slides.handles.map(slide => {
      const info = read({ op: "readSlide", slide });
      const layout = info.kind === "slide" && info.slide.layout ? read({ op: "readLayout", layout: info.slide.layout }) : null;
      const shapes = read({ op: "listShapes", container: slide });
      if (shapes.kind !== "handles") throw new Error("Unable to read slide.");
      return {
        layout: layout?.kind === "layout" ? layout.layout.name.slice(0, 100) : null,
        shapes: shapes.handles.map(handle => {
          const shape = read({ op: "readShape", shape: handle });
          return shape.kind === "shape" ? (shape.shape.placeholder?.type ?? shape.shape.type).slice(0, 40) : "unknown";
        }),
      };
    }),
  };
}

export function readOutline(host: AutomationHost) {
  const read = reader(host, "Unable to read the presentation.");
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
  const appends = edits.filter(edit => edit.type === "append");
  const layouts = appends.length ? listLayouts(host) : [];
  const { width, height } = slideSize(host);
  const grid = boxes(width, height);
  const override = appends.length > 0 && placeholdersMisfit(host, width);
  const push = (op: AutomationOperation) => { operations.push(op); return { result: operations.length - 1 }; };
  const textBox = (container: { result: number }, text: string, box: Box, font: { size: number; bold?: boolean }, bullets = false) => {
    const shape = push({ op: "addShape", container, shape: { kind: "textBox", text }, box });
    push({ op: "setFont", shape, font });
    if (bullets) push({ op: "setParagraph", shape, paragraph: { bulletVisible: true, bulletType: "char" } });
    return shape;
  };
  // Slide numbers in edits always mean the ORIGINAL deck. Bind every slide that is deleted or moved up front,
  // so the handles stay valid while earlier deletes and moves shift positions.
  const bound = new Map<number, { result: number }>();
  for (const edit of edits)
    if ((edit.type === "deleteSlide" || edit.type === "moveSlide") && !bound.has(edit.slide))
      bound.set(edit.slide, push({ op: "getSlide", key: { index: edit.slide } }));
  const bodySize = Math.round(height * 0.042);
  const titleSize = Math.round(height * 0.075);

  for (const edit of edits) {
    if (edit.type === "replace") {
      const slide = push({ op: "getSlide", key: { index: edit.slide } });
      const shape = push({ op: "getShape", container: slide, key: { index: edit.shape } });
      push({ op: "setText", shape, text: edit.text });
      continue;
    }
    if (edit.type === "deleteSlide" || edit.type === "moveSlide") continue;
    if (edit.type === "addText") {
      const slide = push({ op: "getSlide", key: { index: edit.slide } });
      textBox(slide, edit.text, grid.body, { size: bodySize });
      continue;
    }

    const layout = pickLayout(layouts, edit.table ? "table" : edit.layout ?? "content");
    const slide = push({ op: "addSlide", layoutId: layout.id });
    const lines = edit.bullets?.length ? edit.bullets : (edit.body ?? "").split("\n").filter(line => line.trim());
    const hero = layout.type === "title" || layout.type === "secHead";
    const hasTitle = layout.type === "obj" || layout.type === "titleOnly" || hero;
    const hasBody = layout.type === "obj" || hero;
    if (hasTitle) {
      const title = push({ op: "getShape", container: slide, key: { index: 0 } });
      push({ op: "setText", shape: title, text: edit.title });
      if (override) push({ op: "setShape", shape: title, props: hero ? grid.heroTitle : grid.title });
    } else {
      textBox(slide, edit.title, grid.title, { size: titleSize, bold: true });
    }
    if (lines.length) {
      if (hasBody) {
        const body = push({ op: "getShape", container: slide, key: { index: 1 } });
        push({ op: "setText", shape: body, text: hero ? lines.join(" ") : lines.join("\n") });
        push({ op: "setTextFrame", shape: body, props: { autoSize: "normal" } });
        if (override) push({ op: "setShape", shape: body, props: hero ? grid.heroBody : grid.body });
      } else {
        textBox(slide, lines.join("\n"), grid.body, { size: bodySize }, lines.length > 1);
      }
    }
    if (edit.table) {
      const values = [edit.table.header, ...edit.table.rows];
      const rows = values.length;
      const top = grid.body.top;
      const table = push({ op: "addShape", container: slide, shape: { kind: "table", rows, columns: edit.table.header.length, values }, box: { left: grid.body.left, top, width: grid.body.width, height: Math.min(grid.body.height, rows * height * 0.08) } });
      for (let column = 0; column < edit.table.header.length; column++) push({ op: "setFont", shape: table, cell: { row: 0, column }, font: { bold: true } });
    }
  }
  // Structure changes go last so text edits and appends above still see the original numbering: deletes, then moves in order.
  for (const edit of edits) if (edit.type === "deleteSlide") push({ op: "deleteSlide", slide: bound.get(edit.slide)! });
  for (const edit of edits) if (edit.type === "moveSlide") push({ op: "moveSlide", slide: bound.get(edit.slide)!, index: edit.to });
  if (!operations.length || !host.execute({ operations, expectedRevision: revision }).ok)
    throw new Error("Slides changed or an edit was invalid. Request the edit again.");
}
