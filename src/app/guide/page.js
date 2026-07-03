"use client"

import { useEffect, useState } from "react"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { useRouter } from "next/navigation"
import {
  BookOpen, LogIn, LayoutDashboard, Route, ListTodo, Pencil,
  BarChart3, Settings, Shield, Moon, Star, ChevronRight,
  MonitorSmartphone, Wrench, ClipboardList, FileSpreadsheet,
  PlusCircle, Columns, Map, FileEdit, StickyNote, Truck,
  Package, Ticket, Clock, Book, LifeBuoy, Search
} from "lucide-react"

const SECTIONS = [
  {
    id: "login",
    icon: LogIn,
    gradient: "from-indigo-500 to-purple-600",
    title: "Login & Registration",
    summary: "Access the platform",
    content: (
      <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
        <p>Visit the application URL and click <strong>Sign In</strong> in the top navigation bar. Use your registered email and password to log in.</p>
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-indigo-700 text-xs space-y-1">
          <p className="font-semibold">First time here?</p>
          <p>New users are registered by an administrator. Contact your admin to get an account created.</p>
        </div>
        <ul className="list-disc pl-5 space-y-1">
          <li>Use the <strong>Settings</strong> page to update your password after logging in</li>
          <li>Your session persists until you sign out</li>
        </ul>
      </div>
    ),
  },
  {
    id: "dashboard",
    icon: LayoutDashboard,
    gradient: "from-teal-500 to-emerald-600",
    title: "Dashboard Overview",
    summary: "Your command center",
    content: (
      <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
        <p>The Dashboard opens automatically after login. It provides a summary card view across all modules:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Task Summary</strong> — Pending, in-progress, and completed task counts</li>
          <li><strong>Active Trips</strong> — Ongoing trips with driver and destination</li>
          <li><strong>IT Summary</strong> — Asset counts, open tickets, recent services</li>
        </ul>
        <p>Click any portal from the top navigation bar to dive deeper.</p>
      </div>
    ),
  },
  {
    id: "exec-task-board",
    icon: Columns,
    gradient: "from-emerald-500 to-teal-600",
    title: "Executive Task — Tasks Board",
    summary: "Kanban task management",
    content: (
      <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
        <p>Navigate to <strong>Executive Task &gt; Tasks</strong> to access the Kanban-style task board with three columns:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Pending</strong> — Tasks not yet started</li>
          <li><strong>In Progress</strong> — Active tasks</li>
          <li><strong>Completed</strong> — Finished tasks</li>
        </ul>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-amber-700 text-xs">
          <p><strong>Tip:</strong> Drag and drop tasks between columns to update their status instantly.</p>
        </div>
        <p>Click the <strong>+ New Task</strong> button to create a task with title, description, priority, category, and due date. Use the search bar to filter tasks.</p>
      </div>
    ),
  },
  {
    id: "exec-task-planner",
    icon: Map,
    gradient: "from-amber-500 to-orange-600",
    title: "Executive Task — Planner & Roadmap",
    summary: "Strategic planning",
    content: (
      <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
        <p>The <strong>Planner</strong> view lets you create strategic plans with milestones:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Create a new plan with a title, description, and status</li>
          <li>Add milestones to each plan with due dates and descriptions</li>
          <li>Track progress — <em>Active</em>, <em>In Progress</em>, <em>Completed</em>, <em>On Hold</em></li>
        </ul>
        <p>Select a plan from the list to view its milestones. Use the milestone modal to add, edit, or delete individual milestones.</p>
      </div>
    ),
  },
  {
    id: "exec-task-dailylog",
    icon: FileEdit,
    gradient: "from-pink-500 to-rose-600",
    title: "Executive Task — Daily Log",
    summary: "Log accomplishments",
    content: (
      <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
        <p>The <strong>Daily Log</strong> is an accomplishment tracker — log what you worked on at the end of each shift:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Click <strong>New Entry</strong> to add a log with title, date, and details</li>
          <li>Entries are grouped by date for easy review</li>
          <li>Use the date filter to view logs from a specific day</li>
          <li>Click <strong>Export CSV</strong> to download logs as a spreadsheet</li>
        </ul>
      </div>
    ),
  },
  {
    id: "exec-task-notes",
    icon: StickyNote,
    gradient: "from-yellow-500 to-amber-600",
    title: "Executive Task — Notes",
    summary: "Scratchpad notepad",
    content: (
      <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
        <p>The <strong>Notes</strong> view is a free-form scratchpad that auto-saves to Firestore.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Type anything — task ideas, reminders, quick notes</li>
          <li>Changes are saved automatically after you stop typing</li>
          <li>Use <strong>Clear Notes</strong> to wipe the scratchpad</li>
        </ul>
      </div>
    ),
  },
  {
    id: "exec-path-trips",
    icon: Truck,
    gradient: "from-teal-500 to-emerald-600",
    title: "Executive Path — Trips",
    summary: "Trip management",
    content: (
      <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
        <p>The <strong>Trips</strong> view in Executive Path manages all vehicle trips:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Click <strong>New Trip</strong> to open the trip form</li>
          <li>Fill in: trip name, date/time, destination, vehicle, driver, purpose, requestor</li>
          <li>Status options: <em>Pending</em>, <em>Active</em>, <em>Completed</em>, <em>Cancelled</em></li>
          <li>Use the search bar and status filter to find trips</li>
          <li>Click the <strong>Eye</strong> icon to view details, <strong>Pencil</strong> to edit, <strong>Trash</strong> to delete</li>
        </ul>
      </div>
    ),
  },
  {
    id: "exec-path-reports",
    icon: BarChart3,
    gradient: "from-blue-500 to-sky-600",
    title: "Executive Path — Reports",
    summary: "Annual charts & summaries",
    content: (
      <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
        <p>The <strong>Reports</strong> page provides annual trip analytics:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Monthly trip bar chart by status</li>
          <li>Summary cards — total trips, completed, cancelled, pending</li>
          <li>Searchable table of all trips for the selected year</li>
          <li>Year filter to switch between years</li>
          <li>Print-friendly layout — use <strong>Ctrl+P</strong> or the Print button</li>
        </ul>
      </div>
    ),
  },
  {
    id: "exec-it-services",
    icon: Wrench,
    gradient: "from-purple-500 to-violet-600",
    title: "Executive IT — Services",
    summary: "IT service records",
    content: (
      <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
        <p><strong>Services</strong> tracks IT service engagements:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Record service type, description, provider, and cost</li>
          <li>Track service dates and status</li>
          <li>Each record can be viewed, edited, or deleted</li>
          <li>Export to XLS using the button in the top bar</li>
        </ul>
      </div>
    ),
  },
  {
    id: "exec-it-maintenance",
    icon: ClipboardList,
    gradient: "from-indigo-500 to-blue-600",
    title: "Executive IT — Maintenance (ITDF-01)",
    summary: "Inspection forms",
    content: (
      <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
        <p>The <strong>Maintenance</strong> module uses the ITDF-01 inspection form:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Select equipment type — <em>Server</em>, <em>Workstation</em>, <em>Printer/Photocopier</em>, <em>Network</em>, <em>UPS</em>, <em>CCTV</em>, <em>Other</em></li>
          <li>Fill in inspector, checked by, inspection date, reference, frequency, period</li>
          <li>Enter brand, model, serial number, and location</li>
          <li>Complete the inspection checklist (yes/no items)</li>
          <li>For <strong>Printer/Photocopier</strong>, additional toner color fields appear</li>
        </ul>
      </div>
    ),
  },
  {
    id: "exec-it-inventory",
    icon: Package,
    gradient: "from-cyan-500 to-teal-600",
    title: "Executive IT — Inventory",
    summary: "Asset tracking",
    content: (
      <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
        <p><strong>Inventory</strong> tracks IT equipment and supplies:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Item name, category, quantity, unit, location</li>
          <li>Monitor stock levels and reorder status</li>
          <li>Quick search to find specific items</li>
          <li>Export inventory data to XLS</li>
        </ul>
      </div>
    ),
  },
  {
    id: "exec-it-tickets",
    icon: Ticket,
    gradient: "from-red-500 to-rose-600",
    title: "Executive IT — Tickets",
    summary: "Support tickets",
    content: (
      <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
        <p><strong>Tickets</strong> manages internal IT support requests:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Create tickets with subject, description, priority, and assignee</li>
          <li>Track status — <em>Open</em>, <em>In Progress</em>, <em>Resolved</em>, <em>Closed</em></li>
          <li>Search and filter by status or priority</li>
          <li>View ticket details with a single click</li>
        </ul>
      </div>
    ),
  },
  {
    id: "exec-it-accomplishments",
    icon: FileEdit,
    gradient: "from-pink-500 to-fuchsia-600",
    title: "Executive IT — Accomplishments",
    summary: "Daily IT accomplishments",
    content: (
      <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
        <p><strong>Accomplishments</strong> logs daily IT work with category-dependent fields:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Category: <em>Technical Support</em>, <em>Installation</em>, <em>Repair</em>, <em>Preventive Maintenance</em>, <em>Other</em></li>
          <li>When <strong>Technical Support</strong> is selected, additional fields appear: severity, department, resolution</li>
          <li>Includes date, technician, description, and remarks</li>
        </ul>
      </div>
    ),
  },
  {
    id: "exec-it-timetrack",
    icon: Clock,
    gradient: "from-orange-500 to-amber-600",
    title: "Executive IT — Time Tracking",
    summary: "Log work hours",
    content: (
      <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
        <p><strong>Time Tracking</strong> logs hours worked against specific tasks:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Select a task from the task list</li>
          <li>Log start/end time, date, and description</li>
          <li>View total hours per task or per day</li>
        </ul>
      </div>
    ),
  },
  {
    id: "exec-it-knowledge",
    icon: Book,
    gradient: "from-green-500 to-emerald-600",
    title: "Executive IT — Knowledge Base",
    summary: "Documentation & guides",
    content: (
      <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
        <p><strong>Knowledge Base</strong> stores IT documentation and reference articles:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Articles with title, category, and rich content</li>
          <li>Search to find relevant articles quickly</li>
          <li>Create, edit, and delete articles as needed</li>
        </ul>
      </div>
    ),
  },
  {
    id: "exec-it-audit",
    icon: Search,
    gradient: "from-slate-600 to-gray-700",
    title: "Executive IT — Audit Log",
    summary: "Activity audit trail",
    content: (
      <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
        <p><strong>Audit Log</strong> provides a chronological trail of all IT activities:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Every create, update, and delete action is logged</li>
          <li>Filter by action type — <em>All</em>, <em>Created</em>, <em>Updated</em>, <em>Deleted</em></li>
          <li>Each entry shows the action, target, user, and timestamp</li>
        </ul>
      </div>
    ),
  },
  {
    id: "admin",
    icon: Shield,
    gradient: "from-indigo-500 to-purple-600",
    title: "Admin Center",
    summary: "System administration",
    content: (
      <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
        <p>Administrators have access to the <strong>Admin Center</strong> for system-wide management:</p>
        <div className="space-y-4">
          <div>
            <p className="font-semibold text-gray-700 mb-1">Dashboard</p>
            <p className="text-xs">Platform-wide statistics — total users, records, storage usage.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-1">Users</p>
            <p className="text-xs">View all registered users, edit roles/permissions, expand each user to see their data counts.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-1">Tasks / Plans / Daily Logs</p>
            <p className="text-xs">Aggregated views of data across all users with global search.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-1">Data Management</p>
            <p className="text-xs">Import users via CSV, view and clear user data, export to XLS.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-1">Global Search</p>
            <p className="text-xs">Search across all user records — tasks, trips, plans, IT data, daily logs.</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "service-desk",
    icon: LifeBuoy,
    gradient: "from-blue-500 to-indigo-600",
    title: "Service Desk",
    summary: "Public support portal",
    content: (
      <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
        <p>The <strong>Service Desk</strong> at <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">/service-desk</code> is a public portal — no login required:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Submit a support ticket by filling in: name, email, subject, category, and description</li>
          <li>Each ticket receives a unique reference number: <strong>SD-XXXXXX</strong></li>
          <li>Tickets are saved to the <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">tickets</code> Firestore collection</li>
          <li>Use the reference number for follow-ups</li>
        </ul>
      </div>
    ),
  },
  {
    id: "settings",
    icon: Settings,
    gradient: "from-gray-600 to-slate-700",
    title: "Settings",
    summary: "Account & password",
    content: (
      <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
        <p>The <strong>Settings</strong> page lets you manage your account:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Account Info</strong> — View your username and email</li>
          <li><strong>Change Password</strong> — Requires current password for verification</li>
        </ul>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800 text-xs">
          <p>Passwords must be at least 6 characters long. After changing your password, you will be redirected to the login page.</p>
        </div>
      </div>
    ),
  },
  {
    id: "export",
    icon: FileSpreadsheet,
    gradient: "from-green-600 to-emerald-700",
    title: "Export to XLS",
    summary: "Spreadsheet downloads",
    content: (
      <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
        <p>Every list view across all portals includes an <strong>Export XLS</strong> button:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Executive Task — Export tasks as XLS</li>
          <li>Executive Path — Export trips as XLS</li>
          <li>Executive IT — Export services, maintenance records, accomplishments as XLS</li>
          <li>Admin — Export user data as XLS</li>
        </ul>
        <p>Clicking the button downloads a formatted Excel file (.xls) compatible with Microsoft Excel and Google Sheets.</p>
      </div>
    ),
  },
  {
    id: "theme",
    icon: Moon,
    gradient: "from-violet-500 to-purple-600",
    title: "Dark / Light Mode",
    summary: "Visual preference",
    content: (
      <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
        <p>Toggle between dark and light mode using the theme switcher in the top navigation bar.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Your preference is saved in <strong>localStorage</strong> for future sessions</li>
          <li>The site follows your system preference by default</li>
          <li>All components are themed consistently across portals</li>
        </ul>
      </div>
    ),
  },
  {
    id: "tips",
    icon: Star,
    gradient: "from-amber-500 to-yellow-600",
    title: "Quick Tips",
    summary: "Pro tips",
    content: (
      <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
        <ul className="space-y-3">
          {[
            "Use the search bar on any list view to quickly find records across all portals",
            "The Daily Log in Executive Task is designed for end-of-shift accomplishment reporting",
            "Maintenance inspections (ITDF-01) auto-fill the scheduled date from the inspection date",
            "Export XLS is available on every list — use it for offline records and reporting",
            "Admin Global Search lets you find any record across all users in the system",
            "Drag tasks between columns in the Task Board to change their status instantly",
            "Service Desk tickets get a unique SD-XXXXXX reference — quote it when following up",
            "Check the Dashboard first thing every day for a summary of pending work",
          ].map((tip) => (
            <li key={tip} className="flex items-start gap-2">
              <ChevronRight className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
]

export default function GuidePage() {
  const [activeSection, setActiveSection] = useState("login")
  const [authChecked, setAuthChecked] = useState(false)
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

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  const section = SECTIONS.find((s) => s.id === activeSection) || SECTIONS[0]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50/30">
      <main className="p-6 lg:p-10">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">KALYX User Guide</h1>
                <p className="text-gray-500 text-sm">Complete walkthrough of the Enterprise Command Center</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Navigation */}
            <nav className="w-full lg:w-60 shrink-0">
              <div className="lg:sticky lg:top-8 space-y-1 max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-2">
                {SECTIONS.map((s) => {
                  const isActive = s.id === activeSection
                  return (
                    <button
                      key={s.id}
                      onClick={() => setActiveSection(s.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all ${
                        isActive
                          ? "bg-white shadow-sm border border-gray-200 text-gray-900"
                          : "text-gray-500 hover:text-gray-700 hover:bg-white/80"
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${s.gradient} flex items-center justify-center shrink-0`}>
                        <s.icon className="w-3 h-3 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">{s.title}</p>
                        <p className="text-[10px] text-gray-400 truncate">{s.summary}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </nav>

            {/* Mobile Section Selector */}
            <div className="lg:hidden w-full">
              <select
                value={activeSection}
                onChange={(e) => setActiveSection(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
              >
                {SECTIONS.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${section.gradient} flex items-center justify-center shrink-0`}>
                    <section.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
                    <p className="text-sm text-gray-400">Section {SECTIONS.indexOf(section) + 1} of {SECTIONS.length}</p>
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-6">
                  {section.content}
                </div>

                {/* Navigation buttons */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
                  <button
                    onClick={() => {
                      const idx = SECTIONS.indexOf(section)
                      if (idx > 0) setActiveSection(SECTIONS[idx - 1].id)
                    }}
                    disabled={SECTIONS.indexOf(section) === 0}
                    className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Previous
                  </button>
                  <p className="text-xs text-gray-400">
                    {SECTIONS.indexOf(section) + 1} / {SECTIONS.length}
                  </p>
                  <button
                    onClick={() => {
                      const idx = SECTIONS.indexOf(section)
                      if (idx < SECTIONS.length - 1) setActiveSection(SECTIONS[idx + 1].id)
                    }}
                    disabled={SECTIONS.indexOf(section) === SECTIONS.length - 1}
                    className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
