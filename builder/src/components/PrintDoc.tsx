// src/components/PrintDoc.tsx
import React from "react";

type Fields = Record<string, string>;

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
  repeatCount?: number;
  data?: Record<string, string>;
};

function toText(val?: string) {
  return val ?? "";
}

function SectionHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="pd-row">
      <div className="pd-section-title">{title}</div>
      {right ? <div className="pd-right">{right}</div> : null}
    </div>
  );
}

function PIChip() {
  return (
    <div className="pd-pichip">
      <span>Investigator Assessment:</span>
      <span className="pd-box">□</span> Normal
      <span className="pd-box">□</span> Abnormal (NCS)
      <span className="pd-box">□</span> Abnormal (CS)
    </div>
  );
}

function Grid({ columns, rows }: { columns: string[]; rows: number }) {
  return (
    <table className="pd-grid">
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c}>{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, r) => (
          <tr key={r}>
            {columns.map((c) => (
              <td key={c}>&nbsp;</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ModuleBlock({ m }: { m: ModuleInstance }) {
  const repeat = Math.max(1, m.repeatCount ?? 1);

  if (m.type === "vitals") {
    return (
      <div className="pd-card">
        <SectionHeader title={m.title} right={<PIChip />} />
        <div className="pd-note">Position: Sitting □  Supine □  Standing □ &nbsp;&nbsp; Device: __________________</div>
        {Array.from({ length: repeat }).map((_, i) => (
          <div className="pd-subcard" key={i}>
            <div className="pd-muted">Reading {i + 1}</div>
            <div>Time ____:____ &nbsp; HR ___ &nbsp; BP ___/___ &nbsp; RR ___ &nbsp; Temp ___°C (___°F) &nbsp; SpO₂ ___%</div>
            <div className="pd-muted">Weight ___ kg &nbsp; Height ___ cm &nbsp; BMI ___ kg/m² &nbsp; (omit if remote)</div>
          </div>
        ))}
        <div>Investigator (print/sign/date): <span className="pd-line" /></div>
      </div>
    );
  }

  if (m.type === "ecg") {
    return (
      <div className="pd-card">
        <SectionHeader title={m.title} right={<PIChip />} />
        <div>12-lead ECG per protocol. Record times & any repeats.</div>
        {Array.from({ length: repeat }).map((_, i) => (
          <div className="pd-subcard" key={i}>
            <div className="pd-muted">ECG {i + 1}</div>
            <div>Date ____-___-____ &nbsp; Time ____:____ &nbsp; QTc ___ ms &nbsp; Rhythm ____.
              &nbsp; Repeat? Yes □  No □  N/A □
            </div>
          </div>
        ))}
        <div>Investigator (print/sign/date): <span className="pd-line" /></div>
      </div>
    );
  }

  if (m.type === "labs") {
    return (
      <div className="pd-card">
        <SectionHeader title={m.title} right={<PIChip />} />
        <Grid
          columns={[
            "Specimen","Date","Time","Fasting?","Volume","Tube","Collected By",
            "Processed?","Centrifuge","Frozen Temp","Shipped?","Courier","Notes"
          ]}
          rows={3}
        />
      </div>
    );
  }

  if (m.type === "pk") {
    return (
      <div className="pd-card">
        <SectionHeader title={m.title} right={<PIChip />} />
        <Grid columns={["Timepoint","Actual Time","Volume","Tube/Label","Handling","Notes"]} rows={4} />
      </div>
    );
  }

  if (m.type === "physicalExam" || m.type === "neuroExam") {
    const lines =
      m.type === "physicalExam"
        ? "General · HEENT · Cardiac · Respiratory · Abdomen · Musculoskeletal · Skin"
        : "Mental status · Cranial nerves · Motor · Sensory · Reflexes · Coordination · Gait";
    return (
      <div className="pd-card">
        <SectionHeader title={m.title} right={<PIChip />} />
        <div className="pd-subcard">
          {lines}
          <div className="pd-spacer" />
          <div>Findings / Notes:</div>
          <div className="pd-boxarea" />
        </div>
        <div>Investigator (print/sign/date): <span className="pd-line" /></div>
      </div>
    );
  }

  if (m.type === "imaging") {
    return (
      <div className="pd-card">
        <SectionHeader title={m.title} right={<PIChip />} />
        <Grid columns={["Modality","Body region","Date/Time","Facility","Result summary / Impression"]} rows={2} />
        <div className="pd-muted">If images/reports provided, file under Attachments and note file names.</div>
      </div>
    );
  }

  if (m.type === "procedure") {
    return (
      <div className="pd-card">
        <SectionHeader title={m.title} right={<PIChip />} />
        <Grid columns={["Type","Location","Date/Time","Operator","Sedation","Complications"]} rows={2} />
        <div className="pd-note">Checks: consent □  fasting □  allergies □ &nbsp; Sedation □ / □ No sedation</div>
        <div>Investigator (print/sign/date): <span className="pd-line" /></div>
      </div>
    );
  }

  if (m.type === "ipAccountability") {
    return (
      <div className="pd-card">
        <SectionHeader title={m.title} />
        <Grid columns={["IP/Device","Lot/Kit","Strength/Model","Exp. Date","Dispensed","Returned","Balance"]} rows={3} />
        <div className="pd-note">Storage conditions (temp/log) · Chain of custody · Destroyed? date/by</div>
        <div>Pharmacist/Designee (print/sign/date): <span className="pd-line" /></div>
        <div>Investigator (print/sign/date): <span className="pd-line" /></div>
      </div>
    );
  }

  if (m.type === "notes") {
    return (
      <div className="pd-card">
        <SectionHeader title={m.title} />
        <div className="pd-boxarea" style={{ height: "6rem" }} />
      </div>
    );
  }

  if (m.type === "nextAppointment") {
    return (
      <div className="pd-card">
        <SectionHeader title={m.title} />
        <div>Next visit date: ____-___-____ &nbsp; Window: ______ &nbsp; Time: ____:____</div>
        <div className="pd-spacer" />
        <div>Instructions provided:</div>
        <div className="pd-boxarea" />
        <div className="pd-spacer" />
        <div>Coordinator contact: <span className="pd-line w-sm" /> Phone: <span className="pd-line w-sm" /></div>
      </div>
    );
  }

  if (m.type === "attachments") {
    return (
      <div className="pd-card">
        <SectionHeader title={m.title} />
        <div>File/Report name(s): <span className="pd-line w-xl" /></div>
      </div>
    );
  }

  if (m.type === "consent") {
    return (
      <div className="pd-card">
        <SectionHeader title={m.title} />
        <div>ICF Version/Date: <span className="pd-line w-md" /> &nbsp; IRB: <span className="pd-line w-md" /></div>
        <ul className="pd-bullets">
          <li>Private area used; identity verified</li>
          <li>Provided IRB-approved ICF and time to review</li>
          <li>Discussed purpose, procedures, risks/benefits, alternatives</li>
          <li>Questions answered; no coercion/undue influence</li>
          <li>Assessed comprehension (teach-back)</li>
          <li>Signatures obtained before any procedures</li>
        </ul>
        <div>Signature Times (24-hr): Participant ____:____ &nbsp; LAR ____:____ &nbsp; POC ____:____</div>
      </div>
    );
  }

  if (m.type === "eligibility") {
    return (
      <div className="pd-card">
        <SectionHeader title={m.title} />
        <div className="pd-subtitle">Inclusion Criteria</div>
        <ul className="pd-bullets">
          <li>1) ______________________ &nbsp;&nbsp; Met □  Not Met □  Evidence: __________</li>
          <li>2) ______________________ &nbsp;&nbsp; Met □  Not Met □  Evidence: __________</li>
          <li>3) ______________________ &nbsp;&nbsp; Met □  Not Met □  Evidence: __________</li>
        </ul>
        <div className="pd-subtitle">Exclusion Criteria</div>
        <ul className="pd-bullets">
          <li>1) ______________________ &nbsp;&nbsp; Absent □  Present (exclusion) □  Evidence: __________</li>
          <li>2) ______________________ &nbsp;&nbsp; Absent □  Present (exclusion) □  Evidence: __________</li>
          <li>3) ______________________ &nbsp;&nbsp; Absent □  Present (exclusion) □  Evidence: __________</li>
        </ul>
      </div>
    );
  }

  return null;
}

export default function PrintDoc({
  fields,
  mods,
  version = "v1.2",
  brand = "Research Source Consulting",
}: {
  fields: Fields;
  mods: ModuleInstance[];
  version?: string;
  brand?: string;
}) {
  // This whole wrapper is hidden on screen and shown only on print via CSS
  return (
    <div className="print-only pd-root">
      {/* Header */}
      <div className="pd-head">
        <div className="pd-brand">{brand}</div>
        <div className="pd-headgrid">
          <div><b>Protocol Title:</b> {toText(fields.title)}</div>
          <div><b>Subject ID:</b> {toText(fields.subjectId)}</div>
          <div><b>Site No:</b> {toText(fields.site)}</div>
          <div><b>Initials:</b> {toText(fields.initials)}</div>
          <div><b>PI:</b> {toText(fields.pi)}</div>
          <div><b>Visit:</b> {toText(fields.visit)}</div>
          <div><b>Visit Date:</b> {toText(fields.visitDate)}</div>
        </div>
        <div className="pd-muted">Source Version: {version} • Correct with single line, date & initials; no obliteration.</div>
      </div>

      {/* Modules */}
      {mods.map((m) => (
        <ModuleBlock key={m.id} m={m} />
      ))}

      {/* Footer */}
      <div className="pd-foot">
        <div>Original Source • Version {version}</div>
        <div>Page □ of □</div>
      </div>
    </div>
  );
}
