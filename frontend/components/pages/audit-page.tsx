'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Input, Select } from '@/components/ui/primitives'
import { ActionBadge } from '@/components/ui/badges'
import type { AuditAction, AuditEvent } from '@/lib/types'

const ACTIONS: (AuditAction | 'All')[] = [
  'All',
  'RUN_INSPECTION',
  'FETCH_RECORDS',
  'SUBMIT_FEEDBACK',
  'APPROVE_RECORD',
  'UNAUTHORIZED',
]

export function AuditPage({ events }: { events: AuditEvent[] }) {
  const [query, setQuery] = useState('')
  const [action, setAction] = useState<AuditAction | 'All'>('All')

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (action !== 'All' && e.action !== action) return false
      if (query) {
        const q = query.toLowerCase()
        if (
          !`${e.role} ${e.action} ${e.details}`.toLowerCase().includes(q)
        )
          return false
      }
      return true
    })
  }, [events, query, action])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search events…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="w-52">
          <Select
            value={action}
            onChange={(e) => setAction(e.target.value as AuditAction | 'All')}
          >
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a === 'All' ? 'All Actions' : a}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Timestamp</th>
              <th className="px-4 py-3 font-medium">User Role</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-sm text-muted-foreground"
                >
                  No audit events match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((e) => (
                <tr
                  key={e.id}
                  className="border-b border-border/60 last:border-0 hover:bg-secondary/30"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">
                    {new Date(e.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-foreground">
                      {e.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ActionBadge action={e.action} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{e.details}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
