import type {
  AuditEvent,
  Defect,
  InspectionRecord,
  Verdict,
} from './types'

export const MODELS = ['RT-DETR (Fine-tuned)', 'Gazprom YOLO (m60)']
export const MATERIALS = [
  'Carbon Steel',
  'Stainless Steel',
  'Alloy Steel',
  'Chrome-Moly',
  'Duplex SS',
]
export const REGULATORY_CODES = [
  'ASME B31.3',
  'AWS D1.1',
  'API 1104',
  'ASME Sect. VIII',
  'EN ISO 17636',
]
export const APP_TYPES = ['Piping', 'Structural', 'Pressure Vessel', 'Storage Tank']
export const USAGE_TYPES = ['Fabrication', 'In-service', 'Repair']
export const DEFECT_TYPES = [
  'Porosity',
  'Crack',
  'Slag Inclusion',
  'Undercut',
  'Lack of Fusion',
  'Incomplete Penetration',
  'Tungsten Inclusion',
]

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length]
}

function makeDefects(seed: number, verdict: Verdict): Defect[] {
  const count = verdict === 'REJECT' ? 2 + (seed % 3) : seed % 2
  const defects: Defect[] = []
  for (let i = 0; i < count; i++) {
    const type = pick(DEFECT_TYPES, seed + i * 3)
    const rejectable =
      verdict === 'REJECT' && i === 0
        ? true
        : (seed + i) % 3 === 0 && verdict === 'REJECT'
    defects.push({
      type,
      confidence: 70 + ((seed * 7 + i * 13) % 29),
      length_mm: Number((1.2 + ((seed + i) % 8) * 0.6).toFixed(1)),
      width_mm: Number((0.4 + ((seed + i) % 4) * 0.3).toFixed(1)),
      status: rejectable ? 'Rejectable' : 'Acceptable',
      box: {
        x: 0.12 + ((seed + i * 17) % 50) / 100,
        y: 0.18 + ((seed + i * 11) % 45) / 100,
        w: 0.08 + ((seed + i) % 5) * 0.02,
        h: 0.06 + ((seed + i) % 4) * 0.02,
      },
    })
  }
  return defects
}

const REASONING_PASS =
  'Radiographic analysis completed across the full weld bead length. Detected indications were evaluated against the acceptance criteria of the selected regulatory code. All identified indications fall within permissible dimensional limits relative to the specified wall thickness. No planar defects (cracks, lack of fusion, or incomplete penetration) were identified. The weld is determined ACCEPTABLE for service.'

const REASONING_REJECT =
  'Radiographic analysis identified one or more indications exceeding the acceptance thresholds defined by the selected regulatory code. A planar defect was localized in the weld root region with a length exceeding the maximum permissible value for the specified wall thickness. Per the governing code clause, planar discontinuities of this nature are non-permissible regardless of length. The weld is determined REJECTABLE and requires excavation and repair followed by re-inspection.'

function isoDaysAgo(days: number, hour = 9): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(hour, (days * 7) % 60, 0, 0)
  return d.toISOString()
}

export function buildMockRecords(): InspectionRecord[] {
  const records: InspectionRecord[] = []
  for (let i = 0; i < 24; i++) {
    const verdict: Verdict = i % 10 < 3 ? 'REJECT' : 'PASS'
    const defects = makeDefects(i + 3, verdict)
    const stage =
      i % 4 === 0
        ? 'Supervisor Approved'
        : i % 4 === 1
          ? 'Performer Review'
          : 'Inspected'
    records.push({
      report_id: `RPT-${(1042 - i).toString().padStart(5, '0')}`,
      timestamp: isoDaysAgo(i, 8 + (i % 9)),
      verdict,
      model: pick(MODELS, i),
      material: pick(MATERIALS, i + 1),
      regulatory_code: pick(REGULATORY_CODES, i + 2),
      app_type: pick(APP_TYPES, i),
      usage: pick(USAGE_TYPES, i),
      client_spec: i % 3 === 0 ? `CS-${2000 + i}` : '',
      thickness: Number((6 + (i % 7) * 2.5).toFixed(1)),
      reasoning: verdict === 'PASS' ? REASONING_PASS : REASONING_REJECT,
      defects,
      annotated_image: null,
      original_image: null,
      workflow: stage as InspectionRecord['workflow'],
      performer_remarks:
        stage !== 'Inspected'
          ? 'Reviewed annotated radiograph. Concur with AI classification.'
          : undefined,
      supervisor_remarks:
        stage === 'Supervisor Approved'
          ? 'Disposition confirmed. Record closed.'
          : undefined,
    })
  }
  return records
}

export const MOCK_RECORDS = buildMockRecords()

export function buildMockAudit(): AuditEvent[] {
  const actions: AuditEvent['action'][] = [
    'RUN_INSPECTION',
    'FETCH_RECORDS',
    'SUBMIT_FEEDBACK',
    'APPROVE_RECORD',
    'UNAUTHORIZED',
  ]
  const roles = ['Inspector', 'Performer', 'Supervisor', 'Admin', 'Auditor']
  const events: AuditEvent[] = []
  for (let i = 0; i < 30; i++) {
    const action = actions[i % actions.length]
    const role = roles[i % roles.length]
    let details = ''
    switch (action) {
      case 'RUN_INSPECTION':
        details = `Inspection executed on RPT-${(1042 - (i % 24)).toString().padStart(5, '0')} using ${pick(MODELS, i)}`
        break
      case 'FETCH_RECORDS':
        details = `Retrieved ${20 + (i % 5)} inspection records from DynamoDB`
        break
      case 'SUBMIT_FEEDBACK':
        details = `Performer remarks added to RPT-${(1042 - (i % 24)).toString().padStart(5, '0')}`
        break
      case 'APPROVE_RECORD':
        details = `Supervisor approved RPT-${(1042 - (i % 24)).toString().padStart(5, '0')}`
        break
      case 'UNAUTHORIZED':
        details = `Blocked attempt to approve record without Supervisor role`
        break
    }
    events.push({
      id: `EVT-${(5000 - i).toString()}`,
      timestamp: isoDaysAgo(Math.floor(i / 3), 7 + (i % 12)),
      role,
      action,
      details,
    })
  }
  return events
}

export const MOCK_AUDIT = buildMockAudit()

// Analytics aggregations derived from records.
export function defectFrequency(records: InspectionRecord[]) {
  const counts: Record<string, number> = {}
  DEFECT_TYPES.forEach((t) => (counts[t] = 0))
  records.forEach((r) =>
    r.defects.forEach((d) => {
      counts[d.type] = (counts[d.type] ?? 0) + 1
    }),
  )
  return Object.entries(counts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
}

export function dailyVolume() {
  const data: { date: string; count: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const base = 4 + Math.round(Math.abs(Math.sin(i / 3)) * 9)
    data.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: base + (i % 4),
    })
  }
  return data
}
