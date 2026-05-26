'use client'
import {
  BarChart, Bar, Cell, AreaChart, Area,
  PieChart, Pie, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'

export const DONUT_COLORS = ['#818CF8','#A78BFA','#34D399','#FBBF24','#F472B6','#38BDF8','#FB923C']

type DiaBar    = { dia: string; reservas: number; isHoy: boolean }
type SemArea   = { sem: string; actual: number; anterior: number }
type DonutSlice = { name: string; value: number }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltipBar({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 14px', fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#4F46E5' }}>{payload[0].value} reservas</div>
    </div>
  )
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltipArea({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 14px', fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <div key={i} style={{ color: p.color, marginBottom: 2 }}>
          {p.name === 'actual' ? 'Este mes' : 'Mes ant.'}: <b>€{p.value}</b>
        </div>
      ))}
    </div>
  )
}

export function BarChartReservas({ data }: { data: DiaBar[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} barSize={8} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" vertical={false} />
        <XAxis dataKey="dia" tick={{ fontSize: 9, fontWeight: 600, fill: '#9CA3AF' }} axisLine={false} tickLine={false} interval={6} />
        <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip content={<CustomTooltipBar />} cursor={{ fill: 'rgba(0,0,0,0.04)', radius: 4 }} />
        <Bar dataKey="reservas" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.isHoy ? '#4F46E5' : '#C7D2FE'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function AreaChartIngresos({ data }: { data: SemArea[] }) {
  return (
    <ResponsiveContainer width="100%" height={170}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
        <defs>
          <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#818CF8" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#818CF8" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradAnt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#C4B5FD" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#C4B5FD" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" vertical={false} />
        <XAxis dataKey="sem" tick={{ fontSize: 12, fill: '#9CA3AF', fontWeight: 600 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `€${v}`} />
        <Tooltip content={<CustomTooltipArea />} />
        <Area type="monotone" dataKey="anterior" name="anterior" stroke="#C4B5FD" strokeWidth={2} strokeDasharray="4 3" fill="url(#gradAnt)" dot={false} />
        <Area type="monotone" dataKey="actual" name="actual" stroke="#818CF8" strokeWidth={2.5} fill="url(#gradActual)" dot={{ fill: '#818CF8', r: 4, strokeWidth: 2, stroke: 'white' }} activeDot={{ r: 6 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function PieChartServicios({ data }: { data: DonutSlice[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={52} outerRadius={82} paddingAngle={3} dataKey="value" stroke="none">
          {data.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
        </Pie>
        <Tooltip
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(v: any, n: any) => [`${v} reservas`, n]}
          contentStyle={{ borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 12 }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function BarChartNegocios({ data, colors }: { data: { nombre: string; reservas: number; ingresos: number }[]; colors: string[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={28}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" vertical={false} />
        <XAxis dataKey="nombre" tick={{ fontSize: 11, fontWeight: 600, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 12 }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(v: any) => [`${v} reservas`, 'Mes actual']}
        />
        <Bar dataKey="reservas" radius={[6, 6, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
