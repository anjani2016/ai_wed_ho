'use client'

import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Activity, CheckCircle2, XCircle, ScanSearch } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/primitives'
import { dailyVolume, defectFrequency } from '@/lib/mock-data'
import type { InspectionRecord } from '@/lib/types'

const AMBER = '#f59e0b'
const RED = '#ef4444'
const GREEN = '#22c55e'
const BLUE = '#3b82f6'

const tooltipStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: 8,
  color: '#e2e8f0',
  fontSize: 12,
}

export function AnalyticsPage({ records }: { records: InspectionRecord[] }) {
  const stats = useMemo(() => {
    const total = records.length
    const passes = records.filter((r) => r.verdict === 'PASS').length
    const rejects = total - passes
    const totalDefects = records.reduce((s, r) => s + r.defects.length, 0)
    return {
      total,
      passRate: total ? Math.round((passes / total) * 100) : 0,
      rejectRate: total ? Math.round((rejects / total) * 100) : 0,
      avgDefects: total ? (totalDefects / total).toFixed(1) : '0',
      passes,
      rejects,
    }
  }, [records])

  const defectData = useMemo(() => defectFrequency(records), [records])
  const volumeData = useMemo(() => dailyVolume(), [])
  const pieData = [
    { name: 'PASS', value: stats.passes, color: GREEN },
    { name: 'REJECT', value: stats.rejects, color: RED },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Inspections"
          value={String(stats.total)}
          icon={<ScanSearch className="size-5 text-primary" />}
          accent="text-primary"
        />
        <StatCard
          label="Pass Rate"
          value={`${stats.passRate}%`}
          icon={<CheckCircle2 className="size-5 text-success" />}
          accent="text-success"
        />
        <StatCard
          label="Reject Rate"
          value={`${stats.rejectRate}%`}
          icon={<XCircle className="size-5 text-destructive" />}
          accent="text-destructive"
        />
        <StatCard
          label="Avg Defects / Scan"
          value={stats.avgDefects}
          icon={<Activity className="size-5 text-info" />}
          accent="text-info"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Defect Type Frequency</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={defectData} margin={{ left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="type"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                  interval={0}
                  stroke="#1e293b"
                />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} stroke="#1e293b" allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(245,158,11,0.08)' }} />
                <Bar dataKey="count" fill={AMBER} radius={[4, 4, 0, 0]} name="Occurrences" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pass vs Reject</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={3}
                  stroke="none"
                >
                  {pieData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 flex justify-center gap-6">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {d.name} · {d.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Inspection Volume — Last 30 Days</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={volumeData} margin={{ left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                stroke="#1e293b"
                interval={4}
              />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} stroke="#1e293b" allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#3b82f6' }} />
              <Line
                type="monotone"
                dataKey="count"
                stroke={BLUE}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: BLUE }}
                name="Inspections"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: string
  icon: React.ReactNode
  accent: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className={`mt-1 text-3xl font-bold tracking-tight ${accent}`}>
            {value}
          </p>
        </div>
        <div className="flex size-11 items-center justify-center rounded-lg bg-secondary">
          {icon}
        </div>
      </CardContent>
    </Card>
  )
}
