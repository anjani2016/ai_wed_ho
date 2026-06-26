export type Section = 'inspect' | 'records' | 'analytics' | 'audit' | 'settings'

export const SECTION_META: Record<Section, { title: string; subtitle: string }> = {
  inspect: {
    title: 'Inspect',
    subtitle: 'Run AI-assisted radiographic weld inspection',
  },
  records: {
    title: 'Records',
    subtitle: 'Inspection history and review workflow',
  },
  analytics: {
    title: 'Analytics',
    subtitle: 'Defect trends and inspection metrics',
  },
  audit: {
    title: 'Audit Log',
    subtitle: 'Traceable system and user activity',
  },
  settings: {
    title: 'Settings',
    subtitle: 'Backend connection and platform configuration',
  },
}
