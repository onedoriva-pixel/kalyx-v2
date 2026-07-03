"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, getDoc } from "firebase/firestore";

import {
  Loader2, Plus, Clock, CheckCircle2, Circle, AlertCircle,
  ListTodo, LayoutDashboard, Columns, Map, FileEdit, StickyNote,
  Trash2, Edit, Calendar, User, Eye, EyeOff, X, XCircle, Save, Download, FileSpreadsheet
} from "lucide-react";
import { downloadTasksXLS } from "@/lib/exportXLS";

// Helper to format ISO/date strings
const formatDateStr = (dateStr) => {
  if (!dateStr) return "—";
  const dispDate = new Date(dateStr + "T00:00:00");
  if (isNaN(dispDate)) return dateStr;
  return dispDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
};

// ==================== DASHBOARD VIEW ====================
function DashboardView({ tasks, plans, logs }) {
  const total = tasks.length;
  const done = tasks.filter(t => t.status === "done").length;
  const inProgress = tasks.filter(t => t.status === "in_progress").length;
  const todo = tasks.filter(t => t.status === "todo").length;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-primary">Dashboard</h2>
        <p className="text-on-surface-variant text-sm mt-1">Your task and work overview</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Tasks", value: total, color: "from-indigo-500 to-indigo-700" },
          { label: "To Do", value: todo, color: "from-slate-500 to-slate-700" },
          { label: "In Progress", value: inProgress, color: "from-amber-500 to-amber-700" },
          { label: "Done", value: done, color: "from-emerald-500 to-emerald-700" },
        ].map((s, i) => (
          <div key={i} className={`bg-gradient-to-br ${s.color} text-white rounded-2xl p-5 shadow-lg`}>
            <p className="text-4xl font-bold">{s.value}</p>
            <p className="text-xs text-white/70 font-semibold mt-1 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6">
          <h3 className="font-bold text-primary mb-4 flex items-center gap-2">
            <Columns className="w-5 h-5 text-indigo-500" /> Recent Tasks
          </h3>
          <div className="space-y-3">
            {tasks.slice(0, 5).map(task => (
              <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container transition-colors">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${task.status === "done" ? "bg-emerald-500" : task.status === "in_progress" ? "bg-amber-500" : "bg-slate-400"}`}></div>
                <p className="font-semibold text-sm flex-1 truncate">{task.title || "Untitled Task"}</p>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${task.status === "done" ? "bg-emerald-100 text-emerald-700" : task.status === "in_progress" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"}`}>{task.status}</span>
              </div>
            ))}
            {tasks.length === 0 && <p className="text-on-surface-variant text-sm text-center py-6">No tasks yet</p>}
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6">
          <h3 className="font-bold text-primary mb-4 flex items-center gap-2">
            <Map className="w-5 h-5 text-emerald-500" /> Current Roadmaps & Plans
          </h3>
          <div className="space-y-3">
            {plans.slice(0, 3).map(plan => {
              const ms = plan.milestones || [];
              const completed = ms.filter(m => m.status === "completed").length;
              const pct = ms.length > 0 ? Math.round((completed / ms.length) * 100) : 0;
              return (
                <div key={plan.id} className="p-3 border border-outline-variant rounded-xl">
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-semibold text-sm truncate">{plan.title}</p>
                    <span className="text-xs text-on-surface-variant">{completed}/{ms.length}</span>
                  </div>
                  <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full transition-all duration-300" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
            {plans.length === 0 && <p className="text-on-surface-variant text-sm text-center py-6">No plans yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== BOARD VIEW ====================
function BoardView({ tasks, onUpdateStatus }) {
  const columns = [
    { id: "todo", title: "To Do", icon: <Circle className="w-5 h-5 text-slate-400" /> },
    { id: "in_progress", title: "In Progress", icon: <Clock className="w-5 h-5 text-amber-500" /> },
    { id: "done", title: "Done", icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" /> }
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-primary">Board</h2>
        <p className="text-sm text-on-surface-variant mt-1">Drag tasks between columns</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map(col => (
          <div key={col.id} className="bg-surface-container rounded-2xl p-4"
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const id = e.dataTransfer.getData("taskId"); if (id) onUpdateStatus(id, col.id); }}>
            <div className="flex items-center gap-2 mb-4 px-2">
              {col.icon}
              <h3 className="font-semibold text-lg">{col.title}</h3>
              <span className="ml-auto bg-surface-container-high text-on-surface-variant text-xs font-bold px-2 py-1 rounded-full">
                {tasks.filter(t => t.status === col.id).length}
              </span>
            </div>
            <div className="space-y-3 min-h-[100px]">
              {tasks.filter(t => t.status === col.id).map(task => (
                <div key={task.id} draggable onDragStart={e => e.dataTransfer.setData("taskId", task.id)}
                  className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/30 hover:shadow-md transition-all">
                  <h4 className="font-bold text-sm mb-1 hover:text-primary">{task.title || "Untitled"}</h4>
                  {task.desc && <p className="text-xs text-on-surface-variant line-clamp-2 mb-2">{task.desc}</p>}
                  <span className="text-xs font-bold bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-md">{task.priority || "Medium"}</span>
                </div>
              ))}
              {tasks.filter(t => t.status === col.id).length === 0 && (
                <div className="border-2 border-dashed border-outline-variant rounded-xl h-20 flex items-center justify-center">
                  <p className="text-xs text-on-surface-variant/40 font-semibold">Drop here</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== ALL TASKS VIEW ====================
function AllTasksView({ tasks, onUpdateStatus }) {
  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">All Tasks</h2>
          <p className="text-sm text-on-surface-variant mt-1">Full list of assigned tasks</p>
        </div>
        {tasks.length > 0 && (
          <button onClick={() => downloadTasksXLS(tasks)}
            className="flex items-center gap-2 border border-outline-variant text-on-surface-variant px-4 py-2 rounded-xl font-semibold hover:bg-surface-container transition-colors text-sm">
            <FileSpreadsheet className="w-4 h-4" /> Export XLS
          </button>
        )}
      </div>
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-container text-on-surface-variant text-xs uppercase font-semibold">
            <tr>
              <th className="px-6 py-3">Task</th>
              <th className="px-6 py-3">Priority</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Assigned By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {tasks.map(task => (
              <tr key={task.id} className="hover:bg-surface-container-low transition-colors">
                <td className="px-6 py-4 font-semibold">{task.title || "Untitled Task"}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-xs font-bold rounded-md bg-secondary-container text-on-secondary-container">
                    {task.priority || "Medium"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <select className="text-xs font-bold bg-transparent border border-outline-variant rounded-lg px-2 py-1 focus:outline-none"
                    value={task.status || "todo"} onChange={e => onUpdateStatus(task.id, e.target.value)}>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </td>
                <td className="px-6 py-4 text-on-surface-variant">{task.assignedBy || "—"}</td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan="4" className="px-6 py-10 text-center text-on-surface-variant">No tasks assigned to you</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== PLANNER VIEW ====================
function PlannerView({ plans, onUpdatePlans }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("not_started");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Milestone fields
  const [msModalOpen, setMsModalOpen] = useState(false);
  const [msTitle, setMsTitle] = useState("");
  const [msDesc, setMsDesc] = useState("");
  const [msDueDate, setMsDueDate] = useState("");
  const [editingMilestoneId, setEditingMilestoneId] = useState(null);

  const openNewModal = () => {
    setIsEditing(false);
    setTitle("");
    setDescription("");
    setStatus("not_started");
    setStartDate("");
    setEndDate("");
    setModalOpen(true);
  };

  const openEditModal = (plan) => {
    setIsEditing(true);
    setSelectedPlan(plan);
    setTitle(plan.title);
    setDescription(plan.description || "");
    setStatus(plan.status || "not_started");
    setStartDate(plan.startDate || "");
    setEndDate(plan.endDate || "");
    setModalOpen(true);
  };

  const handleSavePlan = () => {
    if (!title.trim()) { alert("Please fill in the title."); return; }
    const now = new Date().toISOString();
    let updated;

    if (isEditing) {
      updated = plans.map(p => p.id === selectedPlan.id ? {
        ...p,
        title,
        description,
        status,
        startDate,
        endDate,
        updatedAt: now
      } : p);
    } else {
      updated = [...plans, {
        id: Date.now(),
        title,
        description,
        status,
        startDate,
        endDate,
        milestones: [],
        createdAt: now,
        updatedAt: now
      }];
    }

    onUpdatePlans(updated);
    setModalOpen(false);
    setSelectedPlan(null);
  };

  const handleDeletePlan = (id) => {
    if (!confirm("Are you sure you want to delete this plan?")) return;
    const updated = plans.filter(p => p.id !== id);
    onUpdatePlans(updated);
    setSelectedPlan(null);
  };

  // Milestone Actions
  const handleToggleMilestone = (planId, msId) => {
    const updated = plans.map(p => {
      if (p.id === planId) {
        const updatedMs = p.milestones.map(m => m.id === msId ? {
          ...m,
          status: m.status === "completed" ? "pending" : "completed"
        } : m);
        return { ...p, milestones: updatedMs, updatedAt: new Date().toISOString() };
      }
      return p;
    });
    onUpdatePlans(updated);
    // Refresh modal details
    const active = updated.find(p => p.id === planId);
    if (active) setSelectedPlan(active);
  };

  const handleSaveMilestone = () => {
    if (!msTitle.trim()) { alert("Milestone title required."); return; }
    const updated = plans.map(p => {
      if (p.id === selectedPlan.id) {
        let updatedMs;
        if (editingMilestoneId) {
          updatedMs = p.milestones.map(m => m.id === editingMilestoneId ? {
            ...m,
            title: msTitle,
            description: msDesc,
            dueDate: msDueDate
          } : m);
        } else {
          updatedMs = [...(p.milestones || []), {
            id: Date.now(),
            title: msTitle,
            description: msDesc,
            dueDate: msDueDate,
            status: "pending"
          }];
        }
        return { ...p, milestones: updatedMs, updatedAt: new Date().toISOString() };
      }
      return p;
    });

    onUpdatePlans(updated);
    setMsModalOpen(false);
    // Refresh parent view details
    const active = updated.find(p => p.id === selectedPlan.id);
    if (active) setSelectedPlan(active);
  };

  const handleDeleteMilestone = (planId, msId) => {
    if (!confirm("Delete this milestone?")) return;
    const updated = plans.map(p => {
      if (p.id === planId) {
        return {
          ...p,
          milestones: p.milestones.filter(m => m.id !== msId),
          updatedAt: new Date().toISOString()
        };
      }
      return p;
    });
    onUpdatePlans(updated);
    const active = updated.find(p => p.id === planId);
    if (active) setSelectedPlan(active);
  };

  const openNewMilestone = () => {
    setEditingMilestoneId(null);
    setMsTitle("");
    setMsDesc("");
    setMsDueDate("");
    setMsModalOpen(true);
  };

  const openEditMilestone = (ms) => {
    setEditingMilestoneId(ms.id);
    setMsTitle(ms.title);
    setMsDesc(ms.description || "");
    setMsDueDate(ms.dueDate || "");
    setMsModalOpen(true);
  };

  const planTotal = plans.length;
  const planInProgress = plans.filter(p => p.status === "in_progress").length;
  const planCompleted = plans.filter(p => p.status === "completed").length;
  const planOnHold = plans.filter(p => p.status === "on_hold").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primary">Planner & Roadmap</h2>
          <p className="text-sm text-on-surface-variant">Track strategy milestones and plan roadmaps</p>
        </div>
        <button onClick={openNewModal} className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl font-semibold hover:opacity-90 shadow-sm transition-all active:scale-[0.98]">
          <Plus className="w-5 h-5" /> New Plan
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Plans", value: planTotal },
          { label: "In Progress", value: planInProgress, textColor: "text-amber-600" },
          { label: "Completed", value: planCompleted, textColor: "text-emerald-600" },
          { label: "On Hold", value: planOnHold, textColor: "text-rose-600" },
        ].map((s, i) => (
          <div key={i} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-on-surface-variant">{s.label}</p>
            <p className={`text-3xl font-bold mt-1.5 ${s.textColor || "text-primary"}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {plans.map(p => {
          const ms = p.milestones || [];
          const totalMs = ms.length;
          const completedMs = ms.filter(m => m.status === "completed").length;
          const pct = totalMs > 0 ? Math.round((completedMs / totalMs) * 100) : 0;
          const dateRange = p.startDate ? `${p.startDate} → ${p.endDate || "—"}` : "";

          return (
            <div key={p.id} onClick={() => setSelectedPlan(p)}
              className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm hover:border-primary/30 hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h4 className="font-bold text-primary text-lg">{p.title}</h4>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    p.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                    p.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                    p.status === "on_hold" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"
                  }`}>
                    {p.status?.replace("_", " ")}
                  </span>
                </div>
                {p.description && <p className="text-sm text-on-surface-variant mt-2 line-clamp-2">{p.description}</p>}
                {dateRange && <p className="text-xs text-on-surface-variant/80 mt-2 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {dateRange}</p>}
              </div>

              <div className="flex items-center gap-6 md:gap-8 flex-shrink-0">
                <div className="text-center">
                  <p className="text-xl font-bold text-primary">{completedMs}/{totalMs}</p>
                  <p className="text-xs font-semibold text-on-surface-variant mt-0.5">Milestones</p>
                </div>
                <div className="w-32">
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Progress</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? "bg-emerald-500" : "bg-indigo-500"}`} style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {plans.length === 0 && (
          <div className="border border-dashed border-outline-variant rounded-2xl py-12 flex flex-col items-center justify-center text-center">
            <Map className="w-12 h-12 text-on-surface-variant/30 mb-3" />
            <p className="font-semibold text-on-surface-variant">No plans or roadmaps yet</p>
            <p className="text-xs text-on-surface-variant/70 mt-1">Plan your future milestones and roadmap here.</p>
          </div>
        )}
      </div>

      {/* PLAN FORM MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-xl font-bold text-primary">{isEditing ? "Edit Plan" : "New Plan"}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1.5">Plan Title</label>
                <input value={title} onChange={e => setTitle(e.target.value)} type="text" className="w-full bg-surface-container border border-outline-variant rounded-xl py-2 px-4 focus:outline-none" placeholder="Enter plan title" />
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1.5">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full bg-surface-container border border-outline-variant rounded-xl py-2 px-4 focus:outline-none" placeholder="Enter details" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-1.5">Start Date</label>
                  <input value={startDate} onChange={e => setStartDate(e.target.value)} type="date" className="w-full bg-surface-container border border-outline-variant rounded-xl py-2 px-4 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant block mb-1.5">End Date</label>
                  <input value={endDate} onChange={e => setEndDate(e.target.value)} type="date" className="w-full bg-surface-container border border-outline-variant rounded-xl py-2 px-4 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1.5">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-surface-container border border-outline-variant rounded-xl py-2 px-4 focus:outline-none">
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-3">
              <button onClick={() => setModalOpen(false)} className="flex-1 bg-surface-container hover:bg-surface-container-high py-2.5 rounded-xl font-bold transition-all text-sm">Cancel</button>
              <button onClick={handleSavePlan} className="flex-1 bg-primary text-on-primary py-2.5 rounded-xl font-bold transition-all text-sm">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* PLAN DETAILS & MILESTONES MODAL */}
      {selectedPlan && !modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto flex flex-col">
            <div className="p-6 border-b border-outline-variant flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-xl font-bold text-primary">{selectedPlan.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    selectedPlan.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                    selectedPlan.status === "in_progress" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"
                  }`}>
                    {selectedPlan.status?.replace("_", " ")}
                  </span>
                </div>
                {selectedPlan.description && <p className="text-xs text-on-surface-variant mt-2">{selectedPlan.description}</p>}
                {(selectedPlan.startDate || selectedPlan.endDate) && (
                  <p className="text-[11px] text-on-surface-variant/80 mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {selectedPlan.startDate} → {selectedPlan.endDate || "—"}
                  </p>
                )}
              </div>
              <button onClick={() => setSelectedPlan(null)} className="p-1 hover:bg-surface-container rounded-lg">
                <XCircle className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>

            <div className="p-6 space-y-4 flex-1">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-sm text-primary">Roadmap Milestones</h4>
                <button onClick={openNewMilestone} className="text-xs font-bold text-primary flex items-center gap-1 hover:underline">
                  <Plus className="w-3.5 h-3.5" /> Add Milestone
                </button>
              </div>

              <div className="divide-y divide-outline-variant space-y-3">
                {selectedPlan.milestones?.map(m => {
                  const isDone = m.status === "completed";
                  return (
                    <div key={m.id} className={`flex items-start gap-3 py-3 ${isDone ? "opacity-70" : ""}`}>
                      <button onClick={() => handleToggleMilestone(selectedPlan.id, m.id)} className="mt-0.5">
                        {isDone ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5 text-slate-400" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`font-semibold text-sm ${isDone ? "line-through text-on-surface-variant" : "text-primary"}`}>{m.title}</p>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isDone ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>{m.status}</span>
                        </div>
                        {m.description && <p className="text-xs text-on-surface-variant mt-1">{m.description}</p>}
                        {m.dueDate && <p className="text-[10px] text-on-surface-variant/80 mt-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Due {m.dueDate}</p>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => openEditMilestone(m)} className="p-1 hover:bg-surface-container rounded text-on-surface-variant" title="Edit"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteMilestone(selectedPlan.id, m.id)} className="p-1 hover:bg-rose-50 text-rose-600 rounded" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  );
                })}
                {(!selectedPlan.milestones || selectedPlan.milestones.length === 0) && (
                  <p className="text-xs text-on-surface-variant/60 text-center py-6">No milestones scheduled</p>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-outline-variant bg-surface-container flex gap-3">
              <button onClick={() => openEditModal(selectedPlan)} className="flex-1 bg-white hover:bg-surface-container-high py-2.5 rounded-xl font-bold transition-all text-xs border border-outline flex items-center justify-center gap-1.5"><Edit className="w-4 h-4" /> Edit Plan</button>
              <button onClick={() => handleDeletePlan(selectedPlan.id)} className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 py-2.5 rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-1.5"><Trash2 className="w-4 h-4" /> Delete Plan</button>
            </div>
          </div>
        </div>
      )}

      {/* MILESTONE FORM MODAL */}
      {msModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h4 className="text-lg font-bold text-primary">{editingMilestoneId ? "Edit Milestone" : "New Milestone"}</h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1.5">Milestone Title</label>
                <input value={msTitle} onChange={e => setMsTitle(e.target.value)} type="text" className="w-full bg-surface-container border border-outline-variant rounded-xl py-2 px-4 focus:outline-none" placeholder="Enter title" />
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1.5">Description</label>
                <textarea value={msDesc} onChange={e => setMsDesc(e.target.value)} rows={2} className="w-full bg-surface-container border border-outline-variant rounded-xl py-2 px-4 focus:outline-none" placeholder="Enter details" />
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1.5">Due Date</label>
                <input value={msDueDate} onChange={e => setMsDueDate(e.target.value)} type="date" className="w-full bg-surface-container border border-outline-variant rounded-xl py-2 px-4 focus:outline-none" />
              </div>
            </div>
            <div className="flex gap-3 pt-3">
              <button onClick={() => setMsModalOpen(false)} className="flex-1 bg-surface-container hover:bg-surface-container-high py-2 rounded-xl font-bold transition-all text-xs">Cancel</button>
              <button onClick={handleSaveMilestone} className="flex-1 bg-primary text-on-primary py-2 rounded-xl font-bold transition-all text-xs">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== DAILY LOG VIEW ====================
function DailyLogView({ logs, onUpdateLogs }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [dateFilter, setDateFilter] = useState("");
  const [viewingLog, setViewingLog] = useState(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [date, setDate] = useState("");

  const todayStr = new Date().toISOString().slice(0, 10);

  const openNewModal = () => {
    setIsEditing(false);
    setTitle("");
    setDetails("");
    setDate(todayStr);
    setModalOpen(true);
  };

  const openViewModal = (log) => {
    setViewingLog(log);
  };

  const openEditModal = (log) => {
    setIsEditing(true);
    setSelectedLog(log);
    setTitle(log.title);
    setDetails(log.details || "");
    setDate(log.date || todayStr);
    setModalOpen(true);
  };

  const handleSaveLog = () => {
    if (!title.trim() || !date) { alert("Please complete Title and Date fields."); return; }
    let updated;
    const now = new Date().toISOString();

    if (isEditing) {
      updated = logs.map(l => l.id === selectedLog.id ? {
        ...l,
        title,
        details,
        date,
        updatedAt: now
      } : l);
    } else {
      updated = [...logs, {
        id: Date.now(),
        title,
        details,
        date,
        createdAt: now,
        updatedAt: now
      }];
    }

    onUpdateLogs(updated);
    setModalOpen(false);
    setSelectedLog(null);
  };

  const handleDeleteLog = (id) => {
    if (!confirm("Are you sure you want to delete this log entry?")) return;
    const updated = logs.filter(l => l.id !== id);
    onUpdateLogs(updated);
  };

  const handleExportCSV = () => {
    if (logs.length === 0) { alert("No logs to export."); return; }
    const headers = ["Date", "Title", "Details", "Created At"];
    const rows = logs.map(l => [l.date, l.title, l.details || "", l.createdAt]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `KALYX_Daily_Accomplishments_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Stats calculation
  const totalEntries = logs.length;
  const todayEntries = logs.filter(l => l.date === todayStr).length;

  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  const thisMonthStr = thisMonthStart.toISOString().slice(0, 10);
  const monthEntries = logs.filter(l => l.date >= thisMonthStr).length;

  // Filter logs
  const filteredLogs = dateFilter ? logs.filter(l => l.date === dateFilter) : logs;
  // Sort logs by date desc, then by createdAt desc
  const sortedLogs = [...filteredLogs].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.createdAt.localeCompare(a.createdAt);
  });

  // Group by date
  const groupedLogs = {};
  sortedLogs.forEach(log => {
    if (!groupedLogs[log.date]) groupedLogs[log.date] = [];
    groupedLogs[log.date].push(log);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primary">Daily Job Accomplishments</h2>
          <p className="text-sm text-on-surface-variant">Log and track daily workflow tasks and accomplishments</p>
        </div>
        <div className="flex gap-2.5">
          <button onClick={handleExportCSV} className="flex items-center gap-1.5 border border-outline-variant text-on-surface-variant hover:bg-surface-container px-4 py-2.5 rounded-xl font-semibold transition-all">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={openNewModal} className="flex items-center gap-1.5 bg-primary text-on-primary px-5 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-all active:scale-[0.98]">
            <Plus className="w-4 h-4" /> New Entry
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Today's Entries", value: todayEntries },
          { label: "This Month", value: monthEntries, textColor: "text-indigo-600" },
          { label: "Total Entries", value: totalEntries, textColor: "text-emerald-600" }
        ].map((s, i) => (
          <div key={i} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-on-surface-variant">{s.label}</p>
            <p className={`text-3xl font-bold mt-1.5 ${s.textColor || "text-primary"}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-bold text-primary">Accomplishment Stream</h3>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-on-surface-variant">Filter Date:</label>
            <input value={dateFilter} onChange={e => setDateFilter(e.target.value)} type="date" className="bg-surface-container border border-outline-variant rounded-lg text-xs py-1 px-2.5 focus:outline-none" />
          </div>
        </div>

        <div className="space-y-4">
          {Object.keys(groupedLogs).map(dateKey => (
            <div key={dateKey} className="space-y-2">
              <div className="flex items-center gap-3 pt-2">
                <div className="h-px flex-1 bg-outline-variant"></div>
                <span className="text-xs font-semibold text-on-surface-variant bg-surface-container-high px-3 py-1 rounded-full">
                  {formatDateStr(dateKey)}
                </span>
                <div className="h-px flex-1 bg-outline-variant"></div>
              </div>

              <div className="space-y-3">
                {groupedLogs[dateKey].map(log => (
                  <div key={log.id} className="p-4 border border-outline-variant rounded-xl flex items-start justify-between gap-4 hover:border-primary/20 transition-colors">
                    <div>
                      <h4 className="font-bold text-primary">{log.title}</h4>
                      {log.details && <p className="text-sm text-on-surface-variant mt-1.5 whitespace-pre-wrap">{log.details}</p>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => openViewModal(log)} className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => openEditModal(log)} className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteLog(log.id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {sortedLogs.length === 0 && (
            <div className="text-center py-12">
              <FileEdit className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-3" />
              <p className="font-semibold text-on-surface-variant">No entry logs found</p>
              <p className="text-xs text-on-surface-variant/70 mt-1">Log your accomplishments at the end of every work shift.</p>
            </div>
          )}
        </div>
      </div>

      {/* LOG ENTRY FORM MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-xl font-bold text-primary">{isEditing ? "Edit Log Entry" : "New Log Entry"}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1.5">Accomplishment Title</label>
                <input value={title} onChange={e => setTitle(e.target.value)} type="text" className="w-full bg-surface-container border border-outline-variant rounded-xl py-2 px-4 focus:outline-none" placeholder="What did you work on?" />
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1.5">Log Date</label>
                <input value={date} onChange={e => setDate(e.target.value)} type="date" className="w-full bg-surface-container border border-outline-variant rounded-xl py-2 px-4 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant block mb-1.5">Detailed Summary / Details</label>
                <textarea value={details} onChange={e => setDetails(e.target.value)} rows={4} className="w-full bg-surface-container border border-outline-variant rounded-xl py-2 px-4 focus:outline-none" placeholder="Provide extra description if needed" />
              </div>
            </div>
            <div className="flex gap-3 pt-3">
              <button onClick={() => setModalOpen(false)} className="flex-1 bg-surface-container hover:bg-surface-container-high py-2.5 rounded-xl font-bold transition-all text-sm">Cancel</button>
              <button onClick={handleSaveLog} className="flex-1 bg-primary text-on-primary py-2.5 rounded-xl font-bold transition-all text-sm">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW DETAIL MODAL */}
      {viewingLog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-primary">{viewingLog.title}</h3>
              <button onClick={() => setViewingLog(null)} className="p-2 rounded-xl hover:bg-surface-container transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <span className="text-xs font-bold text-on-surface-variant block mb-1">Date</span>
                <p className="text-sm">{viewingLog.date ? new Date(viewingLog.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "—"}</p>
              </div>
              <div>
                <span className="text-xs font-bold text-on-surface-variant block mb-1">Details</span>
                <p className="text-sm whitespace-pre-wrap text-on-surface">{viewingLog.details || "No additional details."}</p>
              </div>
              <div>
                <span className="text-xs font-bold text-on-surface-variant block mb-1">Created</span>
                <p className="text-sm text-on-surface-variant">{viewingLog.createdAt ? new Date(viewingLog.createdAt).toLocaleString("en-PH") : "—"}</p>
              </div>
              {viewingLog.updatedAt && viewingLog.updatedAt !== viewingLog.createdAt && (
                <div>
                  <span className="text-xs font-bold text-on-surface-variant block mb-1">Last Updated</span>
                  <p className="text-sm text-on-surface-variant">{new Date(viewingLog.updatedAt).toLocaleString("en-PH")}</p>
                </div>
              )}
            </div>
            <div className="flex pt-2">
              <button onClick={() => setViewingLog(null)} className="w-full border border-outline-variant text-on-surface-variant py-2.5 rounded-xl font-semibold hover:bg-surface-container transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== NOTES VIEW ====================
function NotesView({ text, onUpdateText }) {
  const [saving, setSaving] = useState(false);
  const [internalText, setInternalText] = useState(text);
  const debounceRef = useRef(null);

  const handleTextChange = (val) => {
    setInternalText(val);
    setSaving(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onUpdateText(val);
      setSaving(false);
    }, 800);
  };

  const handleClear = () => {
    if (!confirm("Clear all notes?")) return;
    setInternalText("");
    onUpdateText("");
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-primary">Scratchpad Notes</h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {saving ? "Saving changes..." : "Auto-saved in Firestore"}
          </p>
        </div>
        <button onClick={handleClear} className="text-xs font-bold text-rose-600 hover:underline">
          Clear Notes
        </button>
      </div>

      <div className="flex-1 min-h-[300px]">
        <textarea
          value={internalText}
          onChange={e => handleTextChange(e.target.value)}
          className="w-full h-full min-h-[350px] bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 focus:outline-none font-mono text-sm leading-relaxed"
          placeholder="Jot down notes, task titles, scratch plans..."
        />
      </div>
    </div>
  );
}

// ==================== WRAPPER ====================
function ExecutiveTaskBoardInner() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") || "dashboard";

  const [tasks, setTasks] = useState([]);
  const [plans, setPlans] = useState([]);
  const [logs, setLogs] = useState([]);
  const [notes, setNotes] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Listen to shared tasks assigned to this user
    const qShared = query(collection(db, "shared_tasks"), where("assignedToUid", "==", user.uid));
    const unsubShared = onSnapshot(qShared, (snapshot) => {
      const fetched = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        fetched.push({ id: docSnap.id, ...data.task, status: data.status || "todo", assignedBy: data.assignedByUsername });
      });
      setTasks(fetched);
    }, () => { setError("Failed to sync shared tasks."); });

    // Listen to user-specific userdata document for plans, accomplishments, notes
    const userDocRef = doc(db, "userdata", user.uid);
    const unsubUserDoc = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data().data || {};
        // Merge legacy keys for logs
        let mergedLogs = userData.dailylog || [];
        ["daily_log", "accomplishments", "log_entries"].forEach(name => {
          if (Array.isArray(userData[name])) {
            const existingIds = new Set(mergedLogs.map(l => l.id));
            const newItems = userData[name].filter(l => !existingIds.has(l.id));
            mergedLogs = [...mergedLogs, ...newItems];
          }
        });
        setPlans(userData.plans || []);
        setLogs(mergedLogs);
        setNotes(userData._scratchpad || "");
      } else {
        // Init user doc if missing
        setDoc(userDocRef, { data: {} });
      }
      setLoading(false);
    }, () => {
      setError("Failed to sync user configs.");
      setLoading(false);
    });

    return () => {
      unsubShared();
      unsubUserDoc();
    };
  }, []);

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      await updateDoc(doc(db, "shared_tasks", taskId), { 
        status: newStatus, 
        updatedAt: new Date().toISOString() 
      });
    } catch (err) { alert("Failed to update status."); }
  };

  const handleUpdatePlans = async (updatedPlans) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const docRef = doc(db, "userdata", user.uid);
      const docSnap = await getDoc(docRef);
      const currentData = docSnap.exists() ? (docSnap.data().data || {}) : {};
      await setDoc(docRef, {
        data: {
          ...currentData,
          plans: updatedPlans
        },
        updated_at: new Date().toISOString()
      });
    } catch (err) { alert("Failed to save plans."); }
  };

  const handleUpdateLogs = async (updatedLogs) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const docRef = doc(db, "userdata", user.uid);
      const docSnap = await getDoc(docRef);
      const currentData = docSnap.exists() ? (docSnap.data().data || {}) : {};
      // Clean up legacy log keys
      const cleaned = { ...currentData };
      ["daily_log", "accomplishments", "log_entries"].forEach(name => delete cleaned[name]);
      await setDoc(docRef, {
        data: {
          ...cleaned,
          dailylog: updatedLogs
        },
        updated_at: new Date().toISOString()
      });
    } catch (err) { alert("Failed to save accomplishments."); }
  };

  const handleUpdateNotes = async (updatedNotes) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const docRef = doc(db, "userdata", user.uid);
      const docSnap = await getDoc(docRef);
      const currentData = docSnap.exists() ? (docSnap.data().data || {}) : {};
      await setDoc(docRef, {
        data: {
          ...currentData,
          _scratchpad: updatedNotes
        },
        updated_at: new Date().toISOString()
      });
    } catch (err) { console.error("Auto-save failed."); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (error) return (
    <div className="bg-error-container text-on-error-container p-4 rounded-xl flex items-center gap-3">
      <AlertCircle className="w-5 h-5" /><p className="text-sm font-semibold">{error}</p>
    </div>
  );

  switch (view) {
    case "board": 
      return <BoardView tasks={tasks} onUpdateStatus={handleUpdateTaskStatus} />;
    case "all-tasks": 
      return <AllTasksView tasks={tasks} onUpdateStatus={handleUpdateTaskStatus} />;
    case "planner": 
      return <PlannerView plans={plans} onUpdatePlans={handleUpdatePlans} />;
    case "daily-log": 
      return <DailyLogView logs={logs} onUpdateLogs={handleUpdateLogs} />;
    case "notes": 
      return <NotesView text={notes} onUpdateText={handleUpdateNotes} />;
    default: 
      return <DashboardView tasks={tasks} plans={plans} logs={logs} />;
  }
}

export default function ExecutiveTaskBoard() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" /></div>}>
      <ExecutiveTaskBoardInner />
    </Suspense>
  );
}
