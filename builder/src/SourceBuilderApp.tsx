// src/SourceBuilderApp.tsx

import { useMemo, useState } from "react";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

/**
 * Research Source Docs – Source Builder (React + docx)
 * - Strict DD-MMM-YYYY dates (e.g., 28-AUG-2025)
 * - ALCOA reminder (Attributable, Legible, Contemporaneous, Original, Accurate)
 * - Investigator-only signoffs for PE / Assessments / ECG
 * - Build DOCX entirely client-side (no server)
 * - Single “Custom Visit” using pickable modules + ad-hoc
 */

const BRAND = {
  name: "Research Source Docs",
  disclaimer:
    "Complete in real time. Correct with single line, date/initial. Use 24-hr time. Do not record PHI beyond protocol requirements.",
  ownership:
    "© " +
    new Date().getFullYear() +
    " Research Source Docs. Proprietary templates and software. Reproduction or redistribution is prohibited without written permission.",
};

// ────────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────────

// Bold label helper for DOCX
const L = (text: string) => new TextRun({ text, bold: true });

// Safer Paragraph helper (fixes spread typing error in strict TS)
function Para(text: string, opts: any = {}) {
  return new Paragraph(Object.assign({ text }, opts));
}

function Bullet(text: string) {
  return new Paragraph({ text, bullet: { level: 0 } });
}

function SectionHeading(text: string) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 120 },
  });
}

// Strict DD-MMM-YYYY (e.g., 28-AUG-2025)
const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
] as const;
type Mon = (typeof MONTHS)[number];
const DD_MMM_YYYY = /^(\d{2})-([A-Z]{3})-(\d{4})$/;

function isValidDDMMMYYYY(s: string): s is string {
  const m = s.trim().toUpperCase().match(DD_MMM_YYYY);
  if (!m) return false;
  const dd = Number(m[1]);
  const mon = m[2] as Mon;
  const yyyy = Number(m[3]);
  if (yyyy < 1900 || yyyy > 2100) return false;
  if (!MONTHS.includes(mon)) return false;
  if (dd < 1 || dd > 31) return false;
  // very light day check by month length (no leap calc needed for source header)

  const short = ["APR", "JUN", "SEP", "NOV"];
  if (short.includes(mon) && dd > 30) return false;
  if (mon === "FEB" && dd > 29) return false;
  return true;
}

function normalizeDDMMMYYYY(input: string) {
  const up = input.toUpperCase().replace(/\s+/g, "");
  // allow users to type with slashes or spaces; convert to hyphen
  const withHyphens = up.replace(/[\/.]/g, "-");
  return withHyphens;
}

// Header table used in DOCX
function HeaderTable(fields: Record<string, string>) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [L("Protocol No: "), new TextRun(fields.protocol || " ")],
              }),
              new Paragraph({
                children: [L("Protocol Title: "), new TextRun(fields.title || " ")],
              }),
              new Paragraph({
                children: [
                  L("Site No: "),
                  new TextRun(fields.site || " "),
                  new TextRun("    "),
                  L("PI: "),
                  new TextRun(fields.pi || " "),
                ],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  L("Subject ID: "),
                  new TextRun(fields.subjectId || " "),
                  new TextRun("    "),
                  L("Initials: "),
                  new TextRun(fields.initials || " "),
                ],
              }),
              new Paragraph({
                children: [L("Visit: "), new TextRun(fields.visit || " ")],
              }),
              new Paragraph({
                children: [
                  L("Visit Date (DD-MMM-YYYY): "),
                  new TextRun(fields.visitDate || " "),
                  new TextRun("    "),
                  L("Time (24-hr): "),
                  new TextRun(fields.time || " "),
                ],
              }),
              new Paragraph({
                children: [L("Staff (printed): "), new TextRun(fields.staff || " ")],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// ────────────────────────────────────────────────────────────────────────────────
// Modules (pick any)
// ────────────────────────────────────────────────────────────────────────────────

type ModuleKey =
  | "vitals"
  | "ecg"
  | "labs"
  | "pk"
  | "pe"
  | "conmed"
  | "ae"
  | "randomization"
  | "deviation"
  | "adhoc";

const ALL_MODULES: { key: ModuleKey; title: string }[] = [
  { key: "vitals", title: "Vitals & Focused Exam" },
  { key: "ecg", title: "12-Lead ECG" },
  { key: "labs", title: "Laboratory Collection" },
  { key: "pk", title: "PK Sampling (if required)" },
  { key: "pe", title: "Physical Exam (Investigator only signoff)" },
  { key: "conmed", title: "Concomitant Medications Log" },
  { key: "ae", title: "Adverse Events / SAEs Log" },
  { key: "randomization", title: "Randomization / Enrollment" },
  { key: "deviation", title: "Protocol Deviations Log" },
  { key: "adhoc", title: "Ad-hoc Lines" },
];

function buildVitals(): Paragraph[] {
  return [
    SectionHeading("Vitals & Focused Exam"),
    Bullet("Position: Sitting ☐  Supine ☐  Standing ☐   Device: ______"),
    Bullet(
      "Time ____:____  HR ___  BP ___/___  RR ___  Temp ___ °C / ___ °F  SpO2 ___%"
    ),
    Bullet("Focused exam systems (as required): General / HEENT / Cardiac / Resp / Abd / Neuro / Skin"),
    Para("Investigator assessment:  ☐ Normal   ☐ Abnormal (CS?)"),
    Para("Investigator Signature: ____________________   Date (DD-MMM-YYYY): ___-___-____"),
  ];
}

function buildECG(): Paragraph[] {
  return [
    SectionHeading("12-Lead ECG"),
    Bullet("Resting 5–10 min; supine"),
    Bullet("Repeat ECG if indicated (check box if repeated)  ☐ Yes  ☐ No  ☐ N/A"),
    Bullet("Time (24-hr): ___:___    QTc (if reported): ______ ms"),
    Para("Investigator assessment:  ☐ Normal   ☐ Abnormal (CS?)"),
    Para("Investigator Signature: ____________________   Date (DD-MMM-YYYY): ___-___-____"),
  ];
}

function buildLabs(): Paragraph[] {
  return [
    SectionHeading("Laboratory Collection"),
    Bullet("Panel(s): Chemistry ☐  Hematology ☐  Urinalysis ☐  Other: __________"),
    Bullet("Sample ID(s) / tubes / processing / shipping if applicable"),
    Bullet("Time (24-hr): ___:___   Collected by: ____________________"),
  ];
}

function buildPK(): Paragraph[] {
  return [
    SectionHeading("PK Sampling (if required per protocol)"),
    Bullet("Pre-dose samples?  ☐ Yes  ☐ No  ☐ N/A"),
    Bullet("Nominal time(s): __________   Actual time(s): __________"),
    Bullet("Collector initials: ____"),
  ];
}

function buildPE(): Paragraph[] {
  return [
    SectionHeading("Physical Exam (Investigator)"),
    Bullet("Systems: General / HEENT / Cardiac / Respiratory / Abdomen / Neuro / Skin"),
    Para("Clinically significant?  ☐ Yes   ☐ No"),
    Para("Investigator Signature: ____________________   Date (DD-MMM-YYYY): ___-___-____"),
  ];
}

function buildConMed(): Paragraph[] {
  return [
    SectionHeading("Concomitant Medications"),
    Bullet("Start Date | Stop Date | Medication | Indication | Dose/Route/Frequency | Ongoing? | Notes"),
  ];
}

function buildAE(): Paragraph[] {
  return [
    SectionHeading("Adverse Events / SAEs"),
    Bullet(
      "Onset | End | Description | Severity (Mild/Mod/Sev) | Relationship (Unrelated/Possible/Probable) | Action Taken | Outcome | Reported (date)"
    ),
  ];
}

function buildRand(): Paragraph[] {
  return [
    SectionHeading("Randomization / Enrollment"),
    Bullet("Eligibility confirmed and documented"),
    Bullet("Randomization date/time ____-___-____  ____:____   System: ______   Code: ______"),
    Bullet("Stratification factors (if applicable)"),
    Bullet("Enrollment confirmation sent to sponsor/CRO (date)"),
  ];
}

function buildDeviation(): Paragraph[] {
  return [
    SectionHeading("Protocol Deviations"),
    Bullet("Date | Subject | Description | Impact (Safety/Data) | CAPA | Reported (Y/N, date)"),
  ];
}

// Ad-hoc free lines (site-editable in printed copy)
function buildAdHoc(title: string, lines: number) {
  const out: Paragraph[] = [SectionHeading(title || "Ad-hoc")];
  for (let i = 0; i < Math.max(1, lines); i++) {
    out.push(Para("______________________________"));
  }
  return out;
}

// ────────────────────────────────────────────────────────────────────────────────
// DOCX builder
// ────────────────────────────────────────────────────────────────────────────────

function buildDoc(
  fields: Record<string, string>,
  selected: ModuleKey[],
  adhocTitle: string,
  adhocLines: number
) {
  const body: Paragraph[] = [];

  // ALCOA reminder
  body.push(
    Para(
      "ALCOA reminder: Attributable, Legible, Contemporaneous, Original, Accurate.",
      { spacing: { after: 120 } }
    )
  );
  body.push(Para(BRAND.disclaimer, { spacing: { after: 200 } }));

  // Modules
  for (const key of selected) {
    switch (key) {
      case "vitals":
        body.push(...buildVitals());
        break;
      case "ecg":
        body.push(...buildECG());
        break;
      case "labs":
        body.push(...buildLabs());
        break;
      case "pk":
        body.push(...buildPK());
        break;
      case "pe":
        body.push(...buildPE());
        break;
      case "conmed":
        body.push(...buildConMed());
        break;
      case "ae":
        body.push(...buildAE());
        break;
      case "randomization":
        body.push(...buildRand());
        break;
      case "deviation":
        body.push(...buildDeviation());
        break;
      case "adhoc":
        body.push(...buildAdHoc(adhocTitle, adhocLines));
        break;
    }
  }

  // Ownership footer
  body.push(Para(""));
  body.push(Para(BRAND.ownership, { spacing: { before: 200 } }));

  // IMPORTANT: allow both Paragraph & Table in section children
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      text: BRAND.name,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.LEFT,
    }),
    new Paragraph({ text: "Source Version: v1.0", spacing: { after: 100 } }),
    HeaderTable(fields),
    ...body,
  ];

  return new Document({
    sections: [{ properties: {}, children }],
  });
}

// Native download utility
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 0);
}

// ────────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────────

export default function SourceBuilderApp() {
  const [fields, setFields] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<ModuleKey[]>(["vitals"]);
  const [adhocTitle, setAdhocTitle] = useState<string>("Untitled");
  const [adhocLines, setAdhocLines] = useState<number>(3);

  // Date validation state
  const normalizedDate = useMemo(
    () => normalizeDDMMMYYYY(fields.visitDate || ""),
    [fields.visitDate]
  );
  const dateValid = useMemo(
    () => (normalizedDate ? isValidDDMMMYYYY(normalizedDate) : true),
    [normalizedDate]
  );

  const filename = useMemo(() => {
    const safe = (s?: string) =>
      (s || "").trim().replace(/[^a-z0-9]+/gi, "_").slice(0, 40);
    return `${safe(fields.protocol) || "protocol"}_custom_visit_source.docx`;
  }, [fields.protocol]);

  async function handleDownloadDocx() {
    if (!dateValid) {
      alert("Visit Date must be DD-MMM-YYYY (e.g., 28-AUG-2025).");
      return;
    }
    const doc = buildDoc(
      { ...fields, visitDate: normalizedDate },
      selected,
      adhocTitle,
      adhocLines
    );
    const blob = await Packer.toBlob(doc);
    downloadBlob(blob, filename);
  }

  function toggleModule(k: ModuleKey) {
    setSelected((prev) =>
      prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]
    );
  }

  // Preview (simple)
  const previewHtml = useMemo(() => {
    const pickTitles = selected
      .map((k) => ALL_MODULES.find((m) => m.key === k)?.title)
      .filter(Boolean) as string[];
    return (
      <div className="prose max-w-none">
        <h2 className="text-xl font-semibold mt-6">Preview</h2>
        <div className="mt-2 p-4 border rounded-lg">
          <div className="text-sm text-gray-600">{BRAND.name} · Source Version v1.0</div>
          <div className="grid md:grid-cols-2 gap-2 text-sm mt-2">
            <div><span className="font-semibold">Protocol No:</span> {fields.protocol || ""}</div>
            <div><span className="font-semibold">Protocol Title:</span> {fields.title || ""}</div>
            <div><span className="font-semibold">Site No:</span> {fields.site || ""}</div>
            <div><span className="font-semibold">PI:</span> {fields.pi || ""}</div>
            <div><span className="font-semibold">Subject ID:</span> {fields.subjectId || ""}</div>
            <div><span className="font-semibold">Initials:</span> {fields.initials || ""}</div>
            <div><span className="font-semibold">Visit:</span> {fields.visit || ""}</div>
            <div>
              <span className="font-semibold">Visit Date:</span>{" "}
              {normalizedDate || ""}
              {!dateValid && (
                <span className="ml-2 text-red-600">(must be DD-MMM-YYYY)</span>
              )}
            </div>
            <div><span className="font-semibold">Time:</span> {fields.time || ""}</div>
            <div><span className="font-semibold">Staff:</span> {fields.staff || ""}</div>
          </div>

          <div className="text-sm mt-3">
            <span className="font-semibold">Modules:</span>{" "}
            {pickTitles.length ? pickTitles.join(", ") : "None"}
          </div>

          <div className="text-sm mt-2 italic">{BRAND.disclaimer}</div>
          <div className="text-xs mt-4">{BRAND.ownership}</div>
        </div>
      </div>
    );
  }, [fields, selected, normalizedDate, dateValid, adhocTitle, adhocLines]);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="font-semibold tracking-tight">Research Source Docs — Builder</div>
          <div className="flex items-center gap-4">
            <a
              className="text-sm underline"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.print();
              }}
            >
              Print / Save as PDF
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid lg:grid-cols-2 gap-8">
        {/* Left: Form */}
        <section className="space-y-4">
          <h1 className="text-2xl font-bold">Custom Visit – pick modules</h1>
          <p className="text-sm text-slate-600">
            Fill the header, select modules, then download a .docx. Dates must be
            <span className="font-semibold"> DD-MMM-YYYY</span> (e.g., <span className="font-mono">28-AUG-2025</span>).
          </p>

          {/* Header fields */}
          <div className="grid sm:grid-cols-2 gap-3">
            {(
              [
                ["protocol", "Protocol No"],
                ["title", "Protocol Title"],
                ["site", "Site No"],
                ["pi", "PI (printed)"],
                ["subjectId", "Subject ID"],
                ["initials", "Initials"],
                ["visit", "Visit"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-sm">
                <div className="text-slate-600 mb-1">{label}</div>
                <input
                  className="w-full rounded border px-3 py-2"
                  value={(fields as any)[key] || ""}
                  onChange={(e: any) =>
                    setFields((s) => ({ ...s, [key]: e.target.value }))
                  }
                />
              </label>
            ))}

            {/* Visit Date with normalization + validation */}
            <label className="text-sm">
              <div className="text-slate-600 mb-1">Visit Date (DD-MMM-YYYY)</div>
              <input
                className={
                  "w-full rounded border px-3 py-2 " +
                  (!dateValid ? "border-red-500" : "")
                }
                placeholder="28-AUG-2025"
                value={fields.visitDate || ""}
                onChange={(e) =>
                  setFields((s) => ({ ...s, visitDate: e.target.value }))
                }
              />
              {!dateValid && (
                <div className="text-xs text-red-600 mt-1">
                  Must be DD-MMM-YYYY with a real month (JAN…DEC) and valid day.
                </div>
              )}
            </label>

            {/* Optional fields */}
            <label className="text-sm">
              <div className="text-slate-600 mb-1">Visit Time (24-hr)</div>
              <input
                className="w-full rounded border px-3 py-2"
                placeholder="13:30"
                value={fields.time || ""}
                onChange={(e) =>
                  setFields((s) => ({ ...s, time: e.target.value }))
                }
              />
            </label>
            <label className="text-sm">
              <div className="text-slate-600 mb-1">Staff (printed)</div>
              <input
                className="w-full rounded border px-3 py-2"
                value={fields.staff || ""}
                onChange={(e) =>
                  setFields((s) => ({ ...s, staff: e.target.value }))
                }
              />
            </label>
          </div>

          {/* Module picker */}
          <div className="space-y-2">
            <div className="text-slate-600 mb-1">Modules</div>
            <div className="grid sm:grid-cols-2 gap-2">
              {ALL_MODULES.map((m) => (
                <label key={m.key} className="text-sm flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.includes(m.key)}
                    onChange={() => toggleModule(m.key)}
                  />
                  <span>{m.title}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Ad-hoc config (used only if module picked) */}
          {selected.includes("adhoc") && (
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="text-sm">
                <div className="text-slate-600 mb-1">Ad-hoc Title</div>
                <input
                  className="w-full rounded border px-3 py-2"
                  value={adhocTitle}
                  onChange={(e) => setAdhocTitle(e.target.value)}
                />
              </label>
              <label className="text-sm">
                <div className="text-slate-600 mb-1">Ad-hoc Lines</div>
                <input
                  type="number"
                  min={1}
                  className="w-full rounded border px-3 py-2"
                  value={adhocLines}
                  onChange={(e) => setAdhocLines(Number(e.target.value || 1))}
                />
              </label>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleDownloadDocx}
              className="rounded-lg bg-blue-600 text-white px-4 py-2 disabled:opacity-50"
              disabled={!dateValid}
              title={!dateValid ? "Fix Visit Date format" : ""}
            >
              Download .docx
            </button>
            <button
              onClick={() => window.print()}
              className="rounded-lg border px-4 py-2"
            >
              Print / Save as PDF
            </button>
          </div>
        </section>

        {/* Right: Preview */}
        <section className="min-h-[300px]">{previewHtml}</section>
      </main>

      <footer className="py-8 border-t text-center text-sm text-slate-600">
        {BRAND.ownership}
      </footer>
    </div>
  );
}
