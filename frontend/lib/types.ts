export type Verdict = 'PASS' | 'REJECT'

export type DefectStatus = 'Acceptable' | 'Rejectable'

export interface Defect {
  type: string
  confidence: number // 0-100
  length_mm: number
  width_mm: number
  status: DefectStatus
  // Normalized bounding box (0-1) for overlay rendering.
  box: { x: number; y: number; w: number; h: number }
}

export type WorkflowStage =
  | 'Inspected'
  | 'Performer Review'
  | 'Supervisor Approved'

export interface InspectionRecord {
  report_id: string
  timestamp: string
  verdict: Verdict
  model: string
  material: string
  regulatory_code: string
  app_type: string
  usage: string
  client_spec: string
  thickness: number
  reasoning: string
  defects: Defect[]
  annotated_image: string | null
  original_image: string | null
  workflow: WorkflowStage
  performer_remarks?: string
  supervisor_remarks?: string
}

export interface InspectResponse {
  status: string
  report_id: string
  result: {
    verdict: Verdict
    reasoning: string
  }
  annotated_image: string | null
  defects: Defect[]
}

export type AuditAction =
  | 'RUN_INSPECTION'
  | 'FETCH_RECORDS'
  | 'SUBMIT_FEEDBACK'
  | 'APPROVE_RECORD'
  | 'UNAUTHORIZED'

export interface AuditEvent {
  id: string
  timestamp: string
  role: string
  action: AuditAction
  details: string
}

export interface InspectionParams {
  model: string
  material: string
  thickness: number
  regulatory_code: string
  app_type: string
  usage: string
  client_spec: string
}
