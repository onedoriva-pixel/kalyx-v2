"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import {
  PlaneTakeoff, Plus, CheckCircle2, XCircle, BarChart3,
  Calendar, Pencil, Eye, Trash2, Search, X, Save, User,
  Car, MapPin, Clock, FileText, Filter, Download, TrendingUp, FileSpreadsheet,
} from "lucide-react";
import { downloadTripsXLS } from "@/lib/exportXLS";

// ============================================================
// UTILS
// ============================================================
const STATUS_COLORS = {
  active: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  completed: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
};

const PURPOSES = ["Business Meeting", "Conference", "Client Visit", "Internal Training", "Team Offsite", "Other"];

const EMPTY_TRIP = {
  name: "", requestor: "", destination: "", assignedVan: "",
  assignedDriver: "", date: "", time: "", purpose: "Business Meeting",
  notes: "", status: "active",
};

function formatDate(d) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }); }
  catch { return d; }
}

// ============================================================
// TRIP FORM MODAL
// ============================================================
function TripModal({ trip, onSave, onClose }) {
  const [form, setForm] = useState(trip || EMPTY_TRIP);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!form.name || !form.destination || !form.date) {
      alert("Please fill in Trip Name, Destination, and Date.");
      return;
    }
    setSaving(true);
    await onSave({ ...form, id: form.id || Date.now(), createdAt: form.createdAt || Date.now() });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-outline-variant">
          <h3 className="text-xl font-bold text-primary">{form.id ? "Edit Trip" : "Plan New Trip"}</h3>
          <button onClick={onClose} className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Trip Name */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Trip Name *</label>
            <input value={form.name} onChange={e => set("name", e.target.value)}
              className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
              placeholder="e.g. Manila Business Summit" />
          </div>
          {/* Requestor */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Requestor</label>
            <input value={form.requestor} onChange={e => set("requestor", e.target.value)}
              className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
              placeholder="Requester name" />
          </div>
          {/* Destination */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Destination *</label>
            <input value={form.destination} onChange={e => set("destination", e.target.value)}
              className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
              placeholder="City / Location" />
          </div>
          {/* Vehicle */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Vehicle</label>
            <input value={form.assignedVan} onChange={e => set("assignedVan", e.target.value)}
              className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
              placeholder="Plate / model" />
          </div>
          {/* Driver */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Assigned Driver</label>
            <input value={form.assignedDriver} onChange={e => set("assignedDriver", e.target.value)}
              className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
              placeholder="Driver name" />
          </div>
          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Date *</label>
            <input type="date" value={form.date} onChange={e => set("date", e.target.value)}
              className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors" />
          </div>
          {/* Time */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Departure Time</label>
            <input type="time" value={form.time} onChange={e => set("time", e.target.value)}
              className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors" />
          </div>
          {/* Purpose */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Travel Purpose</label>
            <select value={form.purpose} onChange={e => set("purpose", e.target.value)}
              className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors">
              {PURPOSES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Status</label>
            <select value={form.status} onChange={e => set("status", e.target.value)}
              className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors">
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          {/* Notes */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Additional Notes</label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3}
              className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors resize-none"
              placeholder="Special requirements, notes..." />
          </div>
        </div>

        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} className="flex-1 border border-outline-variant text-on-surface-variant py-2.5 rounded-xl font-semibold hover:bg-surface-container transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-600 text-white py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Trip"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DASHBOARD VIEW
// ============================================================
function DashboardView({ trips, onNewTrip }) {
  const upcomingTrips = trips
    .filter(t => t.status === "active" || t.status === "pending")
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

  const today = new Date();
  const thisMonth = trips.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  });

  return (
    <div className="p-4 md:p-8 max-w-screen-2xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-primary">Dashboard</h2>
          <p className="text-on-surface-variant mt-1">Overview of your trips and travel activity</p>
        </div>
        <button onClick={onNewTrip}
          className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity shadow-sm">
          <Plus className="w-4 h-4" /> New Trip
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Trips", value: trips.length, color: "from-teal-500 to-teal-700", icon: <PlaneTakeoff className="w-5 h-5" /> },
          { label: "Active", value: trips.filter(t => t.status === "active").length, color: "from-emerald-500 to-emerald-700", icon: <PlaneTakeoff className="w-5 h-5" /> },
          { label: "Completed", value: trips.filter(t => t.status === "completed").length, color: "from-indigo-500 to-indigo-700", icon: <CheckCircle2 className="w-5 h-5" /> },
          { label: "This Month", value: thisMonth.length, color: "from-amber-500 to-orange-600", icon: <Calendar className="w-5 h-5" /> },
        ].map(s => (
          <div key={s.label} className={`bg-gradient-to-br ${s.color} text-white rounded-2xl p-5 shadow-lg relative overflow-hidden`}>
            <div className="relative z-10">
              <div className="text-white/70 mb-2">{s.icon}</div>
              <p className="text-3xl font-bold">{s.value}</p>
              <p className="text-xs text-white/70 font-semibold mt-1">{s.label}</p>
            </div>
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
          </div>
        ))}
      </div>

      {/* Upcoming Trips */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-primary mb-5 flex items-center gap-2">
          <span className="w-1.5 h-5 rounded-full bg-teal-500 inline-block" />
          Upcoming Trips
        </h3>
        {upcomingTrips.length === 0 ? (
          <div className="text-center py-10">
            <PlaneTakeoff className="w-14 h-14 text-on-surface-variant/20 mx-auto mb-3" />
            <p className="text-on-surface-variant font-medium">No upcoming trips</p>
            <button onClick={onNewTrip} className="mt-4 text-teal-600 font-semibold hover:underline text-sm">Plan your first trip →</button>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingTrips.map(trip => (
              <div key={trip.id} className="flex items-center gap-4 p-4 rounded-xl border border-outline-variant hover:border-teal-500/30 hover:bg-surface-container transition-all">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                  <PlaneTakeoff className="w-5 h-5 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-primary truncate">{trip.name}</p>
                  <p className="text-xs text-on-surface-variant">{trip.destination} · {formatDate(trip.date)}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${STATUS_COLORS[trip.status] || STATUS_COLORS.active}`}>
                  {trip.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// TRIPS VIEW (Full CRUD table)
// ============================================================
function TripsView({ trips, onAdd, onEdit, onDelete, onView }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = trips.filter(t => {
    const matchSearch = !search ||
      (t.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.destination || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || t.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-4 md:p-8 max-w-screen-2xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-primary">Trips</h2>
          <p className="text-on-surface-variant mt-1">{trips.length} trips total</p>
        </div>
        <button onClick={onAdd}
          className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity shadow-sm">
          <Plus className="w-4 h-4" /> New Trip
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-surface-container border border-outline-variant rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
            placeholder="Search trips..." />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container/50">
                <th className="text-left text-xs font-semibold text-on-surface-variant px-5 py-3.5">Trip Name</th>
                <th className="text-left text-xs font-semibold text-on-surface-variant px-5 py-3.5">Destination</th>
                <th className="text-left text-xs font-semibold text-on-surface-variant px-5 py-3.5">Date</th>
                <th className="text-left text-xs font-semibold text-on-surface-variant px-5 py-3.5">Driver</th>
                <th className="text-left text-xs font-semibold text-on-surface-variant px-5 py-3.5">Vehicle</th>
                <th className="text-left text-xs font-semibold text-on-surface-variant px-5 py-3.5">Status</th>
                <th className="text-right text-xs font-semibold text-on-surface-variant px-5 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-14 text-on-surface-variant">
                    <PlaneTakeoff className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">No trips found</p>
                  </td>
                </tr>
              ) : (
                filtered.map(trip => (
                  <tr key={trip.id} className="border-b border-outline-variant/50 hover:bg-surface-container/40 transition-colors last:border-0">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-primary text-sm">{trip.name || "—"}</p>
                      <p className="text-xs text-on-surface-variant">{trip.purpose || ""}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-on-surface">{trip.destination || "—"}</td>
                    <td className="px-5 py-4 text-sm text-on-surface">{formatDate(trip.date)}</td>
                    <td className="px-5 py-4 text-sm text-on-surface">{trip.assignedDriver || "—"}</td>
                    <td className="px-5 py-4 text-sm text-on-surface">{trip.assignedVan || "—"}</td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg capitalize ${STATUS_COLORS[trip.status] || STATUS_COLORS.active}`}>
                        {trip.status || "active"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {onView && <button onClick={() => onView(trip)} className="p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>}
                        <button onClick={() => onEdit(trip)} className="p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => onDelete(trip.id)} className="p-2 rounded-lg text-on-surface-variant hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// VIEW DETAILS MODAL
// ============================================================
function ViewDetailsModal({ record, title, onClose }) {
  if (!record) return null;
  const ignoreKeys = ["id", "createdAt"];

  const renderValue = (key, val) => {
    if (val === null || val === undefined || val === "") return <span className="text-on-surface-variant/50 italic">—</span>;
    if (typeof val === "boolean") return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${val ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{val ? "Yes" : "No"}</span>;
    if (typeof val === "object") return <pre className="text-xs text-on-surface-variant bg-surface-container rounded-lg p-2 max-h-24 overflow-y-auto">{JSON.stringify(val, null, 2)}</pre>;
    if (key.toLowerCase().includes("date") || key.toLowerCase().includes("time")) {
      if (val.toString().includes("T")) return val;
      const d = new Date(val);
      return isNaN(d.getTime()) ? val : d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
    }
    return val;
  };

  const labelFromKey = (key) => key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()).replace(/_/g, " ").trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-outline-variant sticky top-0 bg-surface-container-lowest z-10">
          <h3 className="text-lg font-bold text-primary">{title || "Details"}</h3>
          <button onClick={onClose} className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-3">
          {Object.entries(record)
            .filter(([k]) => !ignoreKeys.includes(k))
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, val]) => (
              <div key={key} className="flex flex-col gap-0.5">
                <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">{labelFromKey(key)}</span>
                <span className="text-sm text-on-surface">{renderValue(key, val)}</span>
              </div>
            ))}
        </div>
        <div className="flex p-6 pt-0">
          <button onClick={onClose} className="w-full border border-outline-variant text-on-surface-variant py-2.5 rounded-xl font-semibold hover:bg-surface-container transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// REPORTS VIEW
// ============================================================
function ReportsView({ trips }) {
  const statusCounts = {
    active: trips.filter(t => t.status === "active").length,
    completed: trips.filter(t => t.status === "completed").length,
    cancelled: trips.filter(t => t.status === "cancelled").length,
    pending: trips.filter(t => t.status === "pending").length,
  };

  // Count by destination
  const destMap = {};
  trips.forEach(t => {
    if (t.destination) destMap[t.destination] = (destMap[t.destination] || 0) + 1;
  });
  const topDests = Object.entries(destMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Count by month
  const monthMap = {};
  trips.forEach(t => {
    if (!t.date) return;
    const d = new Date(t.date);
    const key = d.toLocaleDateString("en-PH", { month: "short", year: "numeric" });
    monthMap[key] = (monthMap[key] || 0) + 1;
  });
  const monthData = Object.entries(monthMap).sort((a, b) => new Date(a[0]) - new Date(b[0])).slice(-6);

  const maxCount = Math.max(...monthData.map(m => m[1]), 1);

  // Count by purpose
  const purposeMap = {};
  trips.forEach(t => {
    const p = t.purpose || "Other";
    purposeMap[p] = (purposeMap[p] || 0) + 1;
  });

  const exportCSV = () => {
    const header = ["Trip Name", "Destination", "Date", "Driver", "Vehicle", "Purpose", "Status"];
    const rows = trips.map(t => [t.name, t.destination, t.date, t.assignedDriver, t.assignedVan, t.purpose, t.status]);
    const csv = [header, ...rows].map(r => r.map(c => `"${c || ""}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `trips-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="p-4 md:p-8 max-w-screen-2xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-primary">Reports</h2>
          <p className="text-on-surface-variant mt-1">Analytics and summary of all trips</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => downloadTripsXLS(trips)}
            className="flex items-center gap-2 bg-surface-container border border-outline-variant text-on-surface px-5 py-2.5 rounded-xl font-semibold hover:bg-surface-container-high transition-colors shadow-sm">
            <FileSpreadsheet className="w-4 h-4" /> Export XLS
          </button>
          <button onClick={exportCSV}
            className="flex items-center gap-2 bg-surface-container border border-outline-variant text-on-surface px-5 py-2.5 rounded-xl font-semibold hover:bg-surface-container-high transition-colors shadow-sm">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Trips", value: trips.length, color: "from-teal-500 to-teal-700" },
          { label: "Active", value: statusCounts.active, color: "from-emerald-500 to-emerald-700" },
          { label: "Completed", value: statusCounts.completed, color: "from-indigo-500 to-indigo-700" },
          { label: "Cancelled", value: statusCounts.cancelled, color: "from-red-500 to-red-700" },
        ].map(s => (
          <div key={s.label} className={`bg-gradient-to-br ${s.color} text-white rounded-2xl p-5 shadow-lg relative overflow-hidden`}>
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-xs text-white/70 font-semibold mt-1">{s.label}</p>
            <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Monthly Chart */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-primary mb-5 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-500" /> Trips by Month
          </h3>
          {monthData.length === 0 ? (
            <p className="text-on-surface-variant text-center py-8">No data available</p>
          ) : (
            <div className="flex items-end gap-3 h-40">
              {monthData.map(([month, count]) => (
                <div key={month} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs font-bold text-teal-600">{count}</span>
                  <div className="w-full rounded-t-lg bg-gradient-to-t from-teal-500 to-teal-400 transition-all duration-500"
                    style={{ height: `${(count / maxCount) * 120}px` }} />
                  <span className="text-[10px] text-on-surface-variant font-semibold text-center leading-tight">{month}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Destinations */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-primary mb-5 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-500" /> Top Destinations
          </h3>
          {topDests.length === 0 ? (
            <p className="text-on-surface-variant text-center py-8">No data available</p>
          ) : (
            <div className="space-y-3">
              {topDests.map(([dest, count], i) => {
                const pct = Math.round((count / trips.length) * 100);
                return (
                  <div key={dest}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-semibold text-on-surface">{dest}</span>
                      <span className="text-on-surface-variant font-medium">{count} trips</span>
                    </div>
                    <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Purpose Breakdown */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-primary mb-5">Purpose Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {Object.entries(purposeMap).map(([p, count]) => (
            <div key={p} className="bg-surface-container rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-primary">{count}</p>
              <p className="text-xs text-on-surface-variant mt-1 font-semibold">{p}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SETTINGS VIEW
// ============================================================
function SettingsView({ user }) {
  const [profile, setProfile] = useState({ name: "", email: "", username: "" });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      let snap = await getDoc(doc(db, "profiles", user.uid));
      if (!snap.exists()) {
        const q = query(collection(db, "profiles"), where("email", "==", user.email));
        const r = await getDocs(q);
        if (!r.empty) snap = r.docs[0];
      }
      if (snap.exists()) setProfile({ name: snap.data().name || "", email: user.email || "", username: snap.data().username || "" });
    })();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    await setDoc(doc(db, "profiles", user.uid), { name: profile.name, username: profile.username }, { merge: true });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto animate-fade-in">
      <h2 className="text-3xl font-bold text-primary mb-2">Settings</h2>
      <p className="text-on-surface-variant mb-8">Manage your profile and preferences</p>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm p-6 mb-6">
        <h3 className="text-base font-bold text-primary mb-5 flex items-center gap-2">
          <User className="w-4 h-4" /> Profile Information
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Full Name</label>
            <input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
              className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Username</label>
            <input value={profile.username} onChange={e => setProfile(p => ({ ...p, username: e.target.value }))}
              className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Email</label>
            <input value={profile.email} disabled
              className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm opacity-60 cursor-not-allowed" />
          </div>
          <button onClick={handleSave}
            className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
            <Save className="w-4 h-4" />
            {saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
function ExecutivePathDashboardInner() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") || "dashboard";

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | "new" | trip object
  const [viewRecord, setViewRecord] = useState(null);
  const router = useRouter();

  // ---- Load trips from userdata/{uid}.data.trips ----
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsubscribe = onSnapshot(doc(db, "userdata", user.uid), (snap) => {
      if (snap.exists()) {
        setTrips(snap.data()?.data?.trips || []);
      }
      setLoading(false);
    }, () => setLoading(false));

    return () => unsubscribe();
  }, []);

  // ---- Save trips to Firestore ----
  const saveTrips = useCallback(async (updatedTrips) => {
    if (!auth.currentUser) return;
    const snap = await getDoc(doc(db, "userdata", auth.currentUser.uid));
    const existingData = snap.exists() ? (snap.data().data || {}) : {};
    await setDoc(doc(db, "userdata", auth.currentUser.uid), {
      data: { ...existingData, trips: updatedTrips },
      updated_at: new Date().toISOString(),
    });
  }, []);

  const handleSaveTrip = async (tripData) => {
    let updated;
    if (trips.find(t => t.id === tripData.id)) {
      updated = trips.map(t => t.id === tripData.id ? tripData : t);
    } else {
      updated = [...trips, tripData];
    }
    await saveTrips(updated);
    setModal(null);
  };

  const handleDeleteTrip = async (id) => {
    if (!confirm("Delete this trip?")) return;
    await saveTrips(trips.filter(t => t.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      {modal !== null && (
        <TripModal
          trip={modal === "new" ? null : modal}
          onSave={handleSaveTrip}
          onClose={() => setModal(null)}
        />
      )}

      {view === "dashboard" && (
        <DashboardView trips={trips} onNewTrip={() => { setModal("new"); router.push("?view=trips"); }} />
      )}
      <ViewDetailsModal record={viewRecord} title="Trip Details" onClose={() => setViewRecord(null)} />
      {view === "trips" && (
        <TripsView
          trips={trips}
          onAdd={() => setModal("new")}
          onEdit={(trip) => setModal(trip)}
          onView={(trip) => setViewRecord(trip)}
          onDelete={handleDeleteTrip}
        />
      )}
      {view === "reports" && <ReportsView trips={trips} />}
      {view === "settings" && <SettingsView user={auth.currentUser} />}
    </>
  );
}

export default function ExecutivePathDashboard() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" /></div>}>
      <ExecutivePathDashboardInner />
    </Suspense>
  );
}
