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

// ────────────────────────────────────────────────────────────────────────────────
// Research Source Docs – Source Builder (GCP-style, repeatable modules, PI assessment)
// ────────────────────────────────────────────────────────────────────────────────

const BRAND = {
  name: "Research Source Consulting",
  disclaimer:
    "Complete in real time. Correct with single line, date/initial. Use 24-hr time. Do not record PHI beyond protocol requirements. Retain originals; ensure contemporaneous entries.",
};

// Month map for DD-MMM-YYYY
const MONTHS = [
  "JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"
];

function toDmmmyyyy(input: string): string {
  const iso = new Date(input);
  if (!isNaN(iso.getTime())) {
    const dd = String(iso.getDate()).padStart(2, "0");
    const m = MONTHS[iso.getMonth()];
    const yyyy = iso.getFullYear();
    return `${dd}-${m}-${yyyy}`;
  }
  const m = input.match(/^(\d{2})-([A-Za-z]{3})-(\d{4})$/);
  if (m) {
    const [_, dd, mon, yyyy] = m;
    const idx = MONTHS.indexOf(mon.toUpperCase());
    const ndd = Number(dd), ny = Number(yyyy);
    if (idx >= 0 && ndd >= 1 && ndd <= 31 && ny >= 1900 && ny <= 2100) {
      return `${dd}-${mon.toUpperCase()}-${yyyy}`;
    }
  }
  return "";
}
function validateDmmmyyyy(input: string): true | string {
  const out = toDmmmyyyy(input);
  return out ? true : "Use DD-MMM-YYYY (e.g., 28-AUG-2025)";
}

// Bold label helper for DOCX
const L = (text: string) => new TextRun({ text, bold: true });

function HeaderTable(fields: Record<string, string>) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({ children: [L("Protocol Title: "), new TextRun(fields.title || " ")] }),
              new Paragraph({
                children: [
                  L("Site No: "), new TextRun(fields.site || " "), new TextRun("    "),
                  L("PI: "), new TextRun(fields.pi || " "),
                ],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  L("Subject ID: "), new TextRun(fields.subjectId || " "), new TextRun("    "),
                  L("Initials: "), new TextRun(fields.initials || " "),
                ],
              }),
              new Paragraph({ children: [L("Visit: "), new TextRun(fields.visit || " ")] }),
              new Paragraph({
                children: [
                  L("Visit Date: "),
                  new TextRun(toDmmmyyyy(fields.visitDate || "") || " "),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// UI types
type ModuleType =
  | "consent"
  | "eligibility"
  | "vitals"
  | "ecg"
  | "labs"
  | "pk"
  | "physicalExam"
  | "neuroExam"
  | "imaging"
  | "procedure"
  | "ipAccountability"
  | "notes"
  | "nextAppointment"
  | "attachments";

type ModuleInstance = {
  id: string;
  type: ModuleType;
  title: string;
  repeatCount?: number; // for vitals/ECG
  data?: Record<string, string>;
};

const LIBRARY: { value: ModuleType; label: string; repeatable?: boolean }[] = [
  { value: "vitals", label: "Vitals (°C/°F, HR, BP, etc.)", repeatable: true },
  { value: "ecg", label: "ECG (with Repeat / N/A option)", repeatable: true },
  { value: "labs", label: "Labs & Specimen Collection" },
  { value: "pk", label: "PK Collection (optional per protocol)" },
  { value: "physicalExam", label: "Physical Exam (Investigator)" },
  { value: "neuroExam", label: "Neurological Exam (Investigator)" },
  { value: "imaging", label: "Imaging / Radiology" },
  { value: "procedure", label: "Procedure / Intervention" },
  { value: "ipAccountability", label: "IP Accountability (Drug/Device)" },
  { value: "notes", label: "Notes" },
  { value: "nextAppointment", label: "Next Appointment / Instructions" },
  { value: "attachments", label: "Attachments / Images (placeholder)" },
  { value: "consent", label: "Informed Consent Checklist" },
  { value: "eligibility", label: "Eligibility Checklist" },
];

function newId() {
  return Math.random().toString(36).slice(2, 9);
}

// DOCX helpers
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
    spacing: { before: 220, after: 120 },
  });
}
function PiAssessment() {
  return [
    Para("PI overall assessment:  Normal ☐   Abnormal (NCS) ☐   Abnormal (CS) ☐   Comments: ____________________________________"),
  ];
}

function buildModuleDocx(inst: ModuleInstance): Paragraph[] {
  const out: Paragraph[] = [];
  out.push(SectionHeading(inst.title));

  switch (inst.type) {
    case "vitals": {
      const n = inst.repeatCount ?? 1;
      out.push(Para("Position: Sitting ☐  Supine ☐  Standing ☐   Device: ______"));
      for (let i = 1; i <= n; i++) {
        out.push(Para(`Reading ${i}`));
        out.push(Bullet("Time ____:____  HR ___  BP ___/___  RR ___  Temp ___°C (___°F)  SpO2 ___%"));
        out.push(Bullet("Weight ___ kg  Height ___ cm  BMI ___ kg/m²  (omit if remote)"));
      }
      out.push(...PiAssessment());
      out.push(Para("Investigator (print/sign/date): ________________________________"));
      break;
    }
    case "ecg": {
      const n = inst.repeatCount ?? 1;
      out.push(Para("12-lead ECG per protocol. Record times & any repeats."));
      for (let i = 1; i <= n; i++) {
        out.push(Para(`ECG ${i}:  Date ____-___-____  Time ____:____  QTc ___ ms  Rhythm ____.  Repeat? Yes ☐  No ☐  N/A ☐`));
      }
      out.push(...PiAssessment());
      out.push(Para("Investigator (print/sign/date): ________________________________"));
      break;
    }
    case "labs": {
      out.push(Bullet("Specimen | Date | Time | Fasting? | Volume | Tube | Collected By | Processed? | Centrifuge | Frozen Temp | Shipped? | Courier | Notes"));
      out.push(...PiAssessment());
      break;
    }
    case "pk": {
      out.push(Para("PK per protocol (only if required)."));
      out.push(Bullet("Timepoint | Actual Time | Volume | Tube/Label | Handling | Notes"));
      out.push(...PiAssessment());
      break;
    }
    case "physicalExam": {
      out.push(Para("Focused/Full Physical Exam (check systems; document abnormals):"));
      out.push(Bullet("General | HEENT | Cardiac | Respiratory | Abdomen | Musculoskeletal | Skin"));
      out.push(Para("Findings / Notes: _______________________________________________________________"));
      out.push(...PiAssessment());
      out.push(Para("Investigator (print/sign/date): ________________________________"));
      break;
    }
    case "neuroExam": {
      out.push(Para("Neurological Exam (document abnormals/changes):"));
      out.push(Bullet("Mental status | Cranial nerves | Motor | Sensory | Reflexes | Coordination | Gait"));
      out.push(Para("Findings / Notes: _______________________________________________________________"));
      out.push(...PiAssessment());
      out.push(Para("Investigator (print/sign/date): ________________________________"));
      break;
    }
    case "imaging": {
      out.push(Bullet("Modality (CT/MRI/US/X-ray) | Body region | Date/Time | Performed at (facility)"));
      out.push(Bullet("Result summary / Impression: _________________________________________________"));
      out.push(...PiAssessment());
      out.push(Para("If images/reports provided, file under Attachments and reference file name(s)."));
      break;
    }
    case "procedure": {
      out.push(Bullet("Procedure Type | Location | Date/Time | Operator"));
      out.push(Bullet("Pre-procedure checks (consent/fasting/allergies) | Sedation ☐  No sedation ☐"));
      out.push(Bullet("Samples collected (type/volume/labels) | Complications (describe, if any)"));
      out.push(...PiAssessment());
      out.push(Para("Investigator (print/sign/date): ________________________________"));
      break;
    }
    case "ipAccountability": {
      out.push(Bullet("IP/Device | Lot/Kit | Strength/Model | Exp. Date | Quantity dispensed | Returned | Balance"));
      out.push(Bullet("Storage conditions (temp/log) | Chain of custody | Destroyed? (date/by whom)"));
      out.push(Para("Pharmacist/Designee (print/sign/date): ________________________________"));
      out.push(Para("Investigator (print/sign/date): ________________________________"));
      break;
    }
    case "notes": {
      out.push(Para("Notes / Deviations / Clarifications:"));
      out.push(Para("______________________________________________________________________________"));
      out.push(Para("______________________________________________________________________________"));
      break;
    }
    case "nextAppointment": {
      out.push(Bullet("Next visit date: ____-___-____  Window: ______  Time: ____:____"));
      out.push(Bullet("Instructions provided: ________________________________________________"));
      out.push(Bullet("Coordinator contact: __________________  Phone: __________________"));
      break;
    }
    case "attachments": {
      out.push(Para("Attachments / Images: Record file names and place printed copies behind this form."));
      out.push(Bullet("File/Report name(s): ________________________________________________"));
      break;
    }
    case "consent": {
      out.push(Para("ICF Version/Date: __________    IRB: __________"));
      out.push(Bullet("Private area used; identity verified"));
      out.push(Bullet("Provided IRB-approved ICF and time to review"));
      out.push(Bullet("Discussed purpose, procedures, risks/benefits, alternatives"));
      out.push(Bullet("Questions answered; no coercion/undue influence"));
      out.push(Bullet("Assessed comprehension (teach-back)"));
      out.push(Bullet("Signatures obtained before any procedures"));
      out.push(Para("Signature Times (24-hr): Participant ____:____  LAR ____:____  POC ____:____"));
      break;
    }
    case "eligibility": {
      out.push(Para("INCLUSION CRITERIA:"));
      out.push(Bullet("1) ______________________    Met ☐    Not Met ☐    Evidence: __________"));
      out.push(Bullet("2) ______________________    Met ☐    Not Met ☐    Evidence: __________"));
      out.push(Bullet("3) ______________________    Met ☐    Not Met ☐    Evidence: __________"));
      out.push(Para("EXCLUSION CRITERIA:"));
      out.push(Bullet("1) ______________________    Absent ☐    Present (exclusion) ☐    Evidence: __________"));
      out.push(Bullet("2) ______________________    Absent ☐    Present (exclusion) ☐    Evidence: __________"));
      out.push(Bullet("3) ______________________    Absent ☐    Present (exclusion) ☐    Evidence: __________"));
      break;
    }
  }

  return out;
}

function buildDoc(mods: ModuleInstance[], fields: Record<string, string>) {
  const children = [
    new Paragraph({
      text: BRAND.name,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.LEFT,
    }),
    new Paragraph({ text: "Source Version: v1.2", spacing: { after: 100 } }),
    HeaderTable(fields),
    new Paragraph({ text: BRAND.disclaimer, spacing: { before: 120, after: 120 } }),
    ...mods.flatMap(buildModuleDocx),
  ];

  return new Document({
    sections: [{ properties: {}, children }],
  });
}

// Native download helper
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

// ────────────────────────────────────────────────────────────────────────────────
// UI
// ────────────────────────────────────────────────────────────────────────────────

export default function SourceBuilderApp() {
  const [fields, setFields] = useState<Record<string, string>>({});
  const [mods, setMods] = useState<ModuleInstance[]>([]);
  const [toAdd, setToAdd] = useState<ModuleType>("vitals");
  const [msg, setMsg] = useState<string | null>(null);

  const filename = useMemo(() => {
    const safe = (s?: string) => (s || "").trim().replace(/[^a-z0-9]+/gi, "_").slice(0, 40);
    return `${safe(fields.title) || "source"}_doc.docx`;
  }, [fields.title]);

  function addModule() {
    const meta = LIBRARY.find((l) => l.value === toAdd)!;
    setMods((m) => [
      ...m,
      {
        id: newId(),
        type: meta.value,
        title: meta.label,
        repeatCount: meta.repeatable ? 1 : undefined,
        data: {},
      },
    ]);
  }
  function removeModule(id: string) {
    setMods((m) => m.filter((x) => x.id !== id));
  }
  function changeRepeat(id: string, delta: number) {
    setMods((m) =>
      m.map((x) =>
        x.id === id && (x.type === "vitals" || x.type === "ecg")
          ? { ...x, repeatCount: Math.max(1, (x.repeatCount ?? 1) + delta) }
          : x
      )
    );
  }

  async function handleDownloadDocx() {
    if (fields.visitDate) {
      const v = validateDmmmyyyy(fields.visitDate);
      if (v !== true) {
        setMsg(String(v));
        return;
      }
    }
    const doc = buildDoc(mods, fields);
    const blob = await Packer.toBlob(doc);
    downloadBlob(blob, filename);
    setMsg("Downloaded .docx");
    setTimeout(() => setMsg(null), 3000);
  }

  const HeaderPreview = (
    <div className="border rounded-lg p-4 bg-white">
      <div className="text-sm text-slate-600">{BRAND.name} · Source Version v1.2</div>
      <div className="mt-2 grid sm:grid-cols-2 gap-2 text-sm">
        <div><span className="font-semibold">Protocol Title:</span> {fields.title || ""}</div>
        <div><span className="font-semibold">Subject ID:</span> {fields.subjectId || ""}</div>
        <div><span className="font-semibold">Site No:</span> {fields.site || ""}</div>
        <div><span className="font-semibold">Initials:</span> {fields.initials || ""}</div>
        <div><span className="font-semibold">PI:</span> {fields.pi || ""}</div>
        <div><span className="font-semibold">Visit:</span> {fields.visit || ""}</div>
        <div><span className="font-semibold">Visit Date:</span> {toDmmmyyyy(fields.visitDate || "")}</div>
      </div>
      <div className="text-sm mt-2 italic">{BRAND.disclaimer}</div>
    </div>
  );

  const ModuleCard = (inst: ModuleInstance) => {
    const RepeatControl =
      (inst.type === "vitals" || inst.type === "ecg") ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600">Repeat</span>
          <button className="rounded border px-2 text-sm" onClick={() => changeRepeat(inst.id, -1)}>−</button>
          <span className="text-sm font-medium">{inst.repeatCount ?? 1}×</span>
          <button className="rounded border px-2 text-sm" onClick={() => changeRepeat(inst.id, +1)}>+</button>
        </div>
      ) : null;

    const PiBlock = (
      <div className="rounded-lg border p-3">
        PI overall assessment:
        <span className="ml-2">Normal ☐</span>
        <span className="ml-2">Abnormal (NCS) ☐</span>
        <span className="ml-2">Abnormal (CS) ☐</span>
        <div className="mt-2">Comments: _____________________________________________</div>
      </div>
    );

    return (
      <div key={inst.id} className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold">{inst.title}</div>
          <div className="flex items-center gap-2">
            {RepeatControl}
            <button className="rounded border px-2 py-1 text-xs text-slate-700" onClick={() => removeModule(inst.id)}>Remove</button>
          </div>
        </div>
        <div className="mt-3 border-t border-slate-200 pt-3 text-sm text-slate-700 space-y-2">
          {inst.type === "vitals" && (
            <>
              <div>Position: <span className="opacity-70">Sitting ☐  Supine ☐  Standing ☐</span> Device: ______</div>
              <div className="grid gap-2">
                {Array.from({ length: inst.repeatCount ?? 1 }).map((_, i) => (
                  <div key={i} className="rounded-lg border p-3">
                    <div className="text-xs text-slate-500">Reading {i + 1}</div>
                    <div>Time ____:____  HR ___  BP ___/___  RR ___  Temp ___°C (___°F)  SpO2 ___%</div>
                    <div className="opacity-70">Weight ___ kg  Height ___ cm  BMI ___ kg/m²  (omit if remote)</div>
                  </div>
                ))}
              </div>
              {PiBlock}
              <div className="pt-2 text-slate-800">Investigator (print/sign/date): ________________________________</div>
            </>
          )}

          {inst.type === "ecg" && (
            <>
              <div>12-lead ECG per protocol. Record times & repeats.</div>
              <div className="grid gap-2">
                {Array.from({ length: inst.repeatCount ?? 1 }).map((_, i) => (
                  <div key={i} className="rounded-lg border p-3">
                    <div className="text-xs text-slate-500">ECG {i + 1}</div>
                    <div>Date ____-___-____  Time ____:____  QTc ___ ms  Rhythm ____.  Repeat? Yes ☐  No ☐  N/A ☐</div>
                  </div>
                ))}
              </div>
              {PiBlock}
              <div className="pt-2 text-slate-800">Investigator (print/sign/date): ________________________________</div>
            </>
          )}

          {inst.type === "labs" && (
            <>
              <div className="rounded-lg border p-3">
                Specimen | Date | Time | Fasting? | Volume | Tube | Collected By | Processed? | Centrifuge | Frozen Temp | Shipped? | Courier | Notes
              </div>
              {PiBlock}
            </>
          )}

          {inst.type === "pk" && (
            <>
              <div className="rounded-lg border p-3">
                PK per protocol. Timepoint | Actual Time | Volume | Tube/Label | Handling | Notes
              </div>
              {PiBlock}
            </>
          )}

          {inst.type === "physicalExam" && (
            <>
              <div>Focused/Full Physical Exam (document abnormals):</div>
              <div className="rounded-lg border p-3">
                General · HEENT · Cardiac · Respiratory · Abdomen · Musculoskeletal · Skin
                <div className="mt-2">Findings / Notes: _____________________________________________</div>
              </div>
              {PiBlock}
              <div className="pt-2 text-slate-800">Investigator (print/sign/date): ________________________________</div>
            </>
          )}

          {inst.type === "neuroExam" && (
            <>
              <div>Neurological Exam (document abnormals/changes):</div>
              <div className="rounded-lg border p-3">
                Mental status · Cranial nerves · Motor · Sensory · Reflexes · Coordination · Gait
                <div className="mt-2">Findings / Notes: _____________________________________________</div>
              </div>
              {PiBlock}
              <div className="pt-2 text-slate-800">Investigator (print/sign/date): ________________________________</div>
            </>
          )}

          {inst.type === "imaging" && (
            <>
              <div className="rounded-lg border p-3">
                Modality (CT/MRI/US/X-ray) | Body region | Date/Time | Performed at (facility)
                <div className="mt-2">Result summary / Impression: _____________________________________________</div>
              </div>
              {PiBlock}
              <div className="text-xs text-slate-500">If images/reports provided, file under Attachments and note file names.</div>
            </>
          )}

          {inst.type === "procedure" && (
            <>
              <div className="rounded-lg border p-3">
                Procedure Type | Location | Date/Time | Operator
                <div className="mt-1">Checks: consent ☐  fasting ☐  allergies ☐  sedation ☐/☐ no sedation</div>
                <div className="mt-1">Samples collected / Handling: ___________________________________</div>
                <div className="mt-1">Complications (if any): _________________________________________</div>
              </div>
              {PiBlock}
              <div className="pt-2 text-slate-800">Investigator (print/sign/date): ________________________________</div>
            </>
          )}

          {inst.type === "ipAccountability" && (
            <>
              <div className="rounded-lg border p-3">
                IP/Device | Lot/Kit | Strength/Model | Exp. Date | Qty Dispensed | Returned | Balance
                <div className="mt-1">Storage conditions (temp/log) | Chain of custody | Destroyed? date/by</div>
              </div>
              <div>Pharmacist/Designee (print/sign/date): ________________________________</div>
              <div>Investigator (print/sign/date): ________________________________</div>
            </>
          )}

          {inst.type === "notes" && (
            <div className="rounded-lg border p-3">
              Notes / Deviations / Clarifications:
              <div className="mt-2">______________________________________________________________</div>
              <div>______________________________________________________________</div>
            </div>
          )}

          {inst.type === "nextAppointment" && (
            <div className="rounded-lg border p-3">
              Next visit date: ____-___-____  Window: ______  Time: ____:____
              <div className="mt-1">Instructions provided: ________________________________________</div>
              <div className="mt-1">Coordinator contact: _______________  Phone: _______________</div>
            </div>
          )}

          {inst.type === "attachments" && (
            <div className="rounded-lg border p-3">
              Attachments / Images: record file names; file printouts behind this page.
              <div className="mt-1">File/Report name(s): _________________________________________</div>
            </div>
          )}

          {inst.type === "consent" && (
            <div className="rounded-lg border p-3">
              ICF Version/Date: __________ &nbsp;&nbsp; IRB: __________
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Private area used; identity verified</li>
                <li>Provided IRB-approved ICF and time to review</li>
                <li>Discussed purpose, procedures, risks/benefits, alternatives</li>
                <li>Questions answered; no coercion/undue influence</li>
                <li>Assessed comprehension (teach-back)</li>
                <li>Signatures obtained before any procedures</li>
              </ul>
              <div className="mt-2">Signature Times (24-hr): Participant ____:____  LAR ____:____  POC ____:____</div>
            </div>
          )}

          {inst.type === "eligibility" && (
            <div className="rounded-lg border p-3">
              <div className="font-medium">Inclusion Criteria</div>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>1) ______________________ &nbsp;&nbsp; Met ☐  Not Met ☐  Evidence: __________</li>
                <li>2) ______________________ &nbsp;&nbsp; Met ☐  Not Met ☐  Evidence: __________</li>
                <li>3) ______________________ &nbsp;&nbsp; Met ☐  Not Met ☐  Evidence: __________</li>
              </ul>
              <div className="font-medium mt-3">Exclusion Criteria</div>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>1) ______________________ &nbsp;&nbsp; Absent ☐  Present (exclusion) ☐  Evidence: __________</li>
                <li>2) ______________________ &nbsp;&nbsp; Absent ☐  Present (exclusion) ☐  Evidence: __________</li>
                <li>3) ______________________ &nbsp;&nbsp; Absent ☐  Present (exclusion) ☐  Evidence: __________</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="font-semibold tracking-tight">Source Builder</div>
          <a className="text-sm underline" href="#" onClick={(e) => { e.preventDefault(); window.print(); }}>
            Print / Save as PDF
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid lg:grid-cols-2 gap-8">
        {/* Left: Header form + Add module */}
        <section className="space-y-4">
          <h1 className="text-2xl font-bold">Create Source</h1>
          <p className="text-sm text-slate-600">
            Fill header fields, add modules (use Repeat for triplicate BPs/ECGs), then export .docx or print to PDF. Everything runs locally.
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
            {(
              [
                ["title", "Protocol Title"],
                ["site", "Site No"],
                ["pi", "PI (printed)"],
                ["subjectId", "Subject ID"],
                ["initials", "Initials"],
                ["visit", "Visit"],
                ["visitDate", "Visit Date (DD-MMM-YYYY)"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-sm">
                <div className="text-slate-600 mb-1">{label}</div>
                <input
                  className="w-full rounded border px-3 py-2"
                  value={(fields as any)[key] || ""}
                  onChange={(e: any) => setFields((s) => ({ ...s, [key]: e.target.value }))}
                  placeholder={key === "visitDate" ? "28-AUG-2025" : ""}
                />
              </label>
            ))}
          </div>

          <div className="rounded-lg border p-3">
            <div className="text-sm text-slate-700 mb-2">Add module</div>
            <div className="flex gap-2">
              <select
                className="rounded border px-3 py-2"
                value={toAdd}
                onChange={(e) => setToAdd(e.target.value as ModuleType)}
              >
                {LIBRARY.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <button onClick={addModule} className="rounded-lg bg-blue-600 text-white px-4 py-2">
                Add
              </button>
            </div>
            <div className="text-xs text-slate-500 mt-2">
              Tip: For triplicate BP or multiple ECGs, increase <strong>Repeat</strong>.
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={handleDownloadDocx} className="rounded-lg bg-blue-600 text-white px-4 py-2">
              Download .docx
            </button>
            <button onClick={() => window.print()} className="rounded-lg border px-4 py-2">
              Print / Save as PDF
            </button>
          </div>

          {msg && (
            <div className={"text-sm mt-2 " + (msg.toLowerCase().includes("downloaded") ? "text-green-700" : "text-red-600")}>
              {msg}
            </div>
          )}
        </section>

        {/* Right: Preview */}
        <section className="space-y-4">
          {HeaderPreview}
          <div className="grid gap-3">
            {mods.length === 0 ? (
              <div className="text-sm text-slate-500 border rounded-lg p-4">
                No modules yet. Use <em>Add module</em> to get started.
              </div>
            ) : (
              mods.map((m) => <ModuleCard key={m.id} {...m} />)
            )}
          </div>
        </section>
      </main>

      <footer className="py-8 border-t text-center text-sm text-slate-600">
        © {new Date().getFullYear()} {BRAND.name} · Templates are for guidance and must be adapted to each protocol/IRB.
      </footer>
    </div>
  );
}
