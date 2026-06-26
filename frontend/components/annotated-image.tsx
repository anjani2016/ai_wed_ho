import { cn } from '@/lib/utils'
import type { Defect } from '@/lib/types'

// Renders a radiograph with overlaid bounding boxes for detected defects.
// If `src` is null, renders a neutral radiograph-style placeholder.
export function AnnotatedImage({
  src,
  defects,
  showBoxes = true,
  label,
  className,
}: {
  src: string | null
  defects?: Defect[]
  showBoxes?: boolean
  label?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-border bg-slate-900',
        className,
      )}
    >
      {/* Radiograph backdrop: simulated weld bead gradient */}
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src || '/placeholder.svg'}
          alt={label ?? 'Radiographic weld image'}
          className="size-full object-cover"
          crossOrigin="anonymous"
        />
      ) : (
        <div
          className="size-full"
          style={{
            background:
              'repeating-linear-gradient(90deg, #0b0f1a 0px, #131a2a 2px, #1a2236 5px, #131a2a 8px, #0b0f1a 11px), radial-gradient(120% 60% at 50% 50%, rgba(120,140,180,0.18), transparent 70%)',
          }}
          aria-hidden="true"
        >
          <div className="flex h-full items-center justify-center">
            <div className="h-10 w-full bg-gradient-to-b from-transparent via-slate-400/15 to-transparent" />
          </div>
        </div>
      )}

      {showBoxes &&
        defects?.map((d, i) => {
          const rejectable = d.status === 'Rejectable'
          return (
            <div
              key={i}
              className={cn(
                'absolute rounded-sm border-2',
                rejectable ? 'border-destructive' : 'border-primary',
              )}
              style={{
                left: `${d.box.x * 100}%`,
                top: `${d.box.y * 100}%`,
                width: `${d.box.w * 100}%`,
                height: `${d.box.h * 100}%`,
                boxShadow: rejectable
                  ? '0 0 12px rgba(239,68,68,0.5)'
                  : '0 0 10px rgba(245,158,11,0.45)',
              }}
            >
              <span
                className={cn(
                  'absolute -top-5 left-0 whitespace-nowrap rounded px-1 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                  rejectable
                    ? 'bg-destructive text-destructive-foreground'
                    : 'bg-primary text-primary-foreground',
                )}
              >
                {d.type} {d.confidence}%
              </span>
            </div>
          )
        })}

      {label && (
        <span className="absolute bottom-2 left-2 rounded bg-background/70 px-2 py-0.5 text-[11px] font-medium text-muted-foreground backdrop-blur">
          {label}
        </span>
      )}
    </div>
  )
}
