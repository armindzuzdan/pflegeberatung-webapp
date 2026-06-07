import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

function drawText(page, text, x, y, size = 12) {
  if (!text) return;
  page.drawText(String(text), {
    x,
    y,
    size,
    color: rgb(0, 0, 0),
  });
}

function drawX(page, checked, x, y, size = 14) {
  if (!checked) return;
  page.drawText("X", {
    x,
    y,
    size,
    color: rgb(0, 0, 0),
  });
}

function drawTextBoxes(page, text, x, y, options = {}) {
  const {
    size = 16,
    step = 26,
    maxChars = 999,
    transform = null,
  } = options;

  if (!text) return;

  let value = String(text);
  if (transform) value = transform(value);

  const chars = value.slice(0, maxChars).split("");

  chars.forEach((char, index) => {
    page.drawText(char, {
      x: x + index * step,
      y,
      size,
      color: rgb(0, 0, 0),
    });
  });
}

function splitName(fullName = "") {
  const parts = String(fullName).trim().split(/\s+/);
  if (parts.length <= 1) {
    return { firstName: "", lastName: fullName || "" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();

  return `${dd}.${mm}.${yyyy}`;
}

async function dataUrlToPngBytes(dataUrl) {
  const res = await fetch(dataUrl);
  return await res.arrayBuffer();
}

async function embedSignature(pdfDoc, dataUrl) {
  if (!dataUrl || !dataUrl.startsWith("data:image")) return null;
  const pngBytes = await dataUrlToPngBytes(dataUrl);
  return await pdfDoc.embedPng(pngBytes);
}

function drawMultilineText(page, text, x, startY, maxWidth, lineHeight = 14, size = 11) {
  if (!text) return;

  const words = String(text).split(/\s+/);
  let line = "";
  let y = startY;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const estimatedWidth = testLine.length * (size * 0.52);

    if (estimatedWidth > maxWidth && line) {
      drawText(page, line, x, y, size);
      line = word;
      y -= lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line) {
    drawText(page, line, x, y, size);
  }
}

export async function generateSafariPdf({ patient, beratung }) {
  if (!patient || !beratung) {
    throw new Error("Patient oder Beratung fehlt.");
  }

  const existingPdfBytes = await fetch("/demo-assets/safari-demo-template.pdf").then((res) => {
    if (!res.ok) throw new Error("Demo-PDF-Vorlage wurde nicht gefunden.");
    return res.arrayBuffer();
  });

  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  if (pages.length < 4) {
    throw new Error("Die Demo-PDF-Vorlage muss mindestens 4 Seiten haben.");
  }

  pages.forEach((page) => page.setFont(font));

  const page1 = pages[0];
  const page2 = pages[1];
  const page3 = pages[2];
  const page4 = pages[3];

  const { firstName, lastName } = splitName(patient.name);
  const street = patient.adresse || "";
  const zip = patient.plz || "";
  const city = patient.ort || "";

  const birthDate = formatDate(patient.geburtsdatum || "");
  const visitDate = formatDate(beratung.unterschrift_datum || beratung.datum || "");

  const sig1 = await embedSignature(pdfDoc, beratung.unterschrift_pflegebeduerftiger_b64);
  const sig2 = await embedSignature(pdfDoc, beratung.unterschrift_beratungsperson_b64);

  let massnahmen = [];
  try {
    massnahmen = JSON.parse(beratung.massnahmen_json || "[]");
    if (!Array.isArray(massnahmen)) massnahmen = [];
  } catch {
    massnahmen = [];
  }

  const hasMeasures = massnahmen.length > 0 || !!beratung.massnahmen_freitext;
  const hasMeasure = (name) => massnahmen.includes(name);

  // ===== Seite 1 =====
  drawTextBoxes(page1, patient.pflegeversichertennummer || "", 65, 672, {
    size: 16,
    step: 19,
    maxChars: 17,
  });

  drawTextBoxes(page1, lastName || "", 65, 635, {
    size: 16,
    step: 18,
    maxChars: 28,
  });

  drawTextBoxes(page1, firstName || "", 65, 605, {
    size: 16,
    step: 17,
    maxChars: 28,
  });

  drawTextBoxes(page1, birthDate, 65, 570, {
    size: 16,
    step: 13,
    maxChars: 10,
  });

  drawTextBoxes(page1, street, 65, 535, {
    size: 16,
    step: 24,
    maxChars: 32,
  });

  drawTextBoxes(page1, zip, 66, 502, {
    size: 16,
    step: 14,
    maxChars: 5,
  });

  drawTextBoxes(page1, city, 162, 502, {
    size: 16,
    step: 19,
    maxChars: 28,
  });

  drawTextBoxes(page1, visitDate, 300, 450, {
    size: 16,
    step: 13,
    maxChars: 10,
  });

  drawTextBoxes(page1, beratung.uhr_von || "", 141, 420, {
    size: 16, 
    step: 10,
    maxChars: 5,
  });

  drawTextBoxes(page1, beratung.uhr_bis || "", 241, 420, {
    size: 16,
    step: 12,
    maxChars: 5,
  });

  drawX(page1, !!beratung.videokonferenz, 67, 388, 20);

  drawMultilineText(page1, beratung.einschaetzung_pflegebeduerftiger, 70, 275, 450, 20, 14);
  drawMultilineText(page1, beratung.einschaetzung_beratungsperson, 70, 175, 450, 20, 14);

  // ===== Seite 2 =====
  drawX(page2, beratung.pflege_sichergestellt === true || beratung.pflege_sichergestellt === 1, 70, 732, 20);
  drawX(page2, beratung.pflege_sichergestellt === false || beratung.pflege_sichergestellt === 0, 189, 732, 20);
  drawMultilineText(page2, beratung.pflege_sichergestellt_weil, 68, 703, 470, 18, 12);

  drawX(page2, !hasMeasures, 70, 565, 20);
  drawX(page2, hasMeasures, 70, 545, 20);

  drawX(page2, hasMeasure("Pflegekurs/-schulung"), 70, 520, 20);
  drawX(page2, hasMeasure("Tages-/Nachtpflege"), 202, 520, 20);
  drawX(page2, hasMeasure("Pflegesachleistungen"), 402, 520, 20);

  drawX(page2, hasMeasure("Kombinationsleistung"), 70, 502, 20);
  drawX(page2, hasMeasure("Angebote zur Unterstützung im Alltag"), 202, 502, 20);
  drawX(page2, hasMeasure("Kurzzeitpflege"), 402, 502, 20);

  drawX(page2, hasMeasure("Verhinderungspflege"), 70, 484, 20);
  drawX(page2, hasMeasure("Pflege-/Hilfsmittel/technische Hilfen"), 202, 484, 20);
  drawX(page2, hasMeasure("Wohnraumanpassung"), 402, 484, 20);

  drawX(page2, hasMeasure("Rehabilitationsleistungen"), 70, 464, 20);
  drawX(page2, hasMeasure("erneute Pflegebegutachtung"), 202, 464, 20);
  drawX(page2, hasMeasure("Freistellungsmöglichkeiten Pflegezeit/Familienpflegezeit"), 402, 462, 20);

  drawX(page2, !!beratung.massnahmen_freitext, 70, 430, 20);
  drawMultilineText(page2, beratung.massnahmen_freitext, 68, 406, 470, 18, 12);

  drawX(page2, !!beratung.pflegeberatung7a_angezeigt, 80, 277, 20);
  drawX(page2, !!beratung.wunsch_beratung7a, 75, 180, 20);

  // ===== Seite 3 =====  
  drawX(page3, !!beratung.einw_z3, 70, 272, 20);
  drawX(page3, !!beratung.einw_z4, 70, 231, 20);
  drawX(page3, !!beratung.einw_inaugenschein, 70, 73, 20);

  // ===== Seite 4 =====
  drawX(page4, !!beratung.einw_7a_verarbeitung, 70, 710, 20);

  drawText(
    page4,
    `${beratung.unterschrift_ort || ""}${beratung.unterschrift_datum ? ", " + formatDate(beratung.unterschrift_datum) : ""}`,
    72,
    610,
    20
  );

  if (sig1) {
    page4.drawImage(sig1, {
      x: 70,
      y: 419,
      width: 170,
      height: 55,
    });
  }

  if (sig2) {
    page4.drawImage(sig2, {
      x: 310,
      y: 610,
      width: 170,
      height: 55,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `Safari_Beratung_${beratung.id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}
