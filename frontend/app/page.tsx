'use client'

import { useCallback, useEffect, useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { ToastProvider } from '@/components/toast'
import { InspectPage } from '@/components/pages/inspect-page'
import { RecordsPage } from '@/components/pages/records-page'
import { AnalyticsPage } from '@/components/pages/analytics-page'
import { AuditPage } from '@/components/pages/audit-page'
import { SettingsPage } from '@/components/pages/settings-page'
import { SECTION_META, type Section } from '@/lib/sections'
import type { AuditEvent, InspectionRecord } from '@/lib/types'
import { MOCK_AUDIT, MOCK_RECORDS } from '@/lib/mock-data'
import { checkLicense, fetchRecords } from '@/lib/api'
import { getRole } from '@/lib/config'

type ConnStatus = 'connecting' | 'online' | 'offline'

export default function Page() {
  const [section, setSection] = useState<Section>('inspect')
  const [records, setRecords] = useState<InspectionRecord[]>(MOCK_RECORDS)
  const [audit, setAudit] = useState<AuditEvent[]>(MOCK_AUDIT)
  const [status, setStatus] = useState<ConnStatus>('connecting')

  const addAudit = useCallback(
    (action: AuditEvent['action'], details: string) => {
      setAudit((prev) => [
        {
          id: `EVT-${Date.now()}`,
          timestamp: new Date().toISOString(),
          role: getRole(),
          action,
          details,
        },
        ...prev,
      ])
    },
    [],
  )

  const addRecord = useCallback((record: InspectionRecord) => {
    setRecords((prev) => [record, ...prev])
  }, [])

  const updateRecord = useCallback(
    (reportId: string, patch: Partial<InspectionRecord>) => {
      setRecords((prev) =>
        prev.map((r) => (r.report_id === reportId ? { ...r, ...patch } : r)),
      )
    },
    [],
  )

  useEffect(() => {
    let cancelled = false
    async function init() {
      const license = await checkLicense()
      if (cancelled) return
      setStatus(license.ok ? 'online' : 'offline')
      if (license.ok) {
        try {
          const fetched = await fetchRecords()
          if (!cancelled && fetched.length) setRecords(fetched)
        } catch {
          /* keep mock data */
        }
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [])

  const meta = SECTION_META[section]

  return (
    <ToastProvider>
      <div className="min-h-screen bg-background">
        <Sidebar active={section} onNavigate={setSection} status={status} />
        <div className="pl-60">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/80 px-8 py-4 backdrop-blur-md">
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                {meta.title}
              </h1>
              <p className="text-sm text-muted-foreground">{meta.subtitle}</p>
            </div>
          </header>
          <main key={section} className="animate-fade-in-up p-8">
            {section === 'inspect' && (
              <InspectPage addRecord={addRecord} addAudit={addAudit} />
            )}
            {section === 'records' && (
              <RecordsPage
                records={records}
                updateRecord={updateRecord}
                addAudit={addAudit}
              />
            )}
            {section === 'analytics' && <AnalyticsPage records={records} />}
            {section === 'audit' && <AuditPage events={audit} />}
            {section === 'settings' && (
              <SettingsPage
                status={status}
                setStatus={setStatus}
                addAudit={addAudit}
              />
            )}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
