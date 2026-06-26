import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WorkflowStage } from '@/lib/types'

const STAGES: WorkflowStage[] = [
  'Inspected',
  'Performer Review',
  'Supervisor Approved',
]

export function WorkflowSteps({ stage }: { stage: WorkflowStage }) {
  const currentIndex = STAGES.indexOf(stage)
  return (
    <div className="flex items-center">
      {STAGES.map((s, i) => {
        const done = i <= currentIndex
        const isLast = i === STAGES.length - 1
        return (
          <div key={s} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'flex size-7 items-center justify-center rounded-full border text-xs font-bold transition-colors',
                  done
                    ? 'border-success bg-success/15 text-success'
                    : 'border-border bg-secondary text-muted-foreground',
                )}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </div>
              <span
                className={cn(
                  'whitespace-nowrap text-[11px] font-medium',
                  done ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {s}
              </span>
            </div>
            {!isLast && (
              <div
                className={cn(
                  'mx-2 h-0.5 flex-1 rounded-full',
                  i < currentIndex ? 'bg-success' : 'bg-border',
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
