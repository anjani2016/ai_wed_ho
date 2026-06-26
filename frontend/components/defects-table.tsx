import { StatusBadge } from '@/components/ui/badges'
import type { Defect } from '@/lib/types'

export function DefectsTable({ defects }: { defects: Defect[] }) {
  if (!defects.length) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No defects detected. Weld bead is clean across the inspected length.
      </div>
    )
  }
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-2.5 font-medium">Type</th>
            <th className="px-4 py-2.5 font-medium">Confidence</th>
            <th className="px-4 py-2.5 font-medium">Dimensions (mm)</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {defects.map((d, i) => (
            <tr
              key={i}
              className="border-b border-border/60 last:border-0 hover:bg-secondary/30"
            >
              <td className="px-4 py-3 font-medium text-foreground">{d.type}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${d.confidence}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    {d.confidence}%
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                {d.length_mm.toFixed(1)} × {d.width_mm.toFixed(1)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={d.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
