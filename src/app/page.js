import Link from "next/link"
import {
  ArrowRight, Shield, LifeBuoy, LogIn, Activity, Route,
  MonitorSmartphone, Wrench, BarChart3, CheckCircle, Users,
  FileSpreadsheet, BookOpen, ExternalLink
} from "lucide-react"

const FEATURES = [
  {
    icon: Route,
    gradient: "from-amber-500 to-orange-600",
    title: "Executive Path",
    desc: "Plan, track, and manage trips with real-time status updates, driver assignment, and comprehensive annual reporting.",
    details: ["Trip creation & scheduling", "Driver & vehicle assignment", "Status tracking", "Annual reports with charts"],
    href: "/executive-path",
  },
  {
    icon: MonitorSmartphone,
    gradient: "from-teal-500 to-emerald-600",
    title: "Executive Task",
    desc: "Kanban task board, milestone-based planner, daily accomplishment log, and scratchpad notes — all synced in real time.",
    details: ["Drag-and-drop task board", "Milestone planner & roadmap", "Daily accomplishment logging", "Scratchpad notes"],
    href: "/executive-task",
  },
  {
    icon: Wrench,
    gradient: "from-purple-500 to-violet-600",
    title: "Executive IT",
    desc: "Asset inventory, maintenance inspections, service requests, knowledge base, time tracking, and audit logging.",
    details: ["IT asset & inventory tracking", "Maintenance inspection forms", "Service desk ticket management", "Knowledge base & time tracking"],
    href: "/executive-it",
  },
  {
    icon: Shield,
    gradient: "from-indigo-500 to-blue-600",
    title: "Admin Center",
    desc: "User management, global search across all users, data import/export, and full system oversight.",
    details: ["User role & permission management", "Cross-user global search", "Bulk data import & export", "System-wide monitoring"],
    href: "/admin",
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950">
      {/* Navigation */}
      <nav className="border-b border-white/10 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white">KALYX</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/guide"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm text-gray-300 hover:text-white transition-colors">
              <BookOpen className="w-4 h-4" />
              Guide
            </Link>
            <Link href="/service-desk"
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-300 hover:text-white transition-colors">
              <LifeBuoy className="w-4 h-4" />
              Support
            </Link>
            <Link href="/login"
              className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold rounded-xl transition-colors">
              <LogIn className="w-4 h-4" />
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-28">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full text-xs font-medium text-indigo-300 mb-6 border border-white/10">
            <Activity className="w-3.5 h-3.5" />
            v2.0 — Enterprise Command Center
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
            Integrated Operations
            <span className="block bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              for Modern Enterprises
            </span>
          </h1>
          <p className="mt-6 text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            KALYX unifies task management, trip planning, IT asset tracking, and service delivery
            into a single, powerful platform. Real-time sync across all modules.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <Link href="/login"
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-xl shadow-indigo-500/25">
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/guide"
              className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white text-sm font-semibold rounded-xl hover:bg-white/15 transition-all">
              <BookOpen className="w-4 h-4" />
              User Guide
            </Link>
            <Link href="/service-desk"
              className="flex items-center gap-2 px-6 py-3 bg-white/5 text-gray-300 text-sm font-semibold rounded-xl hover:bg-white/10 transition-all border border-white/10">
              <LifeBuoy className="w-4 h-4" />
              IT Support
            </Link>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {[
            { icon: Route, label: "Trip Management", color: "text-amber-400" },
            { icon: CheckCircle, label: "Task Tracking", color: "text-emerald-400" },
            { icon: Wrench, label: "IT Asset Mgmt", color: "text-purple-400" },
            { icon: Users, label: "Admin Oversight", color: "text-indigo-400" },
          ].map((s) => (
            <div key={s.label} className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
              <s.icon className={`w-6 h-6 ${s.color} mx-auto mb-2`} />
              <p className="text-xs font-semibold text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-28">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-white">Four Integrated Portals</h2>
          <p className="text-gray-400 mt-3 max-w-xl mx-auto">
            Each module is purpose-built for a specific domain, yet fully connected through a shared data layer.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shrink-0`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white mb-1">{feature.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed mb-3">{feature.desc}</p>
                  <ul className="space-y-1.5">
                    {feature.details.map((d) => (
                      <li key={d} className="flex items-center gap-2 text-xs text-gray-500">
                        <div className="w-1 h-1 rounded-full bg-indigo-500 shrink-0" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Export Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-28">
        <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-white/10 rounded-2xl p-8 md:p-12 text-center">
          <FileSpreadsheet className="w-10 h-10 text-indigo-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-3">Export & Reporting</h2>
          <p className="text-gray-400 max-w-lg mx-auto mb-6">
            Every list view includes an Export XLS button. Generate Excel files for tasks, trips, maintenance records, services, and more.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
            <span>Tasks</span>
            <span className="text-indigo-400">•</span>
            <span>Trips</span>
            <span className="text-indigo-400">•</span>
            <span>Services</span>
            <span className="text-indigo-400">•</span>
            <span>Maintenance</span>
            <span className="text-indigo-400">•</span>
            <span>Accomplishments</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid sm:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Activity className="w-3 h-3 text-white" />
                </div>
                <span className="font-bold text-white">KALYX</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Enterprise Command Center v2.0
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Links</p>
              <div className="space-y-2">
                <Link href="/guide" className="block text-xs text-gray-500 hover:text-indigo-400 transition-colors">User Guide</Link>
                <Link href="/service-desk" className="block text-xs text-gray-500 hover:text-indigo-400 transition-colors">Service Desk</Link>
                <Link href="/login" className="block text-xs text-gray-500 hover:text-indigo-400 transition-colors">Sign In</Link>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Portals</p>
              <div className="space-y-2">
                <Link href="/executive-path" className="block text-xs text-gray-500 hover:text-indigo-400 transition-colors">Executive Path</Link>
                <Link href="/executive-task" className="block text-xs text-gray-500 hover:text-indigo-400 transition-colors">Executive Task</Link>
                <Link href="/executive-it" className="block text-xs text-gray-500 hover:text-indigo-400 transition-colors">Executive IT</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-600">&copy; {new Date().getFullYear()} KALYX. All rights reserved.</p>
            <Link href="/login"
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
              Sign In <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
