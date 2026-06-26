'use client'

import { useEffect, useState } from 'react'
import { Loader2, Plug, Server, Database, MapPin, UserCog } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Select,
} from '@/components/ui/primitives'
import { useToast } from '@/components/toast'
import { checkLicense } from '@/lib/api'
import {
  AWS_REGION,
  DEFAULT_API_URL,
  DYNAMODB_TABLE,
  getApiUrl,
  getRole,
  setApiUrl,
  setRole,
  type UserRole,
} from '@/lib/config'
import type { AuditEvent } from '@/lib/types'

type ConnStatus = 'connecting' | 'online' | 'offline'

const ROLES: UserRole[] = [
  'Inspector',
  'Performer',
  'Supervisor',
  'Admin',
  'Auditor',
]

export function SettingsPage({
  status,
  setStatus,
  addAudit,
}: {
  status: ConnStatus
  setStatus: (s: ConnStatus) => void
  addAudit: (a: AuditEvent['action'], details: string) => void
}) {
  const { toast } = useToast()
  const [url, setUrl] = useState(DEFAULT_API_URL)
  const [role, setRoleState] = useState<UserRole>('Inspector')
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    setUrl(getApiUrl())
    setRoleState(getRole())
  }, [])

  const handleTest = async () => {
    setApiUrl(url)
    setTesting(true)
    setStatus('connecting')
    const res = await checkLicense()
    setTesting(false)
    setStatus(res.ok ? 'online' : 'offline')
    toast({
      variant: res.ok ? 'success' : 'error',
      title: res.ok ? 'Connection successful' : 'Connection failed',
      description: res.ok
        ? `Backend reachable at ${url}`
        : 'Backend unreachable — running in demo mode.',
    })
  }

  const handleRoleChange = (r: UserRole) => {
    setRoleState(r)
    setRole(r)
    toast({
      variant: 'info',
      title: 'Role updated',
      description: `Active role set to ${r}.`,
    })
  }

  return (
    <div className="grid max-w-3xl gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="size-4 text-primary" />
            Backend Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field label="Backend API URL">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://localhost:8000"
            />
          </Field>
          <div className="flex items-center gap-3">
            <Button onClick={handleTest} disabled={testing}>
              {testing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Testing…
                </>
              ) : (
                <>
                  <Plug />
                  Test Connection
                </>
              )}
            </Button>
            <StatusPill status={status} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="size-4 text-primary" />
            User Role
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Field label="Active Role">
            <Select
              value={role}
              onChange={(e) => handleRoleChange(e.target.value as UserRole)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </Field>
          <p className="mt-2 text-xs text-muted-foreground">
            Role determines workflow permissions. Only Supervisors and Admins can
            approve inspection records.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="size-4 text-primary" />
            Infrastructure
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <ReadOnly
            icon={<MapPin className="size-4 text-muted-foreground" />}
            label="AWS Region"
            value={AWS_REGION}
          />
          <ReadOnly
            icon={<Database className="size-4 text-muted-foreground" />}
            label="DynamoDB Table"
            value={DYNAMODB_TABLE}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function StatusPill({ status }: { status: ConnStatus }) {
  const cfg = {
    connecting: { label: 'Connecting', cls: 'text-primary bg-primary/10' },
    online: { label: 'Online', cls: 'text-success bg-success/10' },
    offline: { label: 'Offline / Demo', cls: 'text-destructive bg-destructive/10' },
  }[status]
  return (
    <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function ReadOnly({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3">
      <div className="mb-1 flex items-center gap-2">
        {icon}
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="font-mono text-sm text-foreground">{value}</p>
    </div>
  )
}
