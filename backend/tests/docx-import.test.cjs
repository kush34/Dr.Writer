const { test } = require("node:test");
const assert = require("node:assert/strict");
const JSZip = require("jszip"); // a dependency of mammoth, used here only to build a small .docx
const { htmlToTiptap } = require("../dist/utils/htmlToTiptap");
const { docxToTiptap } = require("../dist/utils/docxImport");

const text = (value, ...marks) => (marks.length ? { type: "text", text: value, marks: marks.map(type => ({ type })) } : { type: "text", text: value });

test("paragraphs, headings and inline marks map to TipTap nodes", () => {
  const doc = htmlToTiptap('<h2>Plan</h2><p>Plain <strong>bold</strong> and <em><strong>both</strong></em> &amp; <u>under</u><sup>2</sup></p><p>a<br />b</p>');
  assert.deepEqual(doc, {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 2 }, content: [text("Plan")] },
      { type: "paragraph", content: [text("Plain "), text("bold", "bold"), text(" and "), { type: "text", text: "both", marks: [{ type: "italic" }, { type: "bold" }] }, text(" & "), text("under", "underline"), text("2", "superscript")] },
      { type: "paragraph", content: [text("a"), { type: "hardBreak" }, text("b")] },
    ],
  });
});

test("paragraph breaks survive: separate paragraphs stay separate", () => {
  const doc = htmlToTiptap("<p>one</p><p>two</p><p>three</p>");
  assert.equal(doc.content.length, 3);
  assert.deepEqual(doc.content.map(node => node.content[0].text), ["one", "two", "three"]);
});

test("nested lists keep their structure", () => {
  const doc = htmlToTiptap("<ul><li>a<ul><li>a1</li></ul></li><li>b</li></ul><ol><li>x</li></ol>");
  assert.deepEqual(doc.content[0], {
    type: "bulletList",
    content: [
      { type: "listItem", content: [{ type: "paragraph", content: [text("a")] }, { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [text("a1")] }] }] }] },
      { type: "listItem", content: [{ type: "paragraph", content: [text("b")] }] },
    ],
  });
  assert.equal(doc.content[1].type, "orderedList");
});

test("links keep safe URLs only; anchors and unsafe links keep their text", () => {
  const doc = htmlToTiptap('<p><a href="https://example.com/a?b=1&amp;c=2">site</a> <a id="_Toc1"></a><a href="#_Toc1">jump</a> <a href="javascript:alert(1)">bad</a></p>');
  assert.deepEqual(doc.content[0].content[0], { type: "text", text: "site", marks: [{ type: "link", attrs: { href: "https://example.com/a?b=1&c=2" } }] });
  assert.equal(doc.content[0].content[1].text, " jump bad", "unlinked text merges into one node");
  assert.equal(doc.content[0].content[1].marks, undefined);
});

test("block quotes map, tables flatten to one paragraph per row, images are dropped", () => {
  const doc = htmlToTiptap('<blockquote><p>quoted</p></blockquote><table><tr><td><p>A</p></td><td><p>B <strong>x</strong></p></td></tr><tr><td>C</td><td>D</td></tr></table><p><img src="" />after</p>');
  assert.deepEqual(doc.content[0], { type: "blockquote", content: [{ type: "paragraph", content: [text("quoted")] }] });
  assert.deepEqual(doc.content[1], { type: "paragraph", content: [text("A | B "), text("x", "bold")] });
  assert.deepEqual(doc.content[2], { type: "paragraph", content: [text("C | D")] });
  assert.deepEqual(doc.content[3], { type: "paragraph", content: [text("after")] });
});

test("empty input gives one empty paragraph, and hostile nesting is refused", () => {
  assert.deepEqual(htmlToTiptap(""), { type: "doc", content: [{ type: "paragraph" }] });
  assert.deepEqual(htmlToTiptap("   "), { type: "doc", content: [{ type: "paragraph" }] });
  assert.throws(() => htmlToTiptap("<ul><li>".repeat(500) + "x"), /nesting/);
});

const makeDocx = async bodyXml => {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file("_rels/.rels", '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file("word/document.xml", `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${bodyXml}</w:body></w:document>`);
  return zip.generateAsync({ type: "nodebuffer" });
};

test("a real .docx keeps paragraph breaks, bold and underline instead of one flat string", async () => {
  const run = (t, props = "") => `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ""}<w:t xml:space="preserve">${t}</w:t></w:r>`;
  const buffer = await makeDocx(
    `<w:p>${run("First paragraph with ")}${run("bold", "<w:b/>")}${run(" and ")}${run("underline", '<w:u w:val="single"/>')}</w:p><w:p>${run("Second paragraph")}</w:p>`
  );
  const doc = await docxToTiptap(buffer);
  assert.equal(doc.type, "doc");
  assert.equal(doc.content.length, 2);
  assert.deepEqual(doc.content[0].content.map(node => [node.text, node.marks?.[0]?.type]), [["First paragraph with ", undefined], ["bold", "bold"], [" and ", undefined], ["underline", "underline"]]);
  assert.equal(doc.content[1].content[0].text, "Second paragraph");
});

test("a file that is not a .docx is rejected", async () => {
  await assert.rejects(docxToTiptap(Buffer.from("not a zip")));
});
