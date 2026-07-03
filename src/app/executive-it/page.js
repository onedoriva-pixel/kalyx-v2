"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";

import {
  MonitorSmartphone, LifeBuoy, Wrench, CheckSquare, Map, Ticket,
  History, Package, CheckCircle, Activity, Clock, BookOpen,
  Plus, Pencil, Eye, Trash2, Search, X, Save, AlertTriangle,
  TrendingUp, Download, ChevronRight, Circle, CheckCircle2, FileSpreadsheet,
  Play, Square,
} from "lucide-react";
import { downloadITServicesXLS, downloadITMaintenanceXLS, downloadITAccomplishmentsXLS } from "@/lib/exportXLS";

// ============================================================
// STATUS STYLES
// ============================================================
const STATUS_BADGE = {
  resolved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  open: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "in-progress": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-900",
  closed: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  pending: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  active: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  done: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  scheduled: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};

const SEVERITY_BADGE = {
  High: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  Medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  Low: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

function fmtDate(d) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }); }
  catch { return d; }
}

// ============================================================
// GENERIC CRUD MODAL
// ============================================================
function RecordModal({ title, fields, record, onSave, onClose }) {
  const [form, setForm] = useState(record || {});
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    await onSave({ ...form, id: form.id || Date.now(), createdAt: form.createdAt || Date.now() });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-outline-variant">
          <h3 className="text-lg font-bold text-primary">{form.id ? `Edit ${title}` : `New ${title}`}</h3>
          <button onClick={onClose} className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">{f.label}</label>
              {f.type === "textarea" ? (
                <textarea rows={3} value={form[f.key] || ""} onChange={e => set(f.key, e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary resize-none"
                  placeholder={f.placeholder || ""} />
              ) : f.type === "select" ? (
                <select value={form[f.key] || f.options?.[0]} onChange={e => set(f.key, e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary">
                  {f.options?.map(o => <option key={o}>{o}</option>)}
                </select>
              ) : (
                <input type={f.type || "text"} value={form[f.key] || ""} onChange={e => set(f.key, e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
                  placeholder={f.placeholder || ""} />
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} className="flex-1 border border-outline-variant text-on-surface-variant py-2.5 rounded-xl font-semibold hover:bg-surface-container transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-gradient-to-r from-indigo-500 to-violet-600 text-white py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity">
            <Save className="w-4 h-4" />{saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// VIEW DETAILS MODAL (read-only)
// ============================================================
function ViewDetailsModal({ record, title, onClose }) {
  if (!record) return null;
  const ignoreKeys = ["id", "createdAt", "checks"];

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
// MAINTENANCE MODAL (ITDF-01)
// ============================================================
function MaintenanceModal({ record, onSave, onClose }) {
  const EQUIPMENT_OPTIONS = ["Printer", "Scanner", "Photocopier", "UPS", "Computer", "Laptop", "Server", "Network Switch", "Telephone", "Other"];
  const FREQUENCY_OPTIONS = ["", "Daily", "Weekly", "Monthly", "Quarterly", "Annually", "One-time"];
  const PERIOD_OPTIONS = ["", "1st Half", "2nd Half", "Whole Day", "Morning", "Afternoon"];

  const [form, setForm] = useState(record || {});
  const [saving, setSaving] = useState(false);
  const isPrinter = form.equipment === "Printer" || form.equipment === "Photocopier";

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const item = {
      ...form,
      title: (form.equipment || "Equipment") + " Inspection",
      id: form.id || Date.now(),
      createdAt: form.createdAt || Date.now(),
    };
    await onSave(item);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-outline-variant sticky top-0 bg-surface-container-lowest z-10">
          <h3 className="text-lg font-bold text-primary">{form.id ? "Edit Maintenance" : "New Maintenance (ITDF-01)"}</h3>
          <button onClick={onClose} className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          {/* Equipment Type */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Equipment Type *</label>
            <select value={form.equipment || ""} onChange={e => set("equipment", e.target.value)}
              className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary">
              <option value="">Select equipment...</option>
              {EQUIPMENT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          {/* Two-column grid for basic info */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Inspected By *</label>
              <input value={form.inspectedBy || ""} onChange={e => set("inspectedBy", e.target.value)}
                className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary" placeholder="Inspector name" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Checked By</label>
              <input value={form.checkedBy || ""} onChange={e => set("checkedBy", e.target.value)}
                className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary" placeholder="Reviewed by" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Inspection Date</label>
              <input type="date" value={form.inspectionDate || ""} onChange={e => { set("inspectionDate", e.target.value); set("scheduledDate", e.target.value); }}
                className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Reference / PO</label>
              <input value={form.reference || ""} onChange={e => set("reference", e.target.value)}
                className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary" placeholder="Reference code" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Frequency</label>
              <select value={form.frequency || ""} onChange={e => set("frequency", e.target.value)}
                className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary">
                {FREQUENCY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Period</label>
              <select value={form.period || ""} onChange={e => set("period", e.target.value)}
                className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary">
                {PERIOD_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {/* Three-column grid for device info */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Brand</label>
              <input value={form.brand || ""} onChange={e => set("brand", e.target.value)}
                className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary" placeholder="Brand" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Model</label>
              <input value={form.model || ""} onChange={e => set("model", e.target.value)}
                className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary" placeholder="Model" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Serial No.</label>
              <input value={form.serial || ""} onChange={e => set("serial", e.target.value)}
                className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary" placeholder="Serial number" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Location</label>
            <input value={form.location || ""} onChange={e => set("location", e.target.value)}
              className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary" placeholder="e.g. Ground Floor Office" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Description / Notes</label>
            <textarea rows={3} value={form.description || ""} onChange={e => set("description", e.target.value)}
              className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary resize-none" placeholder="Additional details..." />
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Status</label>
            <select value={form.status || "pending"} onChange={e => set("status", e.target.value)}
              className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary">
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Toner section — only for Printer / Photocopier */}
          {isPrinter && (
            <div className="border border-outline-variant rounded-xl p-4 space-y-4 bg-surface-container/30">
              <h4 className="text-sm font-bold text-primary flex items-center gap-2"><Wrench className="w-4 h-4" />Toner / Consumables</h4>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Toner Level</label>
                  <select value={form.tonerLevel || ""} onChange={e => set("tonerLevel", e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary">
                    <option value="">Select...</option>
                    <option value="Full">Full</option>
                    <option value="Half">Half</option>
                    <option value="Low">Low</option>
                    <option value="Empty">Empty</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Toner %</label>
                  <input type="number" min="0" max="100" value={form.tonerPercent ?? 100} onChange={e => set("tonerPercent", parseInt(e.target.value) || 0)}
                    className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Toner Notes</label>
                <textarea rows={2} value={form.tonerNotes || ""} onChange={e => set("tonerNotes", e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary resize-none" placeholder="Toner / consumable notes..." />
              </div>
            </div>
          )}

          {/* Inspection Checklist */}
          <div className="border border-outline-variant rounded-xl p-4 space-y-3 bg-surface-container/30">
            <h4 className="text-sm font-bold text-primary">Inspection Checklist</h4>
            {[
              { key: "checkParts", label: "Visual Inspection — Parts & Components" },
              { key: "cleanInteriors", label: "Cleaning — Interior & Exterior" },
              { key: "operatingCondition", label: "Operating Condition — Functional Test" },
              { key: "electricalWires", label: "Electrical — Wires & Connections" },
            ].map(c => (
              <label key={c.key} className="flex items-center gap-3 cursor-pointer select-none p-2 rounded-lg hover:bg-surface-container transition-colors">
                <input type="checkbox" checked={form.checks?.[c.key] || false} onChange={e => set("checks", { ...form.checks, [c.key]: e.target.checked })}
                  className="w-4 h-4 rounded accent-indigo-600" />
                <span className="text-sm font-medium text-on-surface">{c.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} className="flex-1 border border-outline-variant text-on-surface-variant py-2.5 rounded-xl font-semibold hover:bg-surface-container transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.equipment}
            className="flex-1 bg-gradient-to-r from-indigo-500 to-violet-600 text-white py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity">
            <Save className="w-4 h-4" />{saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ACCOMPLISHMENT MODAL
// ============================================================
function AccomplishmentModal({ record, onSave, onClose }) {
  const [form, setForm] = useState(record || {});
  const [saving, setSaving] = useState(false);
  const isTech = form.category === "Technical Support";

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const CATEGORIES = ["Technical Support", "Uploading/Encoding", "Development", "Other"];
  const DEPARTMENTS = ["IT", "HR", "Finance", "Operations", "Sales", "Executive", "Admin", "Warehouse"];
  const SEVERITIES = ["Low", "Medium", "High", "Critical"];

  const handleSave = async () => {
    setSaving(true);
    const item = { ...form, id: form.id || Date.now(), createdAt: form.createdAt || Date.now() };

    // Set title based on category
    if (isTech) {
      item.title = form.reportTitle || "Technical Support";
    } else {
      item.title = (form.category || "Other") + " Job";
      // Clean up tech-only fields
      delete item.reportTitle;
      delete item.requestorName;
      delete item.severity;
      delete item.department;
      delete item.branch;
      delete item.incidentDate;
      delete item.dateResolve;
      delete item.resolution;
    }

    await onSave(item);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-outline-variant sticky top-0 bg-surface-container-lowest z-10">
          <h3 className="text-lg font-bold text-primary">{form.id ? "Edit Accomplishment" : "New Daily Accomplishment"}</h3>
          <button onClick={onClose} className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Category *</label>
              <select value={form.category || ""} onChange={e => set("category", e.target.value)}
                className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary">
                <option value="">Select category...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Date *</label>
              <input type="date" value={form.date || ""} onChange={e => set("date", e.target.value)}
                className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Description *</label>
            <textarea rows={4} value={form.description || ""} onChange={e => set("description", e.target.value)}
              className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary resize-none" placeholder="Describe what was accomplished..." />
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Status</label>
            <select value={form.status || "pending"} onChange={e => set("status", e.target.value)}
              className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary">
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Technical Support fields — shown only for Technical Support category */}
          {isTech && (
            <div className="border border-outline-variant rounded-xl p-4 space-y-4 bg-surface-container/30">
              <h4 className="text-sm font-bold text-primary flex items-center gap-2"><LifeBuoy className="w-4 h-4" />IT Support Details</h4>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Report Title *</label>
                  <input value={form.reportTitle || ""} onChange={e => set("reportTitle", e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary" placeholder="Brief summary of the issue" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Requestor Name *</label>
                  <input value={form.requestorName || ""} onChange={e => set("requestorName", e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary" placeholder="Who reported this?" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Severity</label>
                  <select value={form.severity || "Medium"} onChange={e => set("severity", e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary">
                    {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Department</label>
                  <select value={form.department || ""} onChange={e => set("department", e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary">
                    <option value="">Select...</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Branch / Location</label>
                  <input value={form.branch || ""} onChange={e => set("branch", e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary" placeholder="e.g. Makati Branch" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Incident Date</label>
                  <input type="datetime-local" value={form.incidentDate || ""} onChange={e => set("incidentDate", e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Date Resolved</label>
                  <input type="datetime-local" value={form.dateResolve || ""} onChange={e => set("dateResolve", e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Resolution</label>
                  <textarea rows={3} value={form.resolution || ""} onChange={e => set("resolution", e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary resize-none" placeholder="How was this issue resolved?" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} className="flex-1 border border-outline-variant text-on-surface-variant py-2.5 rounded-xl font-semibold hover:bg-surface-container transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.category}
            className="flex-1 bg-gradient-to-r from-indigo-500 to-violet-600 text-white py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity">
            <Save className="w-4 h-4" />{saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// GENERIC LIST VIEW
// ============================================================
function GenericListView({ title, icon, items, fields, columns, onAdd, onEdit, onDelete, onView, onExportXLS }) {
  const [search, setSearch] = useState("");
  const filtered = items.filter(item =>
    !search || Object.values(item).some(v => String(v).toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-4 md:p-8 max-w-screen-2xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-primary flex items-center gap-3">{icon}{title}</h2>
          <p className="text-on-surface-variant mt-1">{items.length} records</p>
        </div>
        <div className="flex gap-2">
          {onExportXLS && (
            <button onClick={onExportXLS}
              className="flex items-center gap-2 border border-outline-variant text-on-surface-variant px-4 py-2.5 rounded-xl font-semibold hover:bg-surface-container transition-colors">
              <FileSpreadsheet className="w-4 h-4" /> Export XLS
            </button>
          )}
          <button onClick={onAdd}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity shadow-sm">
            <Plus className="w-4 h-4" /> Add New
          </button>
        </div>
      </div>

      <div className="relative mb-5">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="w-full bg-surface-container border border-outline-variant rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
          placeholder={`Search ${title.toLowerCase()}...`} />
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container/50">
                {columns.map(col => (
                  <th key={col.key} className="text-left text-xs font-semibold text-on-surface-variant px-5 py-3.5">{col.label}</th>
                ))}
                <th className="text-right text-xs font-semibold text-on-surface-variant px-5 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={columns.length + 1} className="text-center py-14 text-on-surface-variant">
                  <div className="text-on-surface-variant/20 mb-3 flex justify-center">{icon}</div>
                  <p className="font-medium">No records found</p>
                </td></tr>
              ) : filtered.map(item => (
                <tr key={item.id} className="border-b border-outline-variant/50 hover:bg-surface-container/40 transition-colors last:border-0">
                  {columns.map(col => (
                    <td key={col.key} className="px-5 py-3.5 text-sm">
                      {col.render ? col.render(item) : (item[col.key] || "—")}
                    </td>
                  ))}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      {onView && <button onClick={() => onView(item)} className="p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"><Eye className="w-4 h-4" /></button>}
                      <button onClick={() => onEdit(item)} className="p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => onDelete(item.id)} className="p-2 rounded-lg text-on-surface-variant hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// VIEWS CONFIG
// ============================================================
const VIEWS_CONFIG = {
  services: {
    title: "IT Services",
    icon: <LifeBuoy className="w-7 h-7 text-teal-500" />,
    key: "it_services",
    fields: [
      { key: "name", label: "Service Name", placeholder: "e.g. WiFi Issue" },
      { key: "requestorName", label: "Requestor", placeholder: "Name" },
      { key: "department", label: "Department", placeholder: "HR, IT, Operations..." },
      { key: "severity", label: "Severity", type: "select", options: ["High", "Medium", "Low"] },
      { key: "incidentDate", label: "Incident Date", type: "datetime-local" },
      { key: "description", label: "Description", type: "textarea", placeholder: "Describe the issue..." },
      { key: "resolution", label: "Resolution", type: "textarea", placeholder: "How was it resolved?" },
      { key: "status", label: "Status", type: "select", options: ["open", "in-progress", "resolved", "closed"] },
    ],
    columns: [
      { key: "name", label: "Service Name", render: r => <span className="font-semibold text-primary">{r.name || "—"}</span> },
      { key: "requestorName", label: "Requestor" },
      { key: "department", label: "Department" },
      { key: "severity", label: "Severity", render: r => <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${SEVERITY_BADGE[r.severity] || ""}`}>{r.severity || "—"}</span> },
      { key: "status", label: "Status", render: r => <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg capitalize ${STATUS_BADGE[r.status] || ""}`}>{r.status || "—"}</span> },
    ],
  },
  maintenance: {
    title: "IT Maintenance",
    icon: <Wrench className="w-7 h-7 text-indigo-500" />,
    key: "it_maintenance",
    fields: [
      { key: "equipment", label: "Equipment Type" },
      { key: "inspectedBy", label: "Inspected By" },
      { key: "inspectionDate", label: "Inspection Date" },
    ],
    columns: [
      { key: "equipment", label: "Equipment", render: r => <span className="font-semibold text-primary">{r.equipment || "—"}</span> },
      { key: "inspectedBy", label: "Inspector" },
      { key: "location", label: "Location" },
      { key: "inspectionDate", label: "Date", render: r => fmtDate(r.inspectionDate) },
      { key: "status", label: "Status", render: r => <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg capitalize ${STATUS_BADGE[r.status] || ""}`}>{r.status || "—"}</span> },
    ],
  },
  inventory: {
    title: "IT Inventory",
    icon: <Package className="w-7 h-7 text-amber-500" />,
    key: "it_inventory",
    fields: [
      { key: "name", label: "Item Name", placeholder: "e.g. Dell Laptop" },
      { key: "category", label: "Category", type: "select", options: ["Computer", "Network", "Peripheral", "Storage", "Other"] },
      { key: "serialNumber", label: "Serial Number", placeholder: "SN/Asset tag" },
      { key: "assignedTo", label: "Assigned To", placeholder: "User or department" },
      { key: "purchaseDate", label: "Purchase Date", type: "date" },
      { key: "status", label: "Status", type: "select", options: ["active", "in-repair", "decommissioned", "spare"] },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    columns: [
      { key: "name", label: "Item", render: r => <span className="font-semibold text-primary">{r.name || "—"}</span> },
      { key: "category", label: "Category" },
      { key: "serialNumber", label: "Serial #" },
      { key: "assignedTo", label: "Assigned To" },
      { key: "status", label: "Status", render: r => <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg capitalize ${STATUS_BADGE[r.status] || ""}`}>{r.status || "—"}</span> },
    ],
  },
  task: {
    title: "IT Tasks",
    icon: <CheckSquare className="w-7 h-7 text-rose-500" />,
    key: "it_task",
    fields: [
      { key: "title", label: "Task Title", placeholder: "e.g. Patch Windows servers" },
      { key: "assignedTo", label: "Assigned To", placeholder: "Technician name" },
      { key: "dueDate", label: "Due Date", type: "date" },
      { key: "priority", label: "Priority", type: "select", options: ["High", "Medium", "Low"] },
      { key: "description", label: "Description", type: "textarea" },
      { key: "status", label: "Status", type: "select", options: ["pending", "in-progress", "done", "cancelled"] },
    ],
    columns: [
      { key: "title", label: "Task", render: r => <span className="font-semibold text-primary">{r.title || "—"}</span> },
      { key: "assignedTo", label: "Assigned To" },
      { key: "dueDate", label: "Due Date", render: r => fmtDate(r.dueDate) },
      { key: "priority", label: "Priority", render: r => <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${SEVERITY_BADGE[r.priority] || ""}`}>{r.priority || "—"}</span> },
      { key: "status", label: "Status", render: r => <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg capitalize ${STATUS_BADGE[r.status] || ""}`}>{r.status || "—"}</span> },
    ],
  },
  tickets: {
    title: "Support Tickets",
    icon: <Ticket className="w-7 h-7 text-purple-500" />,
    key: "it_tickets",
    fields: [
      { key: "title", label: "Ticket Title", placeholder: "Brief description" },
      { key: "requestor", label: "Requestor", placeholder: "User name" },
      { key: "department", label: "Department", placeholder: "HR, IT..." },
      { key: "severity", label: "Severity", type: "select", options: ["High", "Medium", "Low"] },
      { key: "description", label: "Description", type: "textarea" },
      { key: "assignedTo", label: "Assigned To", placeholder: "Technician" },
      { key: "status", label: "Status", type: "select", options: ["open", "in-progress", "resolved", "closed"] },
    ],
    columns: [
      { key: "title", label: "Ticket", render: r => <span className="font-semibold text-primary">{r.title || r.name || "—"}</span> },
      { key: "requestor", label: "Requestor" },
      { key: "severity", label: "Severity", render: r => <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${SEVERITY_BADGE[r.severity] || ""}`}>{r.severity || "—"}</span> },
      { key: "assignedTo", label: "Assigned To" },
      { key: "status", label: "Status", render: r => <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg capitalize ${STATUS_BADGE[r.status] || ""}`}>{r.status || "—"}</span> },
    ],
  },
  systems: {
    title: "System Monitor",
    icon: <Activity className="w-7 h-7 text-cyan-500" />,
    key: "it_systems",
    fields: [
      { key: "name", label: "System Name", placeholder: "e.g. Main Server" },
      { key: "type", label: "Type", type: "select", options: ["Server", "Network", "Application", "Database", "Security", "Other"] },
      { key: "ip", label: "IP / Host", placeholder: "192.168.x.x" },
      { key: "status", label: "Status", type: "select", options: ["online", "offline", "degraded", "maintenance"] },
      { key: "lastChecked", label: "Last Checked", type: "datetime-local" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    columns: [
      { key: "name", label: "System", render: r => <span className="font-semibold text-primary">{r.name || "—"}</span> },
      { key: "type", label: "Type" },
      { key: "ip", label: "IP / Host" },
      { key: "status", label: "Status", render: r => {
        const colors = { online: "text-emerald-500", offline: "text-red-500", degraded: "text-amber-500", maintenance: "text-blue-500" };
        return <span className={`flex items-center gap-1.5 font-semibold text-sm capitalize ${colors[r.status] || "text-on-surface-variant"}`}>
          <Circle className="w-2 h-2 fill-current" />{r.status || "—"}
        </span>;
      }},
      { key: "lastChecked", label: "Last Checked", render: r => fmtDate(r.lastChecked) },
    ],
  },
  accomplishments: {
    title: "Daily Accomplishments",
    icon: <CheckCircle className="w-7 h-7 text-emerald-500" />,
    key: "it_accomplishments",
    fields: [
      { key: "title", label: "Title" },
      { key: "date", label: "Date" },
      { key: "category", label: "Category" },
    ],
    columns: [
      { key: "title", label: "Accomplishment", render: r => <span className="font-semibold text-primary">{r.title || "—"}</span> },
      { key: "date", label: "Date", render: r => fmtDate(r.date) },
      { key: "category", label: "Category", render: r => <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-700">{r.category || "—"}</span> },
      { key: "description", label: "Description", render: r => <span className="text-on-surface-variant text-xs line-clamp-2">{r.description || "—"}</span> },
    ],
  },
};

// ============================================================
// TIME TRACKING VIEW
// ============================================================
function TimeTrackView({ entries, tasks, onSave }) {
  const [modal, setModal] = useState(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerTask, setTimerTask] = useState("");
  const [timerStart, setTimerStart] = useState(null);
  const [elapsed, setElapsed] = useState("00:00:00");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!timerRunning || !timerStart) return;
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - timerStart) / 1000);
      const h = String(Math.floor(diff / 3600)).padStart(2, "0");
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
      const s = String(diff % 60).padStart(2, "0");
      setElapsed(`${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, timerStart]);

  const startTimer = () => {
    if (!timerTask) return;
    setTimerRunning(true);
    setTimerStart(Date.now());
  };

  const stopTimer = () => {
    if (!timerRunning || !timerStart) return;
    const duration = Math.floor((Date.now() - timerStart) / 1000);
    const h = String(Math.floor(duration / 3600)).padStart(2, "0");
    const m = String(Math.floor((duration % 3600) / 60)).padStart(2, "0");
    const s = String(duration % 60).padStart(2, "0");
    const entry = {
      id: Date.now().toString(),
      task: timerTask,
      duration: `${h}:${m}:${s}`,
      durationSeconds: duration,
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    };
    onSave([...entries, entry]);
    setTimerRunning(false);
    setTimerStart(null);
    setElapsed("00:00:00");
    setTimerTask("");
  };

  const filteredEntries = entries.filter(e => {
    if (filter === "today") return e.date === new Date().toISOString().slice(0, 10);
    if (filter === "week") {
      const d = new Date(e.date);
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      return d >= weekAgo;
    }
    return true;
  });

  const totalSeconds = filteredEntries.reduce((s, e) => s + (e.durationSeconds || 0), 0);
  const totalH = Math.floor(totalSeconds / 3600);
  const totalM = Math.floor((totalSeconds % 3600) / 60);

  const fields = [
    { key: "task", label: "Task", placeholder: "What did you work on?" },
    { key: "duration", label: "Duration (HH:MM:SS)", placeholder: "01:30:00" },
    { key: "date", label: "Date", type: "date" },
    { key: "notes", label: "Notes", type: "textarea" },
  ];

  const handleSave = (item) => {
    const updated = item.id ? entries.map(e => e.id === item.id ? item : e) : [...entries, { ...item, id: Date.now().toString(), durationSeconds: parseDuration(item.duration), createdAt: new Date().toISOString() }];
    onSave(updated);
    setModal(null);
  };

  const handleDelete = (id) => {
    if (!confirm("Delete this time entry?")) return;
    onSave(entries.filter(e => e.id !== id));
  };

  return (
    <>
      {modal && <RecordModal title="Time Entry" fields={fields} record={modal === "new" ? {} : modal} onSave={handleSave} onClose={() => setModal(null)} />}
      <div className="p-4 md:p-8 max-w-screen-2xl mx-auto animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-bold text-primary flex items-center gap-3"><Clock className="w-7 h-7 text-cyan-500" />Time Tracking</h2>
            <p className="text-on-surface-variant mt-1">{entries.length} entries</p>
          </div>
          <button onClick={() => setModal("new")}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-teal-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity shadow-sm">
            <Plus className="w-4 h-4" /> Log Time
          </button>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-bold text-primary mb-4">Live Timer</h3>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Task</label>
              <select value={timerTask} onChange={e => setTimerTask(e.target.value)}
                className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary">
                <option value="">Select a task...</option>
                {tasks.map(t => <option key={t.id} value={t.title}>{t.title}</option>)}
                {timerTask && !tasks.find(t => t.title === timerTask) && <option value={timerTask}>{timerTask}</option>}
              </select>
            </div>
            <div className="text-center">
              <div className="text-3xl font-mono font-bold text-primary bg-surface-container rounded-xl px-6 py-2.5">{elapsed}</div>
            </div>
            {!timerRunning ? (
              <button onClick={startTimer} disabled={!timerTask}
                className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 whitespace-nowrap">
                <Play className="w-4 h-4" /> Start
              </button>
            ) : (
              <button onClick={stopTimer}
                className="flex items-center gap-2 bg-red-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-red-700 transition-colors whitespace-nowrap">
                <Square className="w-4 h-4" /> Stop
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            {["all", "today", "week"].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${filter === f ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}>
                {f === "all" ? "All" : f === "today" ? "Today" : "This Week"}
              </button>
            ))}
          </div>
          <p className="text-sm font-semibold text-on-surface-variant">Total: <span className="text-primary">{totalH}h {totalM}m</span></p>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-surface-container-lowest border border-outline-variant rounded-xl">
            <Clock className="w-12 h-12 text-surface-container-highest mx-auto mb-4" />
            <p className="text-on-surface-variant">No time entries found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEntries.sort((a, b) => ((b.createdAt || "") > (a.createdAt || "") ? 1 : -1)).map(e => (
              <div key={e.id} className="flex items-center gap-4 p-4 bg-surface-container-lowest border border-outline-variant rounded-xl">
                <div className="p-3 rounded-xl bg-cyan-100 text-cyan-600"><Clock className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary">{e.task || "—"}</p>
                  <p className="text-xs text-on-surface-variant">{e.date}{e.notes ? ` · ${e.notes}` : ""}</p>
                </div>
                <span className="text-sm font-mono font-bold text-primary">{e.duration || "—"}</span>
                <button onClick={() => setModal(e)} className="p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(e.id)} className="p-2 rounded-lg text-on-surface-variant hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function parseDuration(str) {
  if (!str) return 0;
  const parts = str.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 3600 + parts[1] * 60;
  return parseInt(str) || 0;
}

// ============================================================
// KNOWLEDGE BASE VIEW
// ============================================================
function KnowledgeView({ articles, onSave }) {
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

  const filtered = articles.filter(a => {
    if (catFilter !== "all" && a.category !== catFilter) return false;
    if (search && !(a.title + a.content + a.tags).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const categories = ["all", ...new Set(articles.map(a => a.category).filter(Boolean))];

  const fields = [
    { key: "title", label: "Article Title", placeholder: "e.g. How to reset a password" },
    { key: "category", label: "Category", type: "select", options: ["SOP", "Troubleshooting", "Guide", "Reference"] },
    { key: "content", label: "Content", type: "textarea", placeholder: "Write the article content..." },
    { key: "tags", label: "Tags (comma separated)", placeholder: "password, security, account" },
  ];

  const handleSave = (item) => {
    const updated = item.id ? articles.map(a => a.id === item.id ? item : a) : [...articles, { ...item, id: Date.now().toString(), createdAt: new Date().toISOString() }];
    onSave(updated);
    setModal(null);
  };

  const handleDelete = (id) => {
    if (!confirm("Delete this article?")) return;
    onSave(articles.filter(a => a.id !== id));
  };

  return (
    <>
      {modal && <RecordModal title="Knowledge Article" fields={fields} record={modal === "new" ? {} : modal} onSave={handleSave} onClose={() => setModal(null)} />}
      <div className="p-4 md:p-8 max-w-screen-2xl mx-auto animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-bold text-primary flex items-center gap-3"><BookOpen className="w-7 h-7 text-amber-500" />Knowledge Base</h2>
            <p className="text-on-surface-variant mt-1">{articles.length} articles</p>
          </div>
          <button onClick={() => setModal("new")}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity shadow-sm">
            <Plus className="w-4 h-4" /> New Article
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            {categories.map(c => (
              <button key={c} onClick={() => setCatFilter(c)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${catFilter === c ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}>
                {c === "all" ? "All" : c}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-primary"
              placeholder="Search articles..." />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-surface-container-lowest border border-outline-variant rounded-xl">
            <BookOpen className="w-12 h-12 text-surface-container-highest mx-auto mb-4" />
            <p className="text-on-surface-variant">No articles found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(a => {
              const catColors = { SOP: "bg-blue-100 text-blue-700", Troubleshooting: "bg-red-100 text-red-700", Guide: "bg-emerald-100 text-emerald-700", Reference: "bg-purple-100 text-purple-700" };
              return (
                <div key={a.id} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${catColors[a.category] || "bg-gray-100 text-gray-700"}`}>{a.category || "Uncategorized"}</span>
                    <div className="flex gap-1">
                      <button onClick={() => setModal(a)} className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg text-on-surface-variant hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <h3 className="font-bold text-primary mb-2">{a.title}</h3>
                  <div className={`text-sm text-on-surface-variant ${expandedId === a.id ? "" : "line-clamp-3"}`}>{a.content}</div>
                  {a.content && a.content.length > 150 && (
                    <button onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                      className="text-xs font-semibold text-indigo-500 hover:text-indigo-600 mt-1">
                      {expandedId === a.id ? "Show less" : "Read more"}
                    </button>
                  )}
                  {a.tags && <div className="flex gap-1 mt-3 flex-wrap">
                    {a.tags.split(",").map(t => t.trim()).filter(Boolean).map(t => (
                      <span key={t} className="text-[10px] bg-surface-container text-on-surface-variant px-2 py-0.5 rounded-full">{t}</span>
                    ))}
                  </div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ============================================================
// AUDIT LOG VIEW
// ============================================================
function AuditLogView({ logs, onSave }) {
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  const modules = ["all", ...new Set(logs.map(l => l.module).filter(Boolean))];
  const actions = ["all", ...new Set(logs.map(l => l.action).filter(Boolean))];

  const filtered = logs.filter(l => {
    if (moduleFilter !== "all" && l.module !== moduleFilter) return false;
    if (actionFilter !== "all" && l.action !== actionFilter) return false;
    return true;
  }).sort((a, b) => ((b.timestamp || "") > (a.timestamp || "") ? 1 : -1));

  const clearLogs = () => {
    if (!confirm("Clear all audit log entries?")) return;
    onSave([]);
  };

  const exportLogs = () => {
    const csv = [["Timestamp", "Module", "Action", "Description", "User"].join(","),
      ...filtered.map(l => [l.timestamp, l.module, l.action, `"${(l.description || "").replace(/"/g, '""')}"`, l.user].join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
  };

  const actionColors = {
    Created: "bg-emerald-100 text-emerald-700",
    Updated: "bg-amber-100 text-amber-700",
    Deleted: "bg-red-100 text-red-700",
  };

  const moduleIcons = {
    timetrack: <Clock className="w-4 h-4" />,
    knowledge: <BookOpen className="w-4 h-4" />,
    task: <CheckSquare className="w-4 h-4" />,
    services: <LifeBuoy className="w-4 h-4" />,
    maintenance: <Wrench className="w-4 h-4" />,
    inventory: <Package className="w-4 h-4" />,
    tickets: <Ticket className="w-4 h-4" />,
    systems: <Activity className="w-4 h-4" />,
    planner: <Map className="w-4 h-4" />,
    accomplishments: <CheckCircle className="w-4 h-4" />,
  };

  return (
    <div className="p-4 md:p-8 max-w-screen-2xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-primary flex items-center gap-3"><History className="w-7 h-7 text-indigo-500" />Audit Log</h2>
          <p className="text-on-surface-variant mt-1">{logs.length} entries</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportLogs} disabled={filtered.length === 0}
            className="flex items-center gap-2 border border-outline-variant text-on-surface-variant px-4 py-2.5 rounded-xl font-semibold hover:bg-surface-container transition-colors disabled:opacity-50">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={clearLogs} disabled={logs.length === 0}
            className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2.5 rounded-xl font-semibold hover:bg-red-200 transition-colors disabled:opacity-50">
            <Trash2 className="w-4 h-4" /> Clear
          </button>
        </div>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)}
          className="bg-surface-container border border-outline-variant rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary">
          <option value="all">All Modules</option>
          {modules.filter(m => m !== "all").map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}
          className="bg-surface-container border border-outline-variant rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary">
          <option value="all">All Actions</option>
          {actions.filter(a => a !== "all").map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <span className="text-sm font-semibold text-on-surface-variant self-center">{filtered.length} entries</span>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-surface-container-lowest border border-outline-variant rounded-xl">
          <History className="w-12 h-12 text-surface-container-highest mx-auto mb-4" />
          <p className="text-on-surface-variant">No audit log entries found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((l, i) => (
            <div key={l.id || i} className="flex items-start gap-4 p-4 bg-surface-container-lowest border border-outline-variant rounded-xl">
              <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-600 flex-shrink-0">
                {moduleIcons[l.module] || <History className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${actionColors[l.action] || "bg-gray-100 text-gray-700"}`}>{l.action || "—"}</span>
                  <span className="text-xs font-semibold text-on-surface-variant capitalize">{l.module}</span>
                  {l.user && <span className="text-xs text-on-surface-variant">by {l.user}</span>}
                </div>
                <p className="text-sm text-on-surface-variant mt-1">{l.description || "—"}</p>
                <p className="text-xs text-on-surface-variant/60 mt-0.5">{l.timestamp ? new Date(l.timestamp).toLocaleString() : "—"}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function PlannerView({ items, onSaveList }) {
  const [modal, setModal] = useState(null);

  const fields = [
    { key: "title", label: "Plan Title", placeholder: "e.g. Network Upgrade Q3" },
    { key: "targetDate", label: "Target Date", type: "date" },
    { key: "status", label: "Status", type: "select", options: ["planning", "in-progress", "completed", "on-hold"] },
    { key: "description", label: "Description", type: "textarea" },
  ];

  const handleSave = async (item) => {
    let updated;
    if (items.find(p => p.id === item.id)) updated = items.map(p => p.id === item.id ? item : p);
    else updated = [...items, item];
    await onSaveList(updated);
    setModal(null);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this plan?")) return;
    await onSaveList(items.filter(p => p.id !== id));
  };

  return (
    <>
      {modal && <RecordModal title="IT Plan" fields={fields} record={modal === "new" ? {} : modal} onSave={handleSave} onClose={() => setModal(null)} />}
      <div className="p-4 md:p-8 max-w-screen-2xl mx-auto animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-bold text-primary flex items-center gap-3"><Map className="w-7 h-7 text-violet-500" />IT Planner</h2>
            <p className="text-on-surface-variant mt-1">{items.length} plans</p>
          </div>
          <div className="flex gap-2">
            {items.length > 0 && (
              <button onClick={() => downloadITAccomplishmentsXLS(items)}
                className="flex items-center gap-2 border border-outline-variant text-on-surface-variant px-4 py-2.5 rounded-xl font-semibold hover:bg-surface-container transition-colors">
                <FileSpreadsheet className="w-4 h-4" /> Export XLS
              </button>
            )}
            <button onClick={() => setModal("new")}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity shadow-sm">
              <Plus className="w-4 h-4" /> New Plan
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.length === 0 ? (
            <div className="col-span-3 text-center py-16 text-on-surface-variant">
              <Map className="w-14 h-14 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No plans yet. Start planning!</p>
            </div>
          ) : items.map(plan => {
            const statusColors = {
              planning: "bg-blue-100 text-blue-700", "in-progress": "bg-amber-100 text-amber-700",
              completed: "bg-emerald-100 text-emerald-700", "on-hold": "bg-slate-100 text-slate-600"
            };
            return (
              <div key={plan.id} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm hover:-translate-y-1 transition-transform group">
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg capitalize ${statusColors[plan.status] || "bg-slate-100 text-slate-600"}`}>{plan.status || "planning"}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setModal(plan)} className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(plan.id)} className="p-1.5 rounded-lg text-on-surface-variant hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <h3 className="font-bold text-primary mb-2">{plan.title}</h3>
                {plan.description && <p className="text-xs text-on-surface-variant line-clamp-3 mb-3">{plan.description}</p>}
                {plan.targetDate && <p className="text-xs text-on-surface-variant font-semibold">🗓 {fmtDate(plan.targetDate)}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ============================================================
// DASHBOARD VIEW
// ============================================================
function DashboardView({ userData }) {
  const services = userData.it_services || [];
  const maintenance = userData.it_maintenance || [];
  const tickets = userData.it_tickets || [];
  const tasks = userData.it_task || [];
  const systems = userData.it_systems || [];
  const inventory = userData.it_inventory || [];

  const openTickets = tickets.filter(t => t.status === "open" || t.status === "in-progress").length;
  const onlineSystemsCount = systems.filter(s => s.status === "online").length;
  const pendingTasks = tasks.filter(t => t.status === "pending" || t.status === "in-progress").length;
  const resolvedServices = services.filter(s => s.status === "resolved").length;

  const recentActivity = [
    ...services.slice(-3).map(s => ({ label: s.name, sub: `Service · ${s.status}`, color: "text-teal-500" })),
    ...tickets.slice(-2).map(t => ({ label: t.title || t.name, sub: `Ticket · ${t.status}`, color: "text-purple-500" })),
    ...maintenance.slice(-2).map(m => ({ label: m.name, sub: `Maintenance · ${m.status}`, color: "text-indigo-500" })),
  ].slice(-6).reverse();

  return (
    <div className="p-4 md:p-8 max-w-screen-2xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-primary">IT Dashboard</h2>
          <p className="text-on-surface-variant mt-1">Overview of IT operations and system status</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Open Tickets", value: openTickets, color: "from-purple-500 to-purple-700", icon: <Ticket className="w-5 h-5" /> },
          { label: "Pending Tasks", value: pendingTasks, color: "from-amber-500 to-orange-600", icon: <CheckSquare className="w-5 h-5" /> },
          { label: "Systems Online", value: `${onlineSystemsCount}/${systems.length}`, color: "from-teal-500 to-teal-700", icon: <Activity className="w-5 h-5" /> },
          { label: "Resolved Services", value: resolvedServices, color: "from-emerald-500 to-emerald-700", icon: <CheckCircle2 className="w-5 h-5" /> },
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Module Overview */}
        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: "IT Services", val: services.length, color: "from-teal-500 to-teal-700", icon: <LifeBuoy className="w-5 h-5" /> },
            { label: "Maintenance", val: maintenance.length, color: "from-indigo-500 to-indigo-700", icon: <Wrench className="w-5 h-5" /> },
            { label: "Inventory", val: inventory.length, color: "from-amber-500 to-amber-700", icon: <Package className="w-5 h-5" /> },
            { label: "IT Tasks", val: tasks.length, color: "from-rose-500 to-rose-700", icon: <CheckSquare className="w-5 h-5" /> },
            { label: "Tickets", val: tickets.length, color: "from-purple-500 to-purple-700", icon: <Ticket className="w-5 h-5" /> },
            { label: "Systems", val: systems.length, color: "from-cyan-500 to-cyan-700", icon: <Activity className="w-5 h-5" /> },
          ].map(s => (
            <div key={s.label} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm hover:-translate-y-1 transition-transform">
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${s.color} text-white w-10 h-10 flex items-center justify-center mb-3`}>{s.icon}</div>
              <p className="text-3xl font-bold text-primary">{s.val}</p>
              <p className="text-sm font-semibold text-on-surface-variant mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm flex flex-col">
          <div className="p-5 border-b border-outline-variant">
            <h3 className="font-bold text-primary flex items-center gap-2"><History className="w-4 h-4" />Recent Activity</h3>
          </div>
          {recentActivity.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <History className="w-10 h-10 text-on-surface-variant/20 mb-3" />
              <p className="text-sm text-on-surface-variant font-medium">No recent activity</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {recentActivity.map((a, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-surface-container transition-colors">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${a.color}`} style={{ background: "currentColor" }} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-primary truncate">{a.label || "—"}</p>
                    <p className="text-xs text-on-surface-variant capitalize">{a.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Legacy key mapping — preferred key → old key names to merge from
const LEGACY_KEYS = {
  it_accomplishments: ["accomplishments", "daily_accomplishments"],
  it_services: ["services"],
  it_maintenance: ["maintenance"],
  it_inventory: ["inventory"],
  it_task: ["task", "tasks"],
  it_tickets: ["tickets"],
  it_systems: ["systems", "monitor"],
  it_planner: ["planner"],
};

// ============================================================
// MAIN PAGE
// ============================================================
function ExecutiveITDashboardInner() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") || "dashboard";

  const [userData, setUserData] = useState({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);

  // Load from userdata/{uid}.data — merges legacy keys
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsubscribe = onSnapshot(doc(db, "userdata", user.uid), snap => {
      const raw = snap.exists() ? (snap.data()?.data || {}) : {};
      // Merge legacy keys into preferred keys
      const merged = { ...raw };
      Object.entries(LEGACY_KEYS).forEach(([preferred, legacyNames]) => {
        const legacyItems = [];
        legacyNames.forEach(name => {
          if (Array.isArray(raw[name])) {
            legacyItems.push(...raw[name]);
            delete merged[name];
          }
        });
        if (legacyItems.length > 0) {
          const existing = merged[preferred] || [];
          const existingIds = new Set(existing.map(i => i.id));
          const newItems = legacyItems.filter(i => !existingIds.has(i.id));
          merged[preferred] = [...existing, ...newItems];
        }
      });
      setUserData(merged);
      setLoading(false);
    }, () => setLoading(false));

    return () => unsubscribe();
  }, []);

  // Generic save for a data key — also cleans up legacy keys
  const saveKey = useCallback(async (key, list) => {
    if (!auth.currentUser) return;
    const snap = await getDoc(doc(db, "userdata", auth.currentUser.uid));
    const existingData = snap.exists() ? (snap.data().data || {}) : {};
    // Remove legacy keys that map to this preferred key
    const cleaned = { ...existingData };
    (LEGACY_KEYS[key] || []).forEach(name => delete cleaned[name]);
    await setDoc(doc(db, "userdata", auth.currentUser.uid), {
      data: { ...cleaned, [key]: list },
      updated_at: new Date().toISOString(),
    });
  }, []);

  // Build CRUD handlers for each view
  const handleSave = async (viewKey, dataKey, item) => {
    const list = userData[dataKey] || [];
    const updated = list.find(r => r.id === item.id)
      ? list.map(r => r.id === item.id ? item : r)
      : [...list, item];
    await saveKey(dataKey, updated);
    setModal(null);
  };

  const handleDelete = async (dataKey, id) => {
    if (!confirm("Delete this record?")) return;
    const list = (userData[dataKey] || []).filter(r => r.id !== id);
    await saveKey(dataKey, list);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  // Planner view
  if (view === "planner") {
    return (
      <PlannerView
        items={userData.it_planner || []}
        onSaveList={(list) => saveKey("it_planner", list)}
      />
    );
  }

  // Dashboard
  if (view === "dashboard") {
    return <DashboardView userData={userData} />;
  }

  // Time Tracking
  if (view === "timetrack") {
    return <TimeTrackView
      entries={userData.it_timetrack || []}
      tasks={userData.it_task || []}
      onSave={(list) => saveKey("it_timetrack", list)}
    />;
  }

  // Knowledge Base
  if (view === "knowledge") {
    return <KnowledgeView
      articles={userData.it_knowledge || []}
      onSave={(list) => saveKey("it_knowledge", list)}
    />;
  }

  // Audit Log
  if (view === "auditlog") {
    return <AuditLogView
      logs={userData.it_auditlog || []}
      onSave={(list) => saveKey("it_auditlog", list)}
    />;
  }

  // All other configured views
  const config = VIEWS_CONFIG[view];
  if (config) {
    const list = userData[config.key] || [];
    const editing = modal && modal !== "new" ? modal : null;
    const getExportHandler = () => {
      if (config.key === "it_services") return () => downloadITServicesXLS(list);
      if (config.key === "it_maintenance") return () => downloadITMaintenanceXLS(list);
      if (config.key === "it_accomplishments") return () => downloadITAccomplishmentsXLS(list);
      return null;
    };
    const renderModal = () => {
      if (modal === null) return null;
      if (view === "maintenance") {
        return <MaintenanceModal record={editing} onSave={(item) => handleSave(view, config.key, item)} onClose={() => setModal(null)} />;
      }
      if (view === "accomplishments") {
        return <AccomplishmentModal record={editing} onSave={(item) => handleSave(view, config.key, item)} onClose={() => setModal(null)} />;
      }
      return (
        <RecordModal
          title={config.title}
          fields={config.fields}
          record={editing}
          onSave={(item) => handleSave(view, config.key, item)}
          onClose={() => setModal(null)}
        />
      );
    };

    return (
      <>
        {renderModal()}
        <ViewDetailsModal record={viewRecord} title={config.title} onClose={() => setViewRecord(null)} />
        <GenericListView
          title={config.title}
          icon={config.icon}
          items={list}
          fields={config.fields}
          columns={config.columns}
          onAdd={() => setModal("new")}
          onEdit={(item) => setModal(item)}
          onView={(item) => setViewRecord(item)}
          onDelete={(id) => handleDelete(config.key, id)}
          onExportXLS={getExportHandler()}
        />
      </>
    );
  }

  // Fallback placeholder for unimplemented views
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <Activity className="w-16 h-16 text-on-surface-variant/20 mb-4" />
      <h2 className="text-2xl font-bold text-primary capitalize">{view.replace("-", " ")}</h2>
      <p className="text-on-surface-variant mt-2">This section is coming soon.</p>
    </div>
  );
}

export default function ExecutiveITDashboard() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" /></div>}>
      <ExecutiveITDashboardInner />
    </Suspense>
  );
}
