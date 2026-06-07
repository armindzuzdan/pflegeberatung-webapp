export function createDemoStore({ nowIso, addDays }) {
  return {
    counters: { patientId: 2, beratungId: 2, terminId: 2 },
    patients: [
      {
        id: 1,
        name: "Max Mustermann",
        geburtsdatum: "1949-02-12",
        adresse: "Musterstrasse 1",
        plz: "52062",
        ort: "Aachen",
        pflegegrad: 3,
        pflegeversichertennummer: "DEMO-1234567",
      },
    ],
    beratungen: [
      {
        id: 1,
        patientId: 1,
        datum: nowIso(),
        uhr_von: "10:00",
        uhr_bis: "10:45",
        videokonferenz: 0,
        einschaetzung_pflegebeduerftiger:
          "Wirkt grundsaetzlich stabil, benoetigt Unterstuetzung bei Alltagstaetigkeiten.",
        einschaetzung_beratungsperson:
          "Pflege ist ueberwiegend gesichert, kleine Optimierungen empfohlen.",
        pflege_sichergestellt: 1,
        pflege_sichergestellt_weil: "",
        massnahmen_json: JSON.stringify(["Pflegekurs/-schulung"]),
        massnahmen_freitext: "",
        pflegeberatung7a_angezeigt: 1,
        wunsch_beratung7a: 0,
        einw_z3: 1,
        einw_z4: 1,
        einw_inaugenschein: 0,
        einw_7a_verarbeitung: 0,
        unterschrift_ort: "Aachen",
        unterschrift_datum: "2026-03-01",
        unterschrift_pflegebeduerftiger_b64: "",
        unterschrift_beratungsperson_b64: "",
        status: "entwurf",
      },
    ],
    termine: [
      {
        id: 1,
        patientId: 1,
        beratungId: null,
        typ: "Anfrage",
        datum: addDays(new Date(), 7).toISOString(),
        status: "offen",
        patientName: "Max Mustermann",
      },
    ],
  };
}
