'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, ChevronRight } from 'lucide-react'
import { Input, Select } from '@/components/ui/primitives'
import { VerdictBadge } from '@/components/ui/badges'
import { RecordDetail } from '@/components/pages/record-detail'
import type { AuditEvent, InspectionRecord, Verdict } from '@/lib/types'
import { cn } from '@/lib/utils'

type VerdictFilter = 'All' | Verdict

export function RecordsPage({
  records,
  updateRecord,
  addAudit,
}: {
  records: InspectionRecord[]
  updateRecord: (id: string, patch: Partial<InspectionRecord>) => void
  addAudit: (a: AuditEvent['action'], details: string) => void
}) {
  const [query, setQuery] = useState('')
  const [verdict, setVerdict] = useState<VerdictFilter>('All')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [selected, setSelected] = useState<InspectionRecord | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    addAudit('FETCH_RECORDS', `Retrieved ${records.length} inspection records`)
    const t = setTimeout(() => setLoading(false), 700)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (verdict !== 'All' && r.verdict !== verdict) return false
      if (query) {
        const q = query.toLowerCase()
        const hay =
          `${r.report_id} ${r.material} ${r.regulatory_code} ${r.model}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (fromDate && new Date(r.timestamp) < new Date(fromDate)) return false
      if (toDate && new Date(r.timestamp) > new Date(toDate + 'T23:59:59'))
        return false
      return true
    })
  }, [records, verdict, query, fromDate, toDate])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search report ID, material, code…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="w-40">
          <Select
            value={verdict}
            onChange={(e) => setVerdict(e.target.value as VerdictFilter)}
          >
            <option value="All">All Verdicts</option>
            <option value="PASS">PASS</option>
            <option value="REJECT">REJECT</option>
          </Select>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              From
            </p>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-40"
            />
          </div>
          <div>
            <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              To
            </p>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-40"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Report ID</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Material</th>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Model</th>
              <th className="px-4 py-3 font-medium">Verdict</th>
              <th className="px-4 py-3 font-medium">Thickness</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-sm text-muted-foreground"
                >
                  No records match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr
                  key={r.report_id}
                  onClick={() => setSelected(r)}
                  className="cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-secondary/40"
                >
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">
                    {r.report_id}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(r.timestamp).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-foreground">{r.material}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.regulatory_code}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.model}</td>
                  <td className="px-4 py-3">
                    <VerdictBadge verdict={r.verdict} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {r.thickness} mm
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight className="ml-auto size-4 text-muted-foreground" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {loading ? '…' : filtered.length} of {records.length} records
      </p>

      {selected && (
        <RecordDetail
          record={records.find((r) => r.report_id === selected.report_id) ?? selected}
          onClose={() => setSelected(null)}
          updateRecord={updateRecord}
          addAudit={addAudit}
        />
      )}
    </div>
  )
}

function SkeletonRow() {
  return (
    <tr className="border-b border-border/60 last:border-0">
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div
            className={cn(
              'h-3.5 animate-pulse rounded bg-secondary',
              i === 0 ? 'w-20' : i === 5 ? 'w-16' : 'w-24',
            )}
          />
        </td>
      ))}
    </tr>
  )
}
