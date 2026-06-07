import { useEffect, useMemo, useRef, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { FiEdit2, FiPlus, FiTrash2, FiX } from "react-icons/fi";
import { generateSafariPdf } from "./utils/generateSafariPdf";
import { createDemoStore } from "./data/demoData";

const DEMO = true;
const LS_KEY = "pflege_demo_v1";

/* =========================
   Toast
========================= */
function Toast({ message, onClose }) {
  if (!message) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: 22,
        zIndex: 2000,
        width: "min(720px, calc(100% - 30px))",
        background: "white",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 16,
        boxShadow: "0 18px 40px rgba(15,23,42,0.16)",
        padding: "14px 14px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 999,
            background: "rgba(16,185,129,0.14)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#10b981",
            fontWeight: 900,
          }}
        >
          ✓
        </div>
        <div style={{ fontWeight: 700 }}>{message}</div>
      </div>

      <button className="icon-btn" type="button" onClick={onClose} title="Schließen">
        <FiX />
      </button>
    </div>
  );
}

/* =========================
   SignaturePad
========================= */
function SignaturePad({ value, onChange, height = 140 }) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);

  const drawingRef = useRef(false);
  const pointerIdRef = useRef(null);
  const pointsRef = useRef([]);
  const strokesRef = useRef([]);


  const getCanvasContext = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  };

  const getDisplaySize = () => {
    const wrapper = wrapperRef.current;
    if (!wrapper) {
      return { width: 1, height: Math.max(1, height) };
    }

    const rect = wrapper.getBoundingClientRect();
    return {
      width: Math.max(1, Math.round(rect.width)),
      height: Math.max(1, Math.round(height)),
    };
  };

  const configureContext = (ctx) => {
    if (!ctx) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
    ctx.fillStyle = "#111827";
    ctx.imageSmoothingEnabled = true;
  };

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { width, height: displayHeight } = getDisplaySize();
    const ratio = Math.max(window.devicePixelRatio || 1, 1);

    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(displayHeight * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${displayHeight}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    configureContext(ctx);
  };

  const clearCanvas = () => {
    const ctx = getCanvasContext();
    if (!ctx) return;

    const { width, height: displayHeight } = getDisplaySize();
    ctx.clearRect(0, 0, width, displayHeight);
  };

  const drawDot = (ctx, point) => {
    const size = point.width || 1.8;
    ctx.beginPath();
    ctx.arc(point.x, point.y, size / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawStroke = (ctx, points) => {
    if (!ctx || !points || points.length === 0) return;

    if (points.length === 1) {
      drawDot(ctx, points[0]);
      return;
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];

      const midX = (current.x + next.x) / 2;
      const midY = (current.y + next.y) / 2;

      ctx.lineWidth = current.width || 2;
      ctx.quadraticCurveTo(current.x, current.y, midX, midY);
    }

    const last = points[points.length - 1];
    ctx.lineWidth = last.width || 2;
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
  };

  const redrawAll = () => {
    clearCanvas();
    const ctx = getCanvasContext();
    if (!ctx) return;

    for (const stroke of strokesRef.current) {
      drawStroke(ctx, stroke);
    }

    if (pointsRef.current.length) {
      drawStroke(ctx, pointsRef.current);
    }
  };

  const exportSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL("image/png"));
  };

  const getPointFromEvent = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const pressure =
      event.pointerType === "pen"
        ? Math.max(0.2, Math.min(event.pressure || 0.5, 1))
        : 0.55;

    const width = 1.6 + pressure * 1.6;

    return { x, y, width };
  };

  const beginStroke = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (event.button !== undefined && event.button !== 0) return;

    event.preventDefault();

    const point = getPointFromEvent(event);
    if (!point) return;

    drawingRef.current = true;
    pointerIdRef.current = event.pointerId;
    pointsRef.current = [point];

    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // ignore safely
    }

    redrawAll();
  };

  const moveStroke = (event) => {
    if (!drawingRef.current) return;
    if (pointerIdRef.current !== null && event.pointerId !== pointerIdRef.current) return;

    event.preventDefault();

    const point = getPointFromEvent(event);
    if (!point) return;

    const currentPoints = pointsRef.current;
    const lastPoint = currentPoints[currentPoints.length - 1];

    if (!lastPoint) {
      pointsRef.current = [point];
      redrawAll();
      return;
    }

    const dx = point.x - lastPoint.x;
    const dy = point.y - lastPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 0.5) return;

    currentPoints.push(point);
    redrawAll();
  };

  const endStroke = (event) => {
    if (!drawingRef.current) return;
    if (pointerIdRef.current !== null && event.pointerId !== pointerIdRef.current) return;

    event.preventDefault();

    drawingRef.current = false;

    const finishedStroke = [...pointsRef.current];
    pointsRef.current = [];

    if (finishedStroke.length > 0) {
      strokesRef.current.push(finishedStroke);
      redrawAll();
      exportSignature();
    }

    const canvas = canvasRef.current;
    if (canvas && pointerIdRef.current !== null) {
      try {
        canvas.releasePointerCapture(pointerIdRef.current);
      } catch {
        // ignore safely
      }
    }

    pointerIdRef.current = null;
  };

  const handleClear = () => {
    strokesRef.current = [];
    pointsRef.current = [];
    drawingRef.current = false;
    pointerIdRef.current = null;
    clearCanvas();
    onChange("");
  };

  const restoreFromDataUrl = (dataUrl) => {
    const canvas = canvasRef.current;
    const ctx = getCanvasContext();
    if (!canvas || !ctx) return;

    clearCanvas();
    strokesRef.current = [];
    pointsRef.current = [];

    if (!dataUrl) return;

    const img = new Image();
    img.onload = () => {
      const { width, height: displayHeight } = getDisplaySize();

      clearCanvas();

      const scale = Math.min(width / img.width, displayHeight / img.height);
      const drawWidth = img.width * scale;
      const drawHeight = img.height * scale;
      const offsetX = (width - drawWidth) / 2;
      const offsetY = (displayHeight - drawHeight) / 2;

      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    };
    img.src = dataUrl;
  };

 useEffect(() => {
  resizeCanvas();

  if (value) {
    restoreFromDataUrl(value);
  }

  const handleResize = () => {
    resizeCanvas();

    if (strokesRef.current.length > 0 || pointsRef.current.length > 0) {
      redrawAll();
    } else if (value) {
      restoreFromDataUrl(value);
    }
  };

  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, [height]);


  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 12,
        background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
        boxShadow: "0 8px 22px rgba(15,23,42,0.05)",
      }}
    >
      <div
        ref={wrapperRef}
        style={{
          position: "relative",
          width: "100%",
          height,
          borderRadius: 12,
          overflow: "hidden",
          background: "#ffffff",
          border: "1px solid #dbe4ee",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            cursor: "crosshair",
            touchAction: "none",
            background: "transparent",
          }}
          onPointerDown={beginStroke}
          onPointerMove={moveStroke}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onPointerLeave={endStroke}
        />

        <div
          style={{
            position: "absolute",
            left: 18,
            right: 18,
            bottom: 18,
            borderBottom: "2px solid rgba(148,163,184,0.35)",
            pointerEvents: "none",
          }}
        />

        {!value && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#94a3b8",
              fontSize: 13,
              fontWeight: 600,
              pointerEvents: "none",
            }}
          >
            Sign here
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: 10,
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <button className="button button-ghost" type="button" onClick={handleClear}>
          Unterschrift löschen
        </button>
        <span className="sig-hint">Works with mouse, touch and pen.</span>
      </div>
    </div>
  );
}

/* =========================
   DEMO STORAGE API
========================= */
function nowIso() {
  return new Date().toISOString();
}
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function loadStore() {
  const raw = localStorage.getItem(LS_KEY);
  if (raw) return JSON.parse(raw);

  const seeded = createDemoStore({ nowIso, addDays });

  localStorage.setItem(LS_KEY, JSON.stringify(seeded));
  return seeded;
}

function saveStore(store) {
  localStorage.setItem(LS_KEY, JSON.stringify(store));
}

function demoApi() {
  const getDashboard = async () => {
    const s = loadStore();
    const offene = s.termine.filter((t) => t.status === "offen").length;
    const erledigt = s.termine.filter((t) => t.status === "erledigt").length;
    return { offene, erledigt };
  };

  const listPatients = async () => {
    const s = loadStore();
    return [...s.patients].sort((a, b) => b.id - a.id);
  };

const createPatient = async (payload) => {
  const s = loadStore();
  const id = s.counters.patientId++;

  const p = {
    id,
    name: payload.name,
    geburtsdatum: payload.geburtsdatum,
    adresse: payload.adresse,
    plz: payload.plz || "",
    ort: payload.ort || "",
    pflegegrad: Number(payload.pflegegrad),
    pflegeversichertennummer: payload.pflegeversichertennummer || "",
  };

  s.patients.push(p);

  // Direkt beim Erstellen 2 Termine anlegen:
  // 1. Meldetermin / Rückruf
  // 2. Richtiger Beratungstermin
  if (payload.meldedatum) {
    s.termine.push({
      id: s.counters.terminId++,
      patientId: id,
      beratungId: null,
      typ: "Anfrage",
      datum: new Date(payload.meldedatum).toISOString(),
      status: "offen",
      patientName: payload.name,
    });
  }

  if (payload.beratungsdatum) {
    s.termine.push({
      id: s.counters.terminId++,
      patientId: id,
      beratungId: null,
      typ: "Beratung",
      datum: new Date(payload.beratungsdatum).toISOString(),
      status: "offen",
      patientName: payload.name,
    });
  }

  saveStore(s);
  return { id };
};

  const updatePatient = async (id, payload) => {
    const s = loadStore();
    const idx = s.patients.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error("Patient nicht gefunden");
    s.patients[idx] = { ...s.patients[idx], ...payload, pflegegrad: Number(payload.pflegegrad) };
    // patientName in termine aktualisieren
    s.termine = s.termine.map((t) =>
      t.patientId === id ? { ...t, patientName: s.patients[idx].name } : t
    );
    saveStore(s);
    return { message: "ok" };
  };

  const deletePatient = async (id) => {
    const s = loadStore();
    s.termine = s.termine.filter((t) => t.patientId !== id);
    s.beratungen = s.beratungen.filter((b) => b.patientId !== id);
    s.patients = s.patients.filter((p) => p.id !== id);
    saveStore(s);
    return { message: "ok" };
  };

  const patientDetails = async (id) => {
    const s = loadStore();
    const patient = s.patients.find((p) => p.id === id);
    if (!patient) throw new Error("Patient nicht gefunden");

    const beratungen = s.beratungen
      .filter((b) => b.patientId === id)
      .sort((a, b) => new Date(b.datum) - new Date(a.datum));

    const termine = s.termine
      .filter((t) => t.patientId === id)
      .sort((a, b) => new Date(a.datum) - new Date(b.datum));

    return { patient, beratungen, termine };
  };

  const termineByStatus = async (status) => {
    const s = loadStore();
    const rows = s.termine
      .filter((t) => t.status === status)
      .sort((a, b) => new Date(a.datum) - new Date(b.datum))
      .map((t) => ({
        ...t,
        patientName: t.patientName || s.patients.find((p) => p.id === t.patientId)?.name || "",
      }));
    return rows;
  };

  const updateTerminStatus = async (id, status) => {
    const s = loadStore();
    const idx = s.termine.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error("Termin nicht gefunden");
    s.termine[idx].status = status;
    saveStore(s);
    return { message: "ok" };
  };

  const createBeratung = async (payload) => {
    const s = loadStore();
    const id = s.counters.beratungId++;
    const b = {
      id,
      patientId: payload.patientId,
      datum: payload.datum || nowIso(),
      uhr_von: payload.uhr_von || "",
      uhr_bis: payload.uhr_bis || "",
      videokonferenz: payload.videokonferenz ? 1 : 0,
      einschaetzung_pflegebeduerftiger: "",
      einschaetzung_beratungsperson: "",
      pflege_sichergestellt: null,
      pflege_sichergestellt_weil: "",
      massnahmen_json: "[]",
      massnahmen_freitext: "",
      pflegeberatung7a_angezeigt: 0,
      wunsch_beratung7a: 0,
      einw_z3: 0,
      einw_z4: 0,
      einw_inaugenschein: 0,
      einw_7a_verarbeitung: 0,
      unterschrift_ort: "",
      unterschrift_datum: "",
      unterschrift_pflegebeduerftiger_b64: "",
      unterschrift_beratungsperson_b64: "",
      status: "entwurf",
    };
    s.beratungen.push(b);
    saveStore(s);
    return { id };
  };

  const updateBeratung = async (id, payload) => {
    const s = loadStore();
    const idx = s.beratungen.findIndex((b) => b.id === id);
    if (idx === -1) throw new Error("Beratung nicht gefunden");

    const merged = { ...s.beratungen[idx], ...payload };

    // normalize bools
    const boolToInt = (v) => (v === true ? 1 : v === false ? 0 : v);
    merged.videokonferenz = boolToInt(merged.videokonferenz);
    merged.pflegeberatung7a_angezeigt = boolToInt(merged.pflegeberatung7a_angezeigt);
    merged.wunsch_beratung7a = boolToInt(merged.wunsch_beratung7a);
    merged.einw_z3 = boolToInt(merged.einw_z3);
    merged.einw_z4 = boolToInt(merged.einw_z4);
    merged.einw_inaugenschein = boolToInt(merged.einw_inaugenschein);
    merged.einw_7a_verarbeitung = boolToInt(merged.einw_7a_verarbeitung);
    merged.pflege_sichergestellt =
      payload.pflege_sichergestellt === null || payload.pflege_sichergestellt === undefined
        ? merged.pflege_sichergestellt
        : boolToInt(payload.pflege_sichergestellt);

    s.beratungen[idx] = merged;
    saveStore(s);
    return { message: "ok" };
  };

  const deleteBeratung = async (id) => {
    const s = loadStore();
    const b = s.beratungen.find((x) => x.id === id);
    if (!b) throw new Error("Beratung nicht gefunden");

    s.termine = s.termine.filter((t) => t.beratungId !== id);
    s.beratungen = s.beratungen.filter((x) => x.id !== id);

    saveStore(s);
    return { message: "ok" };
  };

  const abschliessen = async (id) => {
    const s = loadStore();
    const idx = s.beratungen.findIndex((b) => b.id === id);
    if (idx === -1) throw new Error("Beratung nicht gefunden");
    const b = s.beratungen[idx];

    // Minimal-Validierung wie bei dir:
    if (!b.uhr_von || !b.uhr_bis) throw new Error("Bitte Uhrzeit von/bis ausfüllen.");
    if (!b.einschaetzung_beratungsperson) throw new Error("Bitte Einschätzung der Beratungsperson (Ziffer 2) ausfüllen.");
    if (b.pflege_sichergestellt === null || b.pflege_sichergestellt === undefined)
      throw new Error("Bitte angeben, ob die Pflege sichergestellt ist (Ziffer 3).");
    if (b.pflege_sichergestellt === 0 && !b.pflege_sichergestellt_weil)
      throw new Error("Wenn Pflege nicht sichergestellt: bitte 'weil' ausfüllen (Ziffer 3).");

    const hasSigPflege = !!(b.unterschrift_pflegebeduerftiger_b64 && b.unterschrift_pflegebeduerftiger_b64.startsWith("data:image"));
    const hasSigBerater = !!(b.unterschrift_beratungsperson_b64 && b.unterschrift_beratungsperson_b64.startsWith("data:image"));

    if (b.videokonferenz) {
      if (!hasSigPflege && !hasSigBerater) throw new Error("Bitte mindestens eine Unterschrift erfassen (Video-Fall).");
    } else {
      if (!hasSigPflege) throw new Error("Bitte Unterschrift der pflegebedürftigen Person erfassen.");
    }

    // status setzen
    s.beratungen[idx] = { ...b, status: "abgeschlossen" };
s.termine = s.termine.filter((t) => t.patientId !== b.patientId);

    saveStore(s);
    return { message: "ok" };
  };

  const xmlExport = async (id) => {
    const s = loadStore();
    const b = s.beratungen.find((x) => x.id === id);
    if (!b) throw new Error("Beratung nicht gefunden");


    const p = s.patients.find((x) => x.id === b.patientId);
    const massnahmen = (() => {
      try { return JSON.parse(b.massnahmen_json || "[]"); } catch { return []; }
    })();

    // XML export with escaped form values.
    const esc = (v) =>
      String(v ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&apos;");

    return `<?xml version="1.0" encoding="UTF-8"?>
<NachweisBeratungsbesuch>
  <AngabenPflegebeduerftigePerson>
    <Pflegeversichertennummer>${esc(p?.pflegeversichertennummer)}</Pflegeversichertennummer>
    <Name>${esc(p?.name)}</Name>
    <Geburtsdatum>${esc(p?.geburtsdatum)}</Geburtsdatum>
    <Adresse>${esc(p?.adresse)}</Adresse>
    <Pflegegrad>${esc(p?.pflegegrad)}</Pflegegrad>
  </AngabenPflegebeduerftigePerson>
  <Beratungsbesuch>
    <Datum>${esc(b.datum)}</Datum>
    <UhrVon>${esc(b.uhr_von)}</UhrVon>
    <UhrBis>${esc(b.uhr_bis)}</UhrBis>
    <Videokonferenz>${b.videokonferenz ? "true" : "false"}</Videokonferenz>
  </Beratungsbesuch>
  <Einschaetzungen>
    <Ziffer1_PflegebeduerftigerPflegeperson>${esc(b.einschaetzung_pflegebeduerftiger)}</Ziffer1_PflegebeduerftigerPflegeperson>
    <Ziffer2_Beratungsperson>${esc(b.einschaetzung_beratungsperson)}</Ziffer2_Beratungsperson>
  </Einschaetzungen>
  <Ziffer3_Sicherstellung>
    <PflegeSichergestellt>${b.pflege_sichergestellt ? "Ja" : "Nein"}</PflegeSichergestellt>
    <Weil>${esc(b.pflege_sichergestellt_weil)}</Weil>
  </Ziffer3_Sicherstellung>
  <Ziffer4_Massnahmen>
    <MassnahmenAngeregt>${massnahmen.length ? "Ja" : "Nein"}</MassnahmenAngeregt>
    <Items>${esc(massnahmen.join(", "))}</Items>
    <Freitext>${esc(b.massnahmen_freitext)}</Freitext>
  </Ziffer4_Massnahmen>
  <Paragraph7a>
    <Angezeigt>${b.pflegeberatung7a_angezeigt ? "true" : "false"}</Angezeigt>
    <Gewuenscht>${b.wunsch_beratung7a ? "true" : "false"}</Gewuenscht>
  </Paragraph7a>
  <Einwilligungen>
    <Ziffer3_Uebermittlung>${b.einw_z3 ? "true" : "false"}</Ziffer3_Uebermittlung>
    <Ziffer4_Uebermittlung>${b.einw_z4 ? "true" : "false"}</Ziffer4_Uebermittlung>
    <Inaugenschein_Uebermittlung>${b.einw_inaugenschein ? "true" : "false"}</Inaugenschein_Uebermittlung>
    <Paragraf7a_Verarbeitung>${b.einw_7a_verarbeitung ? "true" : "false"}</Paragraf7a_Verarbeitung>
  </Einwilligungen>
  <Unterschrift>
    <Ort>${esc(b.unterschrift_ort)}</Ort>
    <Datum>${esc(b.unterschrift_datum)}</Datum>
    <PflegebeduerftigerVorhanden>${b.unterschrift_pflegebeduerftiger_b64 ? "true" : "false"}</PflegebeduerftigerVorhanden>
    <BeratungspersonVorhanden>${b.unterschrift_beratungsperson_b64 ? "true" : "false"}</BeratungspersonVorhanden>
  </Unterschrift>
</NachweisBeratungsbesuch>`;
  };

  return {
    getDashboard,
    listPatients,
    createPatient,
    updatePatient,
    deletePatient,
    patientDetails,
    termineByStatus,
    updateTerminStatus,
    createBeratung,
    updateBeratung,
    deleteBeratung,
    abschliessen,
    xmlExport,
  };
}

const DEMO_API = demoApi();

export default function App() {
  const [dashboard, setDashboard] = useState(null);
  const [patients, setPatients] = useState([]);

  const [openTermine, setOpenTermine] = useState([]);
  const [doneTermine, setDoneTermine] = useState([]);
  const [showAllTermine, setShowAllTermine] = useState(false);

  const [modalType, setModalType] = useState(null); // "new" | "edit" | null
  const [editPatient, setEditPatient] = useState(null);

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientDetails, setPatientDetails] = useState(null);

  const [selectedBeratungId, setSelectedBeratungId] = useState(null);
  const [beratungForm, setBeratungForm] = useState(null);

  const [signatureModal, setSignatureModal] = useState(null);
const [tempSignature, setTempSignature] = useState("");

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const massnahmenOptions = useMemo(
    () => [
      "Pflegekurs/-schulung",
      "Tages-/Nachtpflege",
      "Kombinationsleistung",
      "Angebote zur Unterstützung im Alltag",
      "Verhinderungspflege",
      "Pflege-/Hilfsmittel/technische Hilfen",
      "Rehabilitationsleistungen",
      "erneute Pflegebegutachtung",
      "Pflegesachleistungen",
      "Kurzzeitpflege",
      "Wohnraumanpassung",
      "Freistellungsmöglichkeiten Pflegezeit/Familienpflegezeit",
    ],
    []
  );

  const showToastMsg = (msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2600);
  };

  const refreshDashboard = async () => {
    if (DEMO) {
      setDashboard(await DEMO_API.getDashboard());
      return;
    }
    // später: echte API
  };

  const loadPatients = async () => {
    if (DEMO) {
      setPatients(await DEMO_API.listPatients());
      return;
    }
  };

  const loadTermine = async () => {
    if (DEMO) {
      const offen = await DEMO_API.termineByStatus("offen");
      setOpenTermine(Array.isArray(offen) ? offen : []);
      if (showAllTermine) {
        const erledigt = await DEMO_API.termineByStatus("erledigt");
        setDoneTermine(Array.isArray(erledigt) ? erledigt : []);
      }
      return;
    }
  };

  const loadPatientDetails = async (id) => {
    if (DEMO) {
      const data = await DEMO_API.patientDetails(id);
      setPatientDetails(data);
      return;
    }
  };

  useEffect(() => {
    const init = async () => {
      await refreshDashboard();
      await loadPatients();
      await loadTermine();
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadTermine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAllTermine]);

  useEffect(() => {
    if (!patientDetails || !selectedBeratungId) {
      setBeratungForm(null);
      return;
    }
    const b = patientDetails.beratungen.find((x) => x.id === selectedBeratungId);
    if (!b) return;

    let parsedMassnahmen = [];
    try {
      const parsed = JSON.parse(b.massnahmen_json || "[]");
      parsedMassnahmen = Array.isArray(parsed) ? parsed : [];
    } catch {
      parsedMassnahmen = [];
    }

    setBeratungForm({
      id: b.id,
      uhr_von: b.uhr_von || "",
      uhr_bis: b.uhr_bis || "",
      videokonferenz: !!b.videokonferenz,

      einschaetzung_pflegebeduerftiger: b.einschaetzung_pflegebeduerftiger || "",
      einschaetzung_beratungsperson: b.einschaetzung_beratungsperson || "",

      pflege_sichergestellt:
        b.pflege_sichergestellt === null || b.pflege_sichergestellt === undefined
          ? null
          : !!b.pflege_sichergestellt,
      pflege_sichergestellt_weil: b.pflege_sichergestellt_weil || "",

      massnahmen: parsedMassnahmen,
      massnahmen_freitext: b.massnahmen_freitext || "",

      pflegeberatung7a_angezeigt: !!b.pflegeberatung7a_angezeigt,
      wunsch_beratung7a: !!b.wunsch_beratung7a,

      einw_z3: !!b.einw_z3,
      einw_z4: !!b.einw_z4,
      einw_inaugenschein: !!b.einw_inaugenschein,
      einw_7a_verarbeitung: !!b.einw_7a_verarbeitung,

      unterschrift_ort: b.unterschrift_ort || "",
      unterschrift_datum: b.unterschrift_datum || "",
      unterschrift_pflegebeduerftiger_b64: b.unterschrift_pflegebeduerftiger_b64 || "",
      unterschrift_beratungsperson_b64: b.unterschrift_beratungsperson_b64 || "",

      status: b.status || "entwurf",
    });
  }, [patientDetails, selectedBeratungId]);

  const markTerminDone = async (termin) => {
    try {
      if (DEMO) {
        await DEMO_API.updateTerminStatus(termin.id, "erledigt");
      }
      showToastMsg(`${termin.typ}${termin.beratungId ? ` (#${termin.beratungId})` : ""} erledigt.`);
      await refreshDashboard();
      await loadTermine();
      if (selectedPatient) await loadPatientDetails(selectedPatient);
    } catch (e) {
      showToastMsg("Fehler: " + (e?.message || String(e)));
    }
  };

  const openPatient = async (p) => {
    setSelectedPatient(p.id);
    setSelectedBeratungId(null);
    setBeratungForm(null);
    await loadPatientDetails(p.id);
    showToastMsg(`Patient geöffnet: ${p.name}`);
  };

  const startNewBeratung = async () => {
    if (!selectedPatient) return;

    try {
      const json = await DEMO_API.createBeratung({
        patientId: selectedPatient,
        datum: nowIso(),
        uhr_von: "",
        uhr_bis: "",
        videokonferenz: false,
      });

      await loadPatientDetails(selectedPatient);
      setSelectedBeratungId(json.id);
      showToastMsg("Neue Beratung gestartet.");
    } catch (e) {
      showToastMsg(e?.message || "Konnte Beratung nicht starten");
    }
  };

  const saveBeratungDraft = async () => {
    if (!beratungForm?.id) return;

    setSaving(true);
    try {
      const payload = {
        ...beratungForm,
        massnahmen_json: JSON.stringify(beratungForm.massnahmen || []),
      };

      if (DEMO) {
        await DEMO_API.updateBeratung(beratungForm.id, payload);
      }

      await loadPatientDetails(selectedPatient);
      showToastMsg("Entwurf gespeichert.");
    } catch (e) {
      showToastMsg("Speichern fehlgeschlagen: " + (e?.message || String(e)));
    } finally {
      setSaving(false);
    }
  };

  const abschliessen = async () => {
    if (!beratungForm?.id) return;

    setSaving(true);
    try {
      await saveBeratungDraft();
      if (DEMO) {
        await DEMO_API.abschliessen(beratungForm.id);
      }

      await loadPatientDetails(selectedPatient);
      await refreshDashboard();
      await loadTermine();
      showToastMsg("Beratung abgeschlossen. Termine gesetzt.");
    } catch (e) {
      showToastMsg("Abschluss fehlgeschlagen: " + (e?.message || String(e)));
    } finally {
      setSaving(false);
    }
  };
  const openSignatureModal = (type) => {
  setSignatureModal(type);

  if (type === "pflege") {
    setTempSignature(beratungForm?.unterschrift_pflegebeduerftiger_b64 || "");
  } else {
    setTempSignature(beratungForm?.unterschrift_beratungsperson_b64 || "");
  }
};

  const downloadPdf = async () => {
  if (!beratungForm?.id || !patientDetails?.patient) return;

  try {
    const beratungsDatensatz =
      patientDetails.beratungen.find((b) => b.id === beratungForm.id) || {
        ...beratungForm,
        massnahmen_json: JSON.stringify(beratungForm.massnahmen || []),
      };

    await generateSafariPdf({
      patient: patientDetails.patient,
      beratung: {
        ...beratungsDatensatz,
        ...beratungForm,
        massnahmen_json: JSON.stringify(beratungForm.massnahmen || []),
      },
    });

    showToastMsg("PDF wurde erstellt.");
  } catch (e) {
    showToastMsg("PDF Fehler: " + (e?.message || String(e)));
  }
};

  const downloadXml = async () => {
    if (!beratungForm?.id) return;

    try {
      await saveBeratungDraft();
      const text = await DEMO_API.xmlExport(beratungForm.id);

      const blob = new Blob([text], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `beratung_${beratungForm.id}.xml`;
      a.click();
      URL.revokeObjectURL(url);

      showToastMsg("XML heruntergeladen.");
    } catch (e) {
      showToastMsg("XML Fehler: " + (e?.message || String(e)));
    }
  };

  const deleteBeratung = async (beratungId) => {
    if (!selectedPatient) return;
    if (!confirm(`Beratung #${beratungId} wirklich löschen?`)) return;

    try {
      await DEMO_API.deleteBeratung(beratungId);

      if (selectedBeratungId === beratungId) {
        setSelectedBeratungId(null);
        setBeratungForm(null);
      }

      await loadPatientDetails(selectedPatient);
      await refreshDashboard();
      await loadTermine();
      showToastMsg(`Beratung #${beratungId} gelöscht.`);
    } catch (e) {
      showToastMsg("Löschen fehlgeschlagen: " + (e?.message || String(e)));
    }
  };

  const terminPatientLabel = (t) => t.patientName || `Patient #${t.patientId}`;

  return (
    <div className="app-container">
      <h1>Pflegeberatung</h1>

      <div className="shell">
        {/* LEFT / SIDEBAR */}
        <div className="sidebar">
          {dashboard && (
            <div className="card compact">
              <div className="card-header" style={{ marginBottom: 10 }}>
                <div>
                  <h2>Termine</h2>
                  <div className="card-sub">Kurzüberblick</div>
                </div>
                <button className="button button-ghost" type="button" onClick={() => setShowAllTermine((s) => !s)}>
                  {showAllTermine ? "Aus" : "Alle"}
                </button>
              </div>

              <div className="kpis">
                <div className="kpi" style={{ borderColor: "rgba(245,158,11,0.25)" }}>
                  <div className="num">{dashboard.offene}</div>
                  <div className="lbl">Offen</div>
                </div>
                <div className="kpi" style={{ borderColor: "rgba(16,185,129,0.25)" }}>
                  <div className="num">{dashboard.erledigt}</div>
                  <div className="lbl">Erledigt</div>
                </div>
              </div>

              <div style={{ width: "100%", height: 150, marginTop: 12 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Offen", value: dashboard.offene },
                        { name: "Erledigt", value: dashboard.erledigt },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={62}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      <Cell fill="#f59e0b" />
                      <Cell fill="#10b981" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="card compact">
            <div className="card-header" style={{ marginBottom: 10 }}>
              <div>
                <h2>Offene Termine</h2>
                <div className="card-sub">Arbeitsliste</div>
              </div>
            </div>

            {openTermine.length === 0 ? (
              <div className="empty">Keine offenen Termine.</div>
            ) : (
              <div className="list" style={{ gap: 10 }}>
               {openTermine.map((t) => (
                  <div key={t.id} className="list-item" style={{ cursor: "default" }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="list-title" style={{ fontSize: 14 }}>
                        {t.typ} – {terminPatientLabel(t)}
                      </div>
                      <div className="list-meta" style={{ fontSize: 12 }}>
                        {new Date(t.datum).toLocaleString()}
                        {t.beratungId ? ` · #${t.beratungId}` : ""}
                      </div>
                    </div>
                    <button className="button" type="button" onClick={() => markTerminDone(t)}>
                      ✓
                    </button>
                  </div>
                ))}
              </div>
            )}

            {openTermine.length > 3 && (
              <button
                className="button button-ghost"
                type="button"
                style={{ marginTop: 10, width: "100%" }}
                onClick={() => setShowAllTermine(true)}
              >
                Alle offenen Termine anzeigen
              </button>
            )}
          </div>

          <div className="card compact">
            <div className="card-header">
              <div>
                <h2>Patienten</h2>
                <div className="card-sub">Auswählen</div>
              </div>

              <button
                className="button button-ghost"
                type="button"
                onClick={() => setModalType("new")}
                style={{ display: "flex", gap: 8, alignItems: "center" }}
              >
                <FiPlus /> Neu
              </button>
            </div>

            <div className="list">
              {patients.map((p) => (
                <div
                  key={p.id}
                  className={`list-item ${selectedPatient === p.id ? "selected" : ""}`}
                  onClick={() => openPatient(p)}
                >
                  <div>
                    <div className="list-title">{p.name}</div>
                    <div className="list-meta">Pflegegrad {p.pflegegrad}</div>
                  </div>

                  <button
                    className="icon-btn"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditPatient(p);
                      setModalType("edit");
                    }}
                    aria-label="Bearbeiten"
                    title="Bearbeiten"
                  >
                    <FiEdit2 />
                  </button>
                </div>
              ))}
            </div>

            {patients.length === 0 && <div className="card-sub" style={{ marginTop: 6 }}>Keine Patienten vorhanden.</div>}
          </div>
        </div>

        {/* RIGHT / WORKSPACE */}
        <div className="main">
          {!selectedPatient || !patientDetails ? (
            <div className="card">
              <div className="workspace-title">Wähle links einen Patienten</div>
              <div className="card-sub" style={{ marginTop: 6 }}>
                Demo läuft komplett im Browser (LocalStorage). Du kannst Patienten und Beratungen anlegen.
              </div>
              <div className="divider" />
              <div className="empty">Tipp: Lege einen Patienten an oder wähle einen bestehenden.</div>
            </div>
          ) : (
            <>
              <div className="card">
                <div className="workspace-head">
                  <div>
                    <div className="workspace-title">{patientDetails.patient.name}</div>
                    <div className="card-sub" style={{ marginTop: 4 }}>
                     {patientDetails.patient.adresse}, {patientDetails.patient.plz || ""} {patientDetails.patient.ort || ""} · Pflegegrad {patientDetails.patient.pflegegrad} · Vers.-Nr.:{" "}
{patientDetails.patient.pflegeversichertennummer || "-"}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                      <span className="chip neutral">Patient</span>
                      <span className="chip ok">Beratungen: {patientDetails.beratungen.length}</span>
                      <span className="chip warn">
                        Offene Termine: {openTermine.filter((x) => x.patientId === selectedPatient).length}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button className="button" type="button" onClick={startNewBeratung}>
                      Neue Beratung starten
                    </button>
                    <button
                      className="button button-ghost"
                      type="button"
                      onClick={() => {
                        setSelectedPatient(null);
                        setPatientDetails(null);
                        setSelectedBeratungId(null);
                        setBeratungForm(null);
                        showToastMsg("Patient geschlossen.");
                      }}
                    >
                      Schließen
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid-2">
                <div className="card">
                  <div className="card-header">
                    <div>
                      <h2>Beratungen</h2>
                      <div className="card-sub">Auswählen / Löschen</div>
                    </div>
                  </div>

                  {patientDetails.beratungen.length === 0 ? (
                    <div className="empty">Noch keine Beratung vorhanden.</div>
                  ) : (
                    <div className="b-list">
                      {patientDetails.beratungen.map((b) => {
                        const status = b.status || "entwurf";
                        const isClosed = status === "abgeschlossen";

                        return (
                          <div
                            key={b.id}
                            className={`b-item ${selectedBeratungId === b.id ? "active" : ""}`}
                            onClick={() => setSelectedBeratungId(b.id)}
                          >
                            <div className="b-row">
                              <div>
                                <div className="b-title">Beratung #{b.id}</div>
                                <div className="b-sub">
                                  {new Date(b.datum).toLocaleString()} · {b.videokonferenz ? "Video" : "Vor Ort"}
                                </div>
                              </div>

                              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <span className={`chip ${isClosed ? "ok" : "warn"}`}>{status}</span>

                                <button
                                  className="icon-btn"
                                  type="button"
                                  title="Beratung löschen"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteBeratung(b.id);
                                  }}
                                >
                                  <FiTrash2 />
                                </button>
                              </div>
                            </div>

                            <div className="b-sub" style={{ marginTop: 8 }}>
                              Zeit: {b.uhr_von || "--:--"} – {b.uhr_bis || "--:--"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="card">
                  {!beratungForm ? (
                    <div className="empty">Wähle links eine Beratung aus oder starte eine neue.</div>
                  ) : (
                    <>
                 <div className="sticky-actions">
  <div className="left">
    <div style={{ fontWeight: 900 }}>Beratungsformular · Beratung #{beratungForm.id}</div>
    <div className="card-sub">Nachweis § 37 Abs. 3 (Demo)</div>
  </div>

  <div className="right">
    <button
      className="button button-ghost"
      type="button"
      onClick={saveBeratungDraft}
      disabled={saving}
    >
      {saving ? "Speichern..." : "Entwurf speichern"}
    </button>

    <button
      className="button button-ghost"
      type="button"
      onClick={downloadPdf}
    >
      PDF
    </button>

    <button
      className="button"
      type="button"
      onClick={abschliessen}
      disabled={saving}
    >
      Abschließen
    </button>

    <button
      className="button button-ghost"
      type="button"
      onClick={downloadXml}
    >
      XML
    </button>
  </div>
</div>
                      <div className="grid-2">
                        <div>
                          <span className="label">Uhr von</span>
                          <input
                            value={beratungForm.uhr_von}
                            onChange={(e) => setBeratungForm((s) => ({ ...s, uhr_von: e.target.value }))}
                            placeholder="HH:MM"
                          />
                        </div>
                        <div>
                          <span className="label">Uhr bis</span>
                          <input
                            value={beratungForm.uhr_bis}
                            onChange={(e) => setBeratungForm((s) => ({ ...s, uhr_bis: e.target.value }))}
                            placeholder="HH:MM"
                          />
                        </div>
                      </div>

                      <div style={{ marginTop: 10 }}>
                        <label className="check" style={{ alignItems: "center" }}>
                          <input
                            type="checkbox"
                            checked={beratungForm.videokonferenz}
                            onChange={(e) => setBeratungForm((s) => ({ ...s, videokonferenz: e.target.checked }))}
                          />
                          Videokonferenz (auf Wunsch)
                        </label>
                      </div>

                      <div className="divider" />

                      <span className="label">Ziffer 1 – Einschätzung (Pflegebedürftiger/Pflegeperson)</span>
                      <textarea
                        value={beratungForm.einschaetzung_pflegebeduerftiger}
                        onChange={(e) => setBeratungForm((s) => ({ ...s, einschaetzung_pflegebeduerftiger: e.target.value }))}
                        placeholder="Freitext"
                      />

                      <span className="label">Ziffer 2 – Einschätzung (Beratungsperson)</span>
                      <textarea
                        value={beratungForm.einschaetzung_beratungsperson}
                        onChange={(e) => setBeratungForm((s) => ({ ...s, einschaetzung_beratungsperson: e.target.value }))}
                        placeholder="Freitext"
                      />

                      <div className="divider" />

                      <span className="label">Ziffer 3 – Pflege- und Betreuungssituation sichergestellt?</span>
                      <div className="segmented">
                        <button
                          type="button"
                          className={`segment ${beratungForm.pflege_sichergestellt === true ? "active" : ""}`}
                          onClick={() => setBeratungForm((s) => ({ ...s, pflege_sichergestellt: true }))}
                        >
                          Ja
                        </button>
                        <button
                          type="button"
                          className={`segment ${beratungForm.pflege_sichergestellt === false ? "active" : ""}`}
                          onClick={() => setBeratungForm((s) => ({ ...s, pflege_sichergestellt: false }))}
                        >
                          Nein
                        </button>
                      </div>

                      {beratungForm.pflege_sichergestellt === false && (
                        <>
                          <span className="label">Wenn Nein: weil</span>
                          <textarea
                            value={beratungForm.pflege_sichergestellt_weil}
                            onChange={(e) => setBeratungForm((s) => ({ ...s, pflege_sichergestellt_weil: e.target.value }))}
                            placeholder="Begründung"
                          />
                        </>
                      )}

                      <div className="divider" />

                      <span className="label">Ziffer 4 – Maßnahmen zur Verbesserung (Auswahl)</span>
                      <div className="check-grid">
                        {massnahmenOptions.map((m) => (
                          <label key={m} className="check">
                            <input
                              type="checkbox"
                              checked={beratungForm.massnahmen.includes(m)}
                              onChange={(e) => {
                                setBeratungForm((s) => {
                                  const set = new Set(s.massnahmen);
                                  if (e.target.checked) set.add(m);
                                  else set.delete(m);
                                  return { ...s, massnahmen: Array.from(set) };
                                });
                              }}
                            />
                            {m}
                          </label>
                        ))}
                      </div>

                      <span className="label">Weitere Maßnahmen / Erläuterungen</span>
                      <textarea
                        value={beratungForm.massnahmen_freitext}
                        onChange={(e) => setBeratungForm((s) => ({ ...s, massnahmen_freitext: e.target.value }))}
                        placeholder="Freitext"
                      />

                      <div className="divider" />

                      <span className="label">§7a – Hinweise</span>
                      <div className="check-grid">
                        <label className="check">
                          <input
                            type="checkbox"
                            checked={beratungForm.pflegeberatung7a_angezeigt}
                            onChange={(e) => setBeratungForm((s) => ({ ...s, pflegeberatung7a_angezeigt: e.target.checked }))}
                          />
                          Pflegeberatung nach § 7a angezeigt
                        </label>

                        <label className="check">
                          <input
                            type="checkbox"
                            checked={beratungForm.wunsch_beratung7a}
                            onChange={(e) => setBeratungForm((s) => ({ ...s, wunsch_beratung7a: e.target.checked }))}
                          />
                          Wunsch nach Pflegeberatung § 7a
                        </label>
                      </div>

                      <div className="divider" />

                      <span className="label">Einwilligungen (Übermittlung/Verarbeitung)</span>
                      <div className="check-grid">
                        <label className="check">
                          <input type="checkbox" checked={beratungForm.einw_z3} onChange={(e) => setBeratungForm((s) => ({ ...s, einw_z3: e.target.checked }))} />
                          Übermittlung Ziffer 3
                        </label>
                        <label className="check">
                          <input type="checkbox" checked={beratungForm.einw_z4} onChange={(e) => setBeratungForm((s) => ({ ...s, einw_z4: e.target.checked }))} />
                          Übermittlung Ziffer 4
                        </label>
                        <label className="check">
                          <input type="checkbox" checked={beratungForm.einw_inaugenschein} onChange={(e) => setBeratungForm((s) => ({ ...s, einw_inaugenschein: e.target.checked }))} />
                          Inaugenscheinnahme
                        </label>
                        <label className="check">
                          <input type="checkbox" checked={beratungForm.einw_7a_verarbeitung} onChange={(e) => setBeratungForm((s) => ({ ...s, einw_7a_verarbeitung: e.target.checked }))} />
                          Verarbeitung § 7a
                        </label>
                      </div>

                      <div className="divider" />

                      <span className="label">Unterschrift</span>
                      <div className="grid-2">
                        <div>
                          <span className="label">Ort</span>
                          <input
                            value={beratungForm.unterschrift_ort}
                            onChange={(e) => setBeratungForm((s) => ({ ...s, unterschrift_ort: e.target.value }))}
                            placeholder="Ort"
                          />
                        </div>
                        <div>
                          <span className="label">Datum</span>
                          <input
                            value={beratungForm.unterschrift_datum}
                            onChange={(e) => setBeratungForm((s) => ({ ...s, unterschrift_datum: e.target.value }))}
                            placeholder="YYYY-MM-DD"
                          />
                        </div>
                      </div>

                  <span className="label">Unterschrift pflegebedürftige Person</span>
<button
  type="button"
  className="button button-ghost"
  onClick={() => openSignatureModal("pflege")}
>
  {beratungForm.unterschrift_pflegebeduerftiger_b64
    ? "Unterschrift bearbeiten"
    : "Unterschrift hinzufügen"}
</button>

{beratungForm.unterschrift_pflegebeduerftiger_b64 && (
  <div style={{ marginTop: 10 }}>
    <img
      src={beratungForm.unterschrift_pflegebeduerftiger_b64}
      alt="Unterschrift pflegebedürftige Person"
      style={{
        maxWidth: "100%",
        height: 120,
        objectFit: "contain",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        background: "#fff",
        padding: 8,
      }}
    />
  </div>
)}

<span className="label">Unterschrift Beratungsperson (optional / Video-Fall)</span>
<button
  type="button"
  className="button button-ghost"
  onClick={() => openSignatureModal("berater")}
>
  {beratungForm.unterschrift_beratungsperson_b64
    ? "Unterschrift bearbeiten"
    : "Unterschrift hinzufügen"}
</button>

{beratungForm.unterschrift_beratungsperson_b64 && (
  <div style={{ marginTop: 10 }}>
    <img
      src={beratungForm.unterschrift_beratungsperson_b64}
      alt="Unterschrift Beratungsperson"
      style={{
        maxWidth: "100%",
        height: 120,
        objectFit: "contain",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        background: "#fff",
        padding: 8,
      }}
    />
  </div>
)}

                      <div className="card-sub" style={{ marginTop: 10 }}>
                        Hinweis: XML ist erst nach Abschluss verfügbar (Unterschrift + Pflichtfelder).
                      </div>
                    </>
                  )}
                </div>
              </div>

              {showAllTermine && (
                <div className="card">
                  <div className="card-header">
                    <div>
                      <h2>Erledigte Termine</h2>
                      <div className="card-sub">Historie</div>
                    </div>
                    <button className="button button-ghost" type="button" onClick={() => setShowAllTermine(false)}>
                      Schließen
                    </button>
                  </div>

                  <div className="list">
                    {doneTermine.map((t) => (
                      <div key={t.id} className="list-item" style={{ cursor: "default" }}>
                        <div>
                          <div className="list-title">
                            {t.typ} – {terminPatientLabel(t)}
                          </div>
                          <div className="list-meta">
                            {new Date(t.datum).toLocaleString()}
                            {t.beratungId ? ` · Beratung #${t.beratungId}` : ""}
                          </div>
                        </div>

                        <button className="button button-ghost" type="button" disabled>
                          erledigt
                        </button>
                      </div>
                    ))}
                  </div>

                  {doneTermine.length === 0 && (
                    <div className="card-sub" style={{ marginTop: 6 }}>
                      Keine erledigten Termine.
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Patient Modal */}
      {modalType && (
        <div className="modal-overlay" onClick={() => setModalType(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="card-header" style={{ marginBottom: 10 }}>
              <div>
                <h2>{modalType === "new" ? "Neuen Patienten anlegen" : "Patient bearbeiten"}</h2>
                <div className="card-sub">Stammdaten verwalten.</div>
              </div>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);

                try {
                  if (modalType === "new") {
await DEMO_API.createPatient({
  name: formData.get("name"),
  geburtsdatum: formData.get("geburtsdatum"),
  adresse: formData.get("adresse"),
  plz: formData.get("plz"),
  ort: formData.get("ort"),
  pflegegrad: Number(formData.get("pflegegrad")),
  pflegeversichertennummer: formData.get("pflegeversichertennummer"),
  meldedatum: formData.get("meldedatum"),
  beratungsdatum: formData.get("beratungsdatum"),
});
                    showToastMsg("Patient angelegt.");
                  } else {
                    await DEMO_API.updatePatient(editPatient.id, {
  name: formData.get("name"),
  geburtsdatum: formData.get("geburtsdatum"),
  adresse: formData.get("adresse"),
  plz: formData.get("plz"),
  ort: formData.get("ort"),
  pflegegrad: Number(formData.get("pflegegrad")),
  pflegeversichertennummer: formData.get("pflegeversichertennummer"),
});
                    showToastMsg("Patient aktualisiert.");
                  }

                  setModalType(null);
                  await loadPatients();
                  await refreshDashboard();
                  await loadTermine();
                  if (selectedPatient) await loadPatientDetails(selectedPatient);
                } catch (err) {
                  showToastMsg("Fehler: " + (err?.message || String(err)));
                }
              }}
            >
              <span className="label">Name</span>
              <input name="name" placeholder="Name" defaultValue={editPatient?.name} required />

              <span className="label">Geburtsdatum</span>
              <input name="geburtsdatum" type="date" defaultValue={editPatient?.geburtsdatum} required />
              {modalType === "new" && (
  <div className="grid-2">
    <div>
      <span className="label">Wann bei Patient melden?</span>
      <input name="meldedatum" type="datetime-local" required />
    </div>
    <div>
      <span className="label">Wann ist der richtige Termin?</span>
      <input name="beratungsdatum" type="datetime-local" required />
    </div>
  </div>
)}

           <span className="label">Straße / Hausnummer</span>
<input name="adresse" placeholder="Straße / Hausnummer" defaultValue={editPatient?.adresse} required />

<div className="grid-2">
  <div>
    <span className="label">PLZ</span>
    <input name="plz" placeholder="PLZ" defaultValue={editPatient?.plz || ""} required />
  </div>
  <div>
    <span className="label">Ort</span>
    <input name="ort" placeholder="Ort" defaultValue={editPatient?.ort || ""} required />
  </div>
</div>

<div className="grid-2">
  <div>
    <span className="label">Pflegegrad</span>
    <input
      name="pflegegrad"
      type="number"
      min="1"
      max="5"
      defaultValue={editPatient?.pflegegrad}
      required
    />
  </div>
  <div>
    <span className="label">Pflegeversichertennummer</span>
    <input
      name="pflegeversichertennummer"
      placeholder="Optional"
      defaultValue={editPatient?.pflegeversichertennummer || ""}
    />
  </div>
</div>

              <div className="modal-actions">
                {modalType === "edit" ? (
                  <button
                    type="button"
                    className="button button-danger"
                    onClick={async () => {
                      if (!confirm("Patient wirklich löschen?")) return;

                      try {
                        await DEMO_API.deletePatient(editPatient.id);
                        showToastMsg("Patient gelöscht.");
                        setModalType(null);

                        await loadPatients();
                        await refreshDashboard();
                        await loadTermine();

                        if (selectedPatient === editPatient.id) {
                          setSelectedPatient(null);
                          setPatientDetails(null);
                          setSelectedBeratungId(null);
                          setBeratungForm(null);
                        }
                      } catch (err) {
                        showToastMsg("Fehler: " + (err?.message || String(err)));
                      }
                    }}
                  >
                    Löschen
                  </button>
                ) : (
                  <button type="button" className="button button-ghost" onClick={() => setModalType(null)}>
                    Abbrechen
                  </button>
                )}

                <button type="submit" className="button">
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
{signatureModal && (
  <div className="modal-overlay" onClick={() => setSignatureModal(null)}>
    <div
      className="modal"
      onClick={(e) => e.stopPropagation()}
      style={{ maxWidth: 900, width: "95%" }}
    >
      <div className="card-header" style={{ marginBottom: 12 }}>
        <div>
          <h2>Unterschrift</h2>
          <div className="card-sub">
            Bitte sauber mit Stift oder Finger unterschreiben.
          </div>
        </div>
      </div>

      <SignaturePad
        value={tempSignature}
        onChange={setTempSignature}
        height={320}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          marginTop: 16,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          className="button button-ghost"
          onClick={() => setTempSignature("")}
        >
          Löschen
        </button>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="button button-ghost"
            onClick={() => setSignatureModal(null)}
          >
            Abbrechen
          </button>

          <button
            type="button"
            className="button"
            onClick={() => {
              if (signatureModal === "pflege") {
                setBeratungForm((s) => ({
                  ...s,
                  unterschrift_pflegebeduerftiger_b64: tempSignature,
                }));
              } else {
                setBeratungForm((s) => ({
                  ...s,
                  unterschrift_beratungsperson_b64: tempSignature,
                }));
              }

              setSignatureModal(null);
            }}
          >
            Übernehmen
          </button>
        </div>
      </div>
    </div>
  </div>
)}
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
