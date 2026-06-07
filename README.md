# Pflegeberatung WebApp

Eine React-Webanwendung zur digitalen Dokumentation von Pflegeberatungen.

Die Anwendung ist als digitale Arbeitsoberfläche für Vertriebler und Beratungspersonen gedacht, die Patientengespräche führen und die erfassten Informationen strukturiert weiterverarbeiten müssen. Patientendaten, Beratungstermine und Gesprächsdokumentationen können zentral verwaltet werden. Nach Abschluss einer Beratung lassen sich die Daten direkt als PDF oder XML exportieren.

Demo: [https://testpatienten.netlify.app/](https://testpatienten.netlify.app/)

## Features

- Patientenverwaltung mit fiktiven Demo-Daten
- Übersicht über offene und erledigte Beratungstermine
- Dokumentation von Pflegeberatungen
- Beratungsformulare mit Pflichtfeldern
- Statusverwaltung für offene und erledigte Termine
- Digitale Unterschrift per Maus, Touch oder Stift
- PDF-Export auf Basis einer Demo-Vorlage
- XML-Export für abgeschlossene Beratungen
- Speicherung im Browser mit `localStorage`
- Responsives UI für Desktop und mobile Geräte

## Technologien

- React
- JavaScript
- CSS
- Vite
- pdf-lib
- localStorage

## Installation

Repository klonen:

```bash
git clone https://github.com/armindzuzdan/pflegeberatung-webapp.git
cd pflegeberatung-webapp
```

Abhängigkeiten installieren:

```bash
npm install
```

## Lokaler Start

```bash
npm run dev
```

Die Anwendung ist danach lokal erreichbar, in der Regel unter:

```text
http://localhost:5173
```

## Produktionsbuild

```bash
npm run build
npm run preview
```

## Projektstruktur

```text
pflegeberatung-webapp/
|-- public/
|   `-- demo-assets/
|-- src/
|   |-- components/
|   |-- data/
|   |-- services/
|   |-- utils/
|   |-- App.jsx
|   |-- main.jsx
|   `-- index.css
|-- docs/
|   `-- screenshots.md
|-- README.md
|-- package.json
`-- .gitignore
```

## Screenshots

Screenshots können später im Ordner `docs` ergänzt werden.

Vorgesehene Ansichten:

- Dashboard mit Patientenliste und Terminen
- Patientendetails mit Beratungsverlauf
- Beratungsformular
- Digitale Unterschrift
- PDF- und XML-Export

## Hinweis zu Demo-Daten

Alle Patientendaten in diesem Projekt sind fiktiv und dienen ausschließlich zur Demonstration der Anwendung.

Es werden keine echten Patientendaten, privaten Unterschriften oder sensiblen Dokumente verwendet. Die Demo speichert Eingaben lokal im Browser über `localStorage`.

Lokale Datenbanken, private Dateien, `.env`-Dateien und installierte Abhängigkeiten sind über `.gitignore` vom Repository ausgeschlossen.

## Ziel der Anwendung

Ziel der Anwendung ist es, den Ablauf rund um Patientengespräche und Pflegeberatungen digital zu unterstützen. Vertriebler oder Beratungspersonen können Patientenkontakte verwalten, Gesprächsdaten erfassen, Beratungen dokumentieren und die fertigen Informationen anschließend direkt als PDF oder XML weitergeben.

Damit bildet die WebApp nicht nur eine Oberfläche für Formulare ab, sondern einen vollständigen kleinen Workflow: vom Patientenkontakt über den Beratungstermin bis zum exportierbaren Dokument.
