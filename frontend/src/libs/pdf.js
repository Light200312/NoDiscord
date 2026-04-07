function escapePdfText(value = "") {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapText(text = "", maxChars = 92) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (!words.length) return [""];

  const lines = [];
  let current = words[0];
  for (let index = 1; index < words.length; index += 1) {
    const next = words[index];
    if (`${current} ${next}`.length <= maxChars) {
      current = `${current} ${next}`;
    } else {
      lines.push(current);
      current = next;
    }
  }
  lines.push(current);
  return lines;
}

function toPdfLines(sections = []) {
  const lines = [];
  sections.forEach((section) => {
    if (section.type === "title") {
      lines.push({ text: section.text, size: 18 });
      lines.push({ text: "", size: 12 });
      return;
    }
    if (section.type === "heading") {
      lines.push({ text: section.text, size: 14 });
      return;
    }
    if (section.type === "list") {
      section.items.forEach((item) => {
        wrapText(`- ${item}`, 92).forEach((line) => lines.push({ text: line, size: 11 }));
      });
      lines.push({ text: "", size: 11 });
      return;
    }
    wrapText(section.text || "", 92).forEach((line) => lines.push({ text: line, size: 11 }));
    lines.push({ text: "", size: 11 });
  });
  return lines;
}

function buildPdf(textLines = []) {
  const pageHeight = 792;
  const topMargin = 50;
  const bottomMargin = 50;
  const lineHeight = 16;
  const maxLinesPerPage = Math.floor((pageHeight - topMargin - bottomMargin) / lineHeight);
  const pages = [];

  for (let index = 0; index < textLines.length; index += maxLinesPerPage) {
    pages.push(textLines.slice(index, index + maxLinesPerPage));
  }

  const objects = [];
  let objectIndex = 1;

  const catalogId = objectIndex++;
  const pagesId = objectIndex++;
  const fontId = objectIndex++;

  const pageIds = [];
  const contentIds = [];

  pages.forEach(() => {
    pageIds.push(objectIndex++);
    contentIds.push(objectIndex++);
  });

  objects[catalogId] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId] = `<< /Type /Pages /Count ${pages.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`;
  objects[fontId] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`;

  pages.forEach((pageLines, pageIndex) => {
    const textCommands = pageLines
      .map((line, lineIndex) => {
        const y = pageHeight - topMargin - lineIndex * lineHeight;
        const size = line.size || 11;
        return `BT /F1 ${size} Tf 50 ${y} Td (${escapePdfText(line.text)}) Tj ET`;
      })
      .join("\n");
    const content = `${textCommands}\n`;
    objects[contentIds[pageIndex]] = `<< /Length ${content.length} >>\nstream\n${content}endstream`;
    objects[pageIds[pageIndex]] =
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentIds[pageIndex]} 0 R >>`;
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += "0000000000 65535 f \n";
  for (let id = 1; id < objects.length; id += 1) {
    pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return pdf;
}

export function downloadPdf(filename, sections) {
  const pdf = buildPdf(toPdfLines(sections));
  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
