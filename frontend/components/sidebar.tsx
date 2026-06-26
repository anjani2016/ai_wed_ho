'use client'

import {
  Microscope,
  ClipboardList,
  BarChart3,
  Shield,
  Settings,
  ScanLine,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Section } from '@/lib/sections'

const navItems: { id: Section; label: string; icon: typeof Microscope }[] = [
  { id: 'inspect', label: 'Inspect', icon: Microscope },
  { id: 'records', label: 'Records', icon: ClipboardList },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'audit', label: 'Audit Log', icon: Shield },
  { id: 'settings', label: 'Settings', icon: Settings },
]

type ConnStatus = 'connecting' | 'online' | 'offline'

export function Sidebar({
  active,
  onNavigate,
  status,
}: {
  active: Section
  onNavigate: (s: Section) => void
  status: ConnStatus
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-2.5 border-b border-sidebar-border px-5 py-4">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary glow-amber">
          <ScanLine className="size-5 text-primary-foreground" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold text-foreground">WeldVision AI</p>
          <p className="text-[11px] text-muted-foreground">NDT Inspection</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="size-4.5 shrink-0" />
              {item.label}
            </button>
          )
        })}
      </nav>

      <ConnectionStatus status={status} />
    </aside>
  )
}

function ConnectionStatus({ status }: { status: ConnStatus }) {
  const config = {
    connecting: {
      label: 'Connecting…',
      dot: 'bg-primary',
      text: 'text-primary',
    },
    online: { label: 'Backend Online', dot: 'bg-success', text: 'text-success' },
    offline: {
      label: 'Demo Mode (offline)',
      dot: 'bg-destructive',
      text: 'text-destructive',
    },
  }[status]

  return (
    <div className="border-t border-sidebar-border p-3">
      <div className="flex items-center gap-2.5 rounded-lg bg-secondary/50 px-3 py-2.5">
        {status === 'connecting' ? (
          <Loader2 className="size-3.5 animate-spin text-primary" />
        ) : (
          <span className="relative flex size-2.5">
            <span
              className={cn(
                'absolute inline-flex size-full animate-ping rounded-full opacity-60',
                config.dot,
              )}
            />
            <span
              className={cn('relative inline-flex size-2.5 rounded-full', config.dot)}
            />
          </span>
        )}
        <span className={cn('text-xs font-medium', config.text)}>
          {config.label}
        </span>
      </div>
    </div>
  )
}
