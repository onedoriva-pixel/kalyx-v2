"use client"

import { useEffect, useState, useMemo } from "react"
import { collection, query, getDocs, orderBy } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { useRouter } from "next/navigation"
import {
  TrendingUp,
  Download,
  Circle,
  CheckCircle2,
  XCircle,
  Calendar,
  MapPin,
  Truck,
  User,
  BarChart3,
  PieChart,
  Route,
  FileSpreadsheet,
} from "lucide-react"

const STATUS_COLORS = {
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  completed: "bg-blue-500/10 text-blue-600 border-blue-200",
  cancelled: "bg-amber-500/10 text-amber-600 border-amber-200",
}

const STATUS_LABELS = {
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function ChartBar({ value, max, label, color = "bg-gradient-to-t from-teal-500 to-teal-400" }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-xs font-semibold text-gray-500">{value}</span>
      <div className="h-32 w-8 bg-gray-100 rounded-full relative overflow-hidden">
        <div
          className={`absolute bottom-0 left-0 right-0 rounded-full transition-all duration-500 ${color}`}
          style={{ height: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] text-gray-400 font-medium">{label}</span>
    </div>
  )
}

function HorizontalBar({ label, value, max, color = "bg-gradient-to-r from-teal-500 to-teal-400", icon: Icon }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      {Icon && (
        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-gray-500" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-gray-700 truncate">{label}</span>
          <span className="text-sm font-semibold text-gray-900">{value}</span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  )
}

export default function ReportsPage() {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [year, setYear] = useState(new Date().getFullYear().toString())
  const [search, setSearch] = useState("")
  const router = useRouter()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login")
      } else {
        setAuthChecked(true)
      }
    })
    return unsub
  }, [router])

  useEffect(() => {
    if (!authChecked) return
    async function load() {
      try {
        const q = query(collection(db, "trips"), orderBy("date", "desc"))
        const snap = await getDocs(q)
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        setTrips(all)
      } catch (e) {
        console.error("Failed to load trips", e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [authChecked])

  const years = useMemo(() => {
    const y = new Set()
    trips.forEach((t) => {
      if (t.date) {
        const d = new Date(t.date)
        if (!isNaN(d.getTime())) y.add(d.getFullYear().toString())
      }
    })
    return [...y].sort((a, b) => b - a)
  }, [trips])

  const filtered = useMemo(() => {
    return trips.filter((t) => {
      if (!t.date) return false
      const d = new Date(t.date)
      if (isNaN(d.getTime())) return false
      if (d.getFullYear().toString() !== year) return false
      if (search) {
        const s = search.toLowerCase()
        const match =
          (t.name || "").toLowerCase().includes(s) ||
          (t.destination || "").toLowerCase().includes(s) ||
          (t.requestor || "").toLowerCase().includes(s) ||
          (t.van || "").toLowerCase().includes(s)
        if (!match) return false
      }
      return true
    })
  }, [trips, year, search])

  const stats = useMemo(() => {
    const total = filtered.length
    const active = filtered.filter((t) => t.status === "active").length
    const completed = filtered.filter((t) => t.status === "completed").length
    const cancelled = filtered.filter((t) => t.status === "cancelled").length
    return { total, active, completed, cancelled }
  }, [filtered])

  const monthlyTrend = useMemo(() => {
    const counts = Array(12).fill(0)
    filtered.forEach((t) => {
      const d = new Date(t.date)
      if (!isNaN(d.getTime())) counts[d.getMonth()]++
    })
    return counts
  }, [filtered])

  const destinations = useMemo(() => {
    const map = {}
    filtered.forEach((t) => {
      const dest = (t.destination || "Unknown").trim()
      map[dest] = (map[dest] || 0) + 1
    })
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
  }, [filtered])

  const vehicles = useMemo(() => {
    const map = {}
    filtered.forEach((t) => {
      const v = (t.van || "Unknown").trim()
      map[v] = (map[v] || 0) + 1
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [filtered])

  const requestors = useMemo(() => {
    const map = {}
    filtered.forEach((t) => {
      const r = (t.requestor || "Unknown").trim()
      map[r] = (map[r] || 0) + 1
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [filtered])

  const maxMonthly = Math.max(...monthlyTrend, 1)
  const maxDest = destinations.length > 0 ? destinations[0][1] : 1
  const maxVehicle = vehicles.length > 0 ? vehicles[0][1] : 1
  const maxReq = requestors.length > 0 ? requestors[0][1] : 1

  const handlePrint = () => window.print()

  if (!authChecked || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Annual Reports</h1>
              <p className="text-gray-500 mt-1">Trip statistics and analytics for {year}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors no-print"
              >
                <Download className="w-4 h-4" />
                Print Report
              </button>
            </div>
          </div>

          {/* Print Header */}
          <div className="hidden print:block text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">EXECUTIVE PATH</h1>
            <p className="text-xl text-gray-600 mt-2">Annual Trip Report — {year}</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Trips", value: stats.total, color: "from-teal-500 to-emerald-500", icon: BarChart3 },
              { label: "Active", value: stats.active, color: "from-indigo-500 to-blue-500", icon: Circle },
              { label: "Completed", value: stats.completed, color: "from-sky-500 to-cyan-500", icon: CheckCircle2 },
              { label: "Cancelled", value: stats.cancelled, color: "from-amber-500 to-orange-500", icon: XCircle },
            ].map((card) => (
              <div
                key={card.label}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-3`}>
                  <card.icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-sm text-gray-500 font-medium">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
            ))}
          </div>

          {/* Charts Grid */}
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* Monthly Trend */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-base font-semibold text-gray-900">Monthly Trend</h2>
              </div>
              <div className="flex items-end justify-between gap-1 px-2">
                {monthlyTrend.map((count, i) => (
                  <ChartBar key={i} value={count} max={maxMonthly} label={MONTHS[i]} />
                ))}
              </div>
            </div>

            {/* Status Distribution */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center">
                  <PieChart className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-base font-semibold text-gray-900">Status Distribution</h2>
              </div>
              <div className="space-y-4">
                {[
                  { label: "Active", value: stats.active, color: "bg-gradient-to-r from-emerald-500 to-emerald-400" },
                  { label: "Completed", value: stats.completed, color: "bg-gradient-to-r from-blue-500 to-blue-400" },
                  { label: "Cancelled", value: stats.cancelled, color: "bg-gradient-to-r from-amber-500 to-amber-400" },
                ].map((item) => (
                  <HorizontalBar
                    key={item.label}
                    label={item.label}
                    value={item.value}
                    max={stats.total || 1}
                    color={item.color}
                  />
                ))}
              </div>
            </div>

            {/* Top Destinations */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-base font-semibold text-gray-900">Top Destinations</h2>
              </div>
              <div className="space-y-3">
                {destinations.length > 0 ? destinations.map(([dest, count]) => (
                  <HorizontalBar key={dest} label={dest} value={count} max={maxDest} />
                )) : (
                  <p className="text-sm text-gray-400 text-center py-4">No data for this year</p>
                )}
              </div>
            </div>

            {/* Vehicle Usage */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center">
                  <Truck className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-base font-semibold text-gray-900">Vehicle Usage</h2>
              </div>
              <div className="space-y-3">
                {vehicles.length > 0 ? vehicles.map(([v, count]) => (
                  <HorizontalBar
                    key={v}
                    label={v}
                    value={count}
                    max={maxVehicle}
                    color="bg-gradient-to-r from-indigo-500 to-indigo-400"
                    icon={Truck}
                  />
                )) : (
                  <p className="text-sm text-gray-400 text-center py-4">No data for this year</p>
                )}
              </div>
            </div>
          </div>

          {/* Trips by Requestor */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-8">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">Trips by Requestor</h2>
            </div>
            <div className="space-y-3">
              {requestors.length > 0 ? requestors.map(([r, count]) => (
                <HorizontalBar
                  key={r}
                  label={r}
                  value={count}
                  max={maxReq}
                  color="bg-gradient-to-r from-sky-500 to-cyan-400"
                  icon={User}
                />
              )) : (
                <p className="text-sm text-gray-400 text-center py-4">No data for this year</p>
              )}
            </div>
          </div>

          {/* Search & Table */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <FileSpreadsheet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search trips..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <span className="text-sm text-gray-400 font-medium">{filtered.length} trips</span>
          </div>

          {/* Trips Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden print:shadow-none print:border-none">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left py-3.5 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Trip</th>
                    <th className="text-left py-3.5 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Requestor</th>
                    <th className="text-left py-3.5 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Destination</th>
                    <th className="text-left py-3.5 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Date</th>
                    <th className="text-left py-3.5 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Vehicle</th>
                    <th className="text-left py-3.5 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((trip) => (
                    <tr key={trip.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
                            <Route className="w-3.5 h-3.5 text-indigo-600" />
                          </div>
                          <span className="font-medium text-gray-900">{trip.name || "Untitled"}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">{trip.requestor || "—"}</td>
                      <td className="py-3.5 px-4 text-gray-600">{trip.destination || "—"}</td>
                      <td className="py-3.5 px-4 text-gray-600">
                        {trip.date ? new Date(trip.date).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium">
                          <Truck className="w-3 h-3" />
                          {trip.van || "—"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[trip.status] || STATUS_COLORS.active}`}>
                          {STATUS_LABELS[trip.status] || trip.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400 text-sm">
                        No trips found for {year}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-none { border: none !important; }
        }
      `}</style>
    </div>
  )
}
