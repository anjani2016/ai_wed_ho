import { cn } from '@/lib/utils'
import type { AuditAction, DefectStatus, Verdict } from '@/lib/types'

export function VerdictBadge({
  verdict,
  className,
}: {
  verdict: Verdict
  className?: string
}) {
  const pass = verdict === 'PASS'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wide',
        pass
          ? 'bg-success/15 text-success'
          : 'bg-destructive/15 text-destructive',
        className,
      )}
    >
      <span
        className={cn(
          'size-1.5 rounded-full',
          pass ? 'bg-success' : 'bg-destructive',
        )}
      />
      {verdict}
    </span>
  )
}

export function StatusBadge({ status }: { status: DefectStatus }) {
  const ok = status === 'Acceptable'
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        ok
          ? 'bg-success/10 text-success'
          : 'bg-destructive/10 text-destructive',
      )}
    >
      {status}
    </span>
  )
}

const actionStyles: Record<AuditAction, string> = {
  RUN_INSPECTION: 'bg-info/15 text-info',
  FETCH_RECORDS: 'bg-muted text-muted-foreground',
  SUBMIT_FEEDBACK: 'bg-primary/15 text-primary',
  APPROVE_RECORD: 'bg-success/15 text-success',
  UNAUTHORIZED: 'bg-destructive/15 text-destructive',
}

export function ActionBadge({ action }: { action: AuditAction }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold tracking-tight',
        actionStyles[action],
      )}
    >
      {action}
    </span>
  )
}
