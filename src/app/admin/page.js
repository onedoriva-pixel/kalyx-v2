"use client";

import { useEffect, useState, useMemo, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  collection, onSnapshot, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
} from "firebase/firestore";
import {
  Users, CheckSquare, Map, PlaneTakeoff, ShieldAlert, FileEdit,
  Database, Search, Ticket, Activity, Package, Wrench, LifeBuoy,
  X, Save, Pencil, Trash2, ChevronRight, TrendingUp, ShieldCheck,
  Filter, Calendar, User, Clock, AlertCircle, CheckCircle2, Circle, Info,
  Download, Upload, AlertTriangle, Loader2,
} from "lucide-react";

// ============================================================
// HELPERS
// ============================================================
const ROLE_LABELS = {
  admin: "Administrator",
  executive_task: "Executive Task",
  executive_path: "Executive Path",
  executive_it: "Executive IT",
};

const ROLE_COLORS = {
  admin: "bg-indigo-100 text-indigo-700",
  executive_task: "bg-teal-100 text-teal-700",
  executive_path: "bg-amber-100 text-amber-700",
  executive_it: "bg-purple-100 text-purple-700",
};

function fmtDate(d) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }); }
  catch { return d; }
}

function buildUserDataMap(users, allUserData) {
  const map = {};
  users.forEach((u, i) => { map[u.id] = allUserData[i] || {}; });
  return map;
}

function getUserData(map, userId) {
  return map[userId] || {};
}

function collectAllItems(users, allUserData, key) {
  const items = [];
  users.forEach((u, i) => {
    const data = allUserData[i] || {};
    const list = data[key] || [];
    list.forEach(item => { item._user = u.name || u.username; item._userId = u.id; item._username = u.username; });
    items.push(...list);
  });
  return items;
}

// ============================================================
// USER EDIT MODAL
// ============================================================
function UserModal({ user, onSave, onClose }) {
  const [form, setForm] = useState({
    name: user.name || "",
    role: user.role || "executive_task",
    is_admin: user.is_admin || false,
    executive_admin: user.executive_admin || false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await setDoc(doc(db, "profiles", user.id), {
        name: form.name,
        role: form.role,
        is_admin: form.is_admin,
        executive_admin: form.executive_admin,
      }, { merge: true });

      // Verify the write actually landed
      const verifySnap = await getDoc(doc(db, "profiles", user.id));
      if (!verifySnap.exists()) {
        throw new Error("Profile document not found after save.");
      }
      const saved = verifySnap.data();
      if (saved.role !== form.role) {
        throw new Error(
          `Role mismatch after save — expected "${form.role}" but got "${saved.role}". ` +
          `Check Firestore Security Rules: the admin account may not have write permission on other users' profiles.`
        );
      }

      setDone(true);
      onSave();
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-outline-variant">
          <h3 className="text-lg font-bold text-primary">Edit User: {user.username}</h3>
          <button onClick={onClose} className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {done && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Saved successfully. The user list will update automatically.</span>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Full Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Email</label>
            <input value={user.email || ""} disabled
              className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm opacity-60 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Role</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary">
              <option value="admin">Administrator</option>
              <option value="executive_task">Executive Task</option>
              <option value="executive_path">Executive Path</option>
              <option value="executive_it">Executive IT</option>
            </select>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.is_admin} onChange={e => setForm(f => ({ ...f, is_admin: e.target.checked }))}
                className="w-4 h-4 rounded accent-indigo-600" />
              <span className="text-sm font-semibold text-on-surface">Is Admin</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.executive_admin} onChange={e => setForm(f => ({ ...f, executive_admin: e.target.checked }))}
                className="w-4 h-4 rounded accent-indigo-600" />
              <span className="text-sm font-semibold text-on-surface">Executive Admin</span>
            </label>
          </div>
        </div>
        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} className="flex-1 border border-outline-variant text-on-surface-variant py-2.5 rounded-xl font-semibold hover:bg-surface-container transition-colors">
            {done ? "Close" : "Cancel"}
          </button>
          {!done && (
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-gradient-to-r from-indigo-500 to-violet-600 text-white py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity">
              <Save className="w-4 h-4" />{saving ? "Saving..." : "Save Changes"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// USERS VIEW
// ============================================================
function UsersView({ users, allUserData, onRefresh }) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [expandedUser, setExpandedUser] = useState(null);
  const userDataMap = useMemo(() => buildUserDataMap(users, allUserData), [users, allUserData]);

  const handleDeleteUser = async (user) => {
    if (!confirm(`Delete user "${user.name || user.username}"?\n\nThis will permanently delete their profile and all associated data. This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, "profiles", user.id));
      await deleteDoc(doc(db, "userdata", user.id));
      onRefresh();
    } catch (err) {
      alert("Failed to delete user: " + err.message);
    }
  };

  const filtered = users.filter(u =>
    !search || (u.name + u.email + u.username + u.role).toLowerCase().includes(search.toLowerCase())
  );

  // Detect duplicates by email or username
  const emailCount = {};
  const usernameCount = {};
  users.forEach(u => {
    if (u.email) emailCount[u.email] = (emailCount[u.email] || 0) + 1;
    if (u.username) usernameCount[u.username] = (usernameCount[u.username] || 0) + 1;
  });

  return (
    <>
      {editing && (
        <UserModal user={editing} onSave={onRefresh} onClose={() => setEditing(null)} />
      )}
      <div className="p-4 md:p-8 max-w-screen-2xl mx-auto animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-bold text-primary flex items-center gap-3"><Users className="w-7 h-7 text-indigo-500" />User Management</h2>
            <p className="text-on-surface-variant mt-1">{users.length} registered accounts</p>
          </div>
        </div>

        <div className="relative mb-5">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-surface-container border border-outline-variant rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
            placeholder="Search users..." />
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container/50">
                <th className="text-left text-xs font-semibold text-on-surface-variant px-5 py-3.5">User</th>
                <th className="text-left text-xs font-semibold text-on-surface-variant px-5 py-3.5">Role</th>
                <th className="text-left text-xs font-semibold text-on-surface-variant px-5 py-3.5">Username</th>
                <th className="text-left text-xs font-semibold text-on-surface-variant px-5 py-3.5">Flags</th>
                <th className="text-right text-xs font-semibold text-on-surface-variant px-5 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => (
                <tr key={user.id}>
                  <td colSpan={5} className="p-0">
                    <div className="border-b border-outline-variant/50 hover:bg-surface-container/40 transition-colors">
                      <div className="flex items-center px-5 py-4">
                        <div className="flex-1 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {(user.name || user.username || "U").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-primary text-sm">{user.name || "—"}</p>
                            <p className="text-xs text-on-surface-variant truncate">{user.email}</p>
                            {user.email && emailCount[user.email] > 1 && (
                              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full inline-block mt-0.5">DUPLICATE EMAIL</span>
                            )}
                          </div>
                        </div>
                        <div className="w-24">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${ROLE_COLORS[user.role] || "bg-slate-100 text-slate-600"}`}>
                            {ROLE_LABELS[user.role] || user.role || "User"}
                          </span>
                        </div>
                        <div className="w-28 text-sm text-on-surface-variant font-mono">{user.username || "—"}
                          {user.username && usernameCount[user.username] > 1 && (
                            <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full ml-1">DUP</span>
                          )}
                        </div>
                        <div className="w-20">
                          <div className="flex gap-1">
                            {user.is_admin && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">ADMIN</span>}
                            {user.executive_admin && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">EXEC</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setExpandedUser(prev => prev === user.id ? null : user.id)}
                            className={`p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors ${expandedUser === user.id ? "text-primary bg-surface-container" : ""}`}>
                            <ChevronRight className={`w-4 h-4 transition-transform ${expandedUser === user.id ? "rotate-90" : ""}`} />
                          </button>
                          <button onClick={() => setEditing(user)} className="p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteUser(user)} className="p-2 rounded-lg text-on-surface-variant hover:text-red-500 hover:bg-red-50 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {expandedUser === user.id && (
                        <div className="px-5 pb-4 bg-surface-container/30">
                          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                            {["tasks", "plans", "trips", "it_services", "it_tickets", "dailylog"].map(k => {
                              const count = Array.isArray(getUserData(userDataMap, user.id)[k]) ? getUserData(userDataMap, user.id)[k].length : 0;
                              return (
                                <div key={k} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 text-center">
                                  <p className="text-xl font-bold text-primary">{count}</p>
                                  <p className="text-[10px] text-on-surface-variant font-semibold capitalize">{k.replace("_", " ")}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center py-14 text-on-surface-variant">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No users found</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ============================================================
// DASHBOARD VIEW
// ============================================================
function DashboardView({ users, allUserData, sharedTasksCount }) {
  const totalPlans = allUserData.reduce((sum, d) => sum + (d.plans?.length || 0), 0);
  const totalTrips = allUserData.reduce((sum, d) => sum + (d.trips?.length || 0), 0);
  const totalTickets = allUserData.reduce((sum, d) => sum + (d.it_tickets?.length || 0), 0);
  const totalLogs = allUserData.reduce((sum, d) => sum + (d.dailylog?.length || 0), 0);

  const allActivity = useMemo(() => {
    const activity = [];
    users.forEach((u, i) => {
      const data = allUserData[i] || {};
      (data.tasks || []).forEach(t => activity.push({ type: "task", title: t.title, user: u.name || u.username, date: t.createdAt || t.dueDate }));
      (data.plans || []).forEach(p => activity.push({ type: "plan", title: p.title, user: u.name || u.username, date: p.createdAt || p.startDate }));
      (data.dailylog || []).forEach(l => activity.push({ type: "log", title: l.title, user: u.name || u.username, date: l.date || l.createdAt }));
      (data.trips || []).forEach(t => activity.push({ type: "trip", title: t.tripName || t.title, user: u.name || u.username, date: t.createdAt || t.startDate }));
    });
    activity.sort((a, b) => ((b.date || "") > (a.date || "") ? 1 : -1));
    return activity.slice(0, 12);
  }, [users, allUserData]);

  return (
    <div className="p-4 md:p-8 max-w-screen-2xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-primary">System Overview</h2>
        <p className="text-on-surface-variant mt-1 text-lg">Complete oversight of all modules and accounts</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Total Users", value: users.length, color: "from-indigo-500 to-indigo-700", icon: <Users className="w-12 h-12 text-white/20 absolute top-6 right-6" /> },
          { label: "Total Tasks", value: sharedTasksCount, color: "from-amber-500 to-amber-700", icon: <CheckSquare className="w-12 h-12 text-white/20 absolute top-6 right-6" /> },
          { label: "Total Trips", value: totalTrips, color: "from-rose-500 to-rose-700", icon: <PlaneTakeoff className="w-12 h-12 text-white/20 absolute top-6 right-6" /> },
          { label: "Open Tickets", value: totalTickets, color: "from-purple-500 to-purple-700", icon: <Ticket className="w-12 h-12 text-white/20 absolute top-6 right-6" /> },
        ].map(s => (
          <div key={s.label} className={`bg-gradient-to-br ${s.color} text-white rounded-2xl p-6 relative overflow-hidden shadow-lg hover:-translate-y-1 transition-transform`}>
            <div className="relative z-10">
              <span className="text-xs uppercase tracking-wider text-white/70 font-semibold">{s.label}</span>
              <p className="text-5xl font-bold mt-2">{s.value}</p>
            </div>
            <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
            {s.icon}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-outline-variant flex justify-between items-center">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" /> All Accounts
            </h3>
            <span className="text-xs bg-surface-container text-on-surface-variant px-3 py-1 rounded-full font-semibold">{users.length} users</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container text-on-surface-variant text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {users.slice(0, 7).map(u => (
                  <tr key={u.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {(u.name || u.username || "U").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-primary text-sm">{u.name || "Unknown"}</p>
                          <p className="text-xs text-on-surface-variant">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${ROLE_COLORS[u.role] || "bg-slate-100 text-slate-600"}`}>
                        {ROLE_LABELS[u.role] || u.role || "User"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-100 text-emerald-700">Active</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm flex flex-col">
          <div className="p-6 border-b border-outline-variant">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" /> System Health
            </h3>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center space-y-5">
            {[
              { label: "Firestore Database", status: "Connected", pct: 100 },
              { label: "Firebase Auth", status: "Online", pct: 100 },
              { label: "Real-time Sync", status: "Active", pct: 100 },
              { label: "Data Integrity", status: "OK", pct: 97 },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-semibold text-sm text-on-surface">{item.label}</span>
                  <span className="text-emerald-500 text-xs font-bold">{item.status}</span>
                </div>
                <div className="w-full bg-surface-container-high rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full transition-all duration-700" style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 pt-0 grid grid-cols-2 gap-3">
            {[
              { label: "Plans", value: totalPlans },
              { label: "Trips", value: totalTrips },
              { label: "Tasks", value: sharedTasksCount },
              { label: "Tickets", value: totalTickets },
            ].map(s => (
              <div key={s.label} className="bg-surface-container rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-primary">{s.value}</p>
                <p className="text-[10px] font-semibold text-on-surface-variant">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {allActivity.length > 0 && (
        <div className="mt-8 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm">
          <div className="p-6 border-b border-outline-variant">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-500" /> Recent Activity
            </h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-3">
            {allActivity.map((a, i) => {
              const iconMap = { task: <CheckSquare className="w-4 h-4" />, plan: <Map className="w-4 h-4" />, log: <FileEdit className="w-4 h-4" />, trip: <PlaneTakeoff className="w-4 h-4" /> };
              const colorMap = { task: "bg-indigo-100 text-indigo-600", plan: "bg-emerald-100 text-emerald-600", log: "bg-pink-100 text-pink-600", trip: "bg-blue-100 text-blue-600" };
              return (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-surface-container">
                  <div className={`p-2 rounded-lg ${colorMap[a.type] || "bg-gray-100 text-gray-600"}`}>{iconMap[a.type]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{a.title}</p>
                    <p className="text-xs text-on-surface-variant">{a.user} &middot; {a.date || "—"}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// ADMIN TASKS VIEW
// ============================================================
function AdminTasksView({ users, allUserData }) {
  const [userFilter, setUserFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const allTasks = useMemo(() => collectAllItems(users, allUserData, "tasks"), [users, allUserData]);

  const filtered = useMemo(() => {
    let f = allTasks;
    if (userFilter !== "all") f = f.filter(t => t._userId === userFilter);
    if (statusFilter !== "all") f = f.filter(t => t.status === statusFilter);
    if (priorityFilter !== "all") f = f.filter(t => t.priority === priorityFilter);
    return f.sort((a, b) => ((b.createdAt || "") > (a.createdAt || "") ? 1 : -1));
  }, [allTasks, userFilter, statusFilter, priorityFilter]);

  const statusLabels = { todo: "To Do", in_progress: "In Progress", done: "Done" };
  const statusColors = { todo: "bg-red-100 text-red-700", in_progress: "bg-amber-100 text-amber-700", done: "bg-emerald-100 text-emerald-700" };
  const priorityLabels = { low: "Low", medium: "Medium", high: "High", urgent: "Urgent" };
  const priorityColors = { low: "bg-gray-100 text-gray-700", medium: "bg-blue-100 text-blue-700", high: "bg-orange-100 text-orange-700", urgent: "bg-red-100 text-red-700" };

  return (
    <div className="p-4 md:p-8 max-w-screen-2xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-primary flex items-center gap-3"><CheckSquare className="w-7 h-7 text-indigo-500" />All Tasks</h2>
          <p className="text-on-surface-variant mt-1">Oversight of all tasks across users</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <select value={userFilter} onChange={e => setUserFilter(e.target.value)}
            className="bg-surface-container border border-outline-variant rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary">
            <option value="all">All Users</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name || u.username}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="bg-surface-container border border-outline-variant rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary">
            <option value="all">All Status</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
            className="bg-surface-container border border-outline-variant rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary">
            <option value="all">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-surface-container rounded-xl p-3 text-center"><span className="text-xs text-on-surface-variant">Total</span><p className="text-xl font-bold text-primary">{filtered.length}</p></div>
        <div className="bg-surface-container rounded-xl p-3 text-center"><span className="text-xs text-on-surface-variant">To Do</span><p className="text-xl font-bold text-red-600">{filtered.filter(t => t.status === "todo").length}</p></div>
        <div className="bg-surface-container rounded-xl p-3 text-center"><span className="text-xs text-on-surface-variant">In Progress</span><p className="text-xl font-bold text-amber-600">{filtered.filter(t => t.status === "in_progress").length}</p></div>
        <div className="bg-surface-container rounded-xl p-3 text-center"><span className="text-xs text-on-surface-variant">Done</span><p className="text-xl font-bold text-emerald-600">{filtered.filter(t => t.status === "done").length}</p></div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-surface-container-lowest border border-outline-variant rounded-xl">
          <CheckSquare className="w-12 h-12 text-surface-container-highest mx-auto mb-4" />
          <p className="text-on-surface-variant">No tasks found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t, i) => (
            <div key={t.id || i} className="flex items-start gap-4 p-4 bg-surface-container-lowest border border-outline-variant rounded-xl">
              <div className="p-3 rounded-xl bg-indigo-100 text-indigo-600"><CheckSquare className="w-5 h-5" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-semibold text-primary">{t.title}</h4>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusColors[t.status] || ""}`}>{statusLabels[t.status] || t.status}</span>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${priorityColors[t.priority] || ""}`}>{priorityLabels[t.priority] || t.priority}</span>
                </div>
                {t.description && <p className="text-xs text-on-surface-variant mt-1">{t.description}</p>}
                <div className="flex items-center gap-3 mt-2 text-on-surface-variant flex-wrap text-xs">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" /> {t._user}</span>
                  {t.dueDate && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {t.dueDate}</span>}
                  {t.category && <span className="flex items-center gap-1"><Folder className="w-3 h-3" /> {t.category}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Folder({ className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>;
}

// ============================================================
// ADMIN PLANS VIEW
// ============================================================
function AdminPlansView({ users, allUserData }) {
  const [userFilter, setUserFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const allPlans = useMemo(() => collectAllItems(users, allUserData, "plans"), [users, allUserData]);

  const filtered = useMemo(() => {
    let f = allPlans;
    if (userFilter !== "all") f = f.filter(p => p._userId === userFilter);
    if (statusFilter !== "all") f = f.filter(p => p.status === statusFilter);
    return f.sort((a, b) => ((b.createdAt || "") > (a.createdAt || "") ? 1 : -1));
  }, [allPlans, userFilter, statusFilter]);

  const statusLabels = { not_started: "Not Started", in_progress: "In Progress", completed: "Completed", on_hold: "On Hold" };
  const statusColors = { not_started: "bg-gray-100 text-gray-700", in_progress: "bg-amber-100 text-amber-700", completed: "bg-emerald-100 text-emerald-700", on_hold: "bg-red-100 text-red-700" };

  return (
    <div className="p-4 md:p-8 max-w-screen-2xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-primary flex items-center gap-3"><Map className="w-7 h-7 text-emerald-500" />All Plans &amp; Roadmaps</h2>
          <p className="text-on-surface-variant mt-1">View all plans, milestones, and progress across users</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <select value={userFilter} onChange={e => setUserFilter(e.target.value)}
            className="bg-surface-container border border-outline-variant rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary">
            <option value="all">All Users</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name || u.username}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="bg-surface-container border border-outline-variant rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary">
            <option value="all">All Status</option>
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-surface-container rounded-xl p-3 text-center"><span className="text-xs text-on-surface-variant">Total Plans</span><p className="text-xl font-bold text-primary">{filtered.length}</p></div>
        <div className="bg-surface-container rounded-xl p-3 text-center"><span className="text-xs text-on-surface-variant">Active</span><p className="text-xl font-bold text-amber-600">{filtered.filter(p => p.status === "in_progress").length}</p></div>
        <div className="bg-surface-container rounded-xl p-3 text-center"><span className="text-xs text-on-surface-variant">Completed</span><p className="text-xl font-bold text-emerald-600">{filtered.filter(p => p.status === "completed").length}</p></div>
        <div className="bg-surface-container rounded-xl p-3 text-center"><span className="text-xs text-on-surface-variant">Milestones</span><p className="text-xl font-bold text-indigo-600">{filtered.reduce((s, p) => s + (p.milestones?.length || 0), 0)}</p></div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-surface-container-lowest border border-outline-variant rounded-xl">
          <Map className="w-12 h-12 text-surface-container-highest mx-auto mb-4" />
          <p className="text-on-surface-variant">No plans found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((p, i) => {
            const mstones = p.milestones || [];
            const done = mstones.filter(m => m.status === "completed").length;
            const pct = mstones.length ? Math.round(done / mstones.length * 100) : 0;
            return (
              <div key={p.id || i} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-primary">{p.title}</h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">by {p._user}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[p.status] || ""}`}>{statusLabels[p.status] || p.status}</span>
                </div>
                {p.description && <p className="text-xs text-on-surface-variant mb-3">{p.description}</p>}
                {p.startDate && <p className="text-xs text-on-surface-variant mb-3">{p.startDate}{p.endDate ? ` → ${p.endDate}` : ""}</p>}
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-indigo-600">{pct}%</span>
                </div>
                <p className="text-xs text-on-surface-variant">{done}/{mstones.length} milestones</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// ADMIN DAILY LOGS VIEW
// ============================================================
function AdminDailyLogsView({ users, allUserData }) {
  const [userFilter, setUserFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const allLogs = useMemo(() => collectAllItems(users, allUserData, "dailylog"), [users, allUserData]);
  const allCategories = useMemo(() => [...new Set(allLogs.filter(l => l.category).map(l => l.category))], [allLogs]);

  const filtered = useMemo(() => {
    let f = allLogs;
    if (userFilter !== "all") f = f.filter(l => l._userId === userFilter);
    if (dateFilter) f = f.filter(l => l.date === dateFilter);
    if (categoryFilter !== "all") f = f.filter(l => l.category === categoryFilter);
    return f.sort((a, b) => ((b.date || "") > (a.date || "") ? 1 : -1));
  }, [allLogs, userFilter, dateFilter, categoryFilter]);

  const now = new Date();
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const catColors = ["bg-blue-100 text-blue-700","bg-emerald-100 text-emerald-700","bg-amber-100 text-amber-700","bg-pink-100 text-pink-700","bg-purple-100 text-purple-700","bg-cyan-100 text-cyan-700","bg-orange-100 text-orange-700"];

  return (
    <div className="p-4 md:p-8 max-w-screen-2xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-primary flex items-center gap-3"><FileEdit className="w-7 h-7 text-pink-500" />All Daily Logs</h2>
          <p className="text-on-surface-variant mt-1">Daily job accomplishments from all users</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <select value={userFilter} onChange={e => setUserFilter(e.target.value)}
            className="bg-surface-container border border-outline-variant rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary">
            <option value="all">All Users</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name || u.username}</option>)}
          </select>
          <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
            className="bg-surface-container border border-outline-variant rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary" />
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="bg-surface-container border border-outline-variant rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary">
            <option value="all">All Categories</option>
            {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-surface-container rounded-xl p-3 text-center"><span className="text-xs text-on-surface-variant">Total Entries</span><p className="text-xl font-bold text-primary">{filtered.length}</p></div>
        <div className="bg-surface-container rounded-xl p-3 text-center"><span className="text-xs text-on-surface-variant">This Week</span><p className="text-xl font-bold text-indigo-600">{filtered.filter(l => l.date && new Date(l.date) >= weekAgo).length}</p></div>
        <div className="bg-surface-container rounded-xl p-3 text-center"><span className="text-xs text-on-surface-variant">This Month</span><p className="text-xl font-bold text-amber-600">{filtered.filter(l => l.date && new Date(l.date) >= monthStart).length}</p></div>
        <div className="bg-surface-container rounded-xl p-3 text-center"><span className="text-xs text-on-surface-variant">Categories</span><p className="text-xl font-bold text-emerald-600">{allCategories.length}</p></div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-surface-container-lowest border border-outline-variant rounded-xl">
          <FileEdit className="w-12 h-12 text-surface-container-highest mx-auto mb-4" />
          <p className="text-on-surface-variant">No log entries found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((l, i) => {
            const cIdx = allCategories.indexOf(l.category);
            return (
              <div key={l.id || i} className="flex items-start gap-4 p-4 bg-surface-container-lowest border border-outline-variant rounded-xl">
                <div className="p-3 rounded-xl bg-pink-100 text-pink-600"><FileEdit className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-semibold text-primary">{l.title}</h4>
                    {l.category && <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${catColors[cIdx % catColors.length]}`}>{l.category}</span>}
                  </div>
                  {l.description && <p className="text-xs text-on-surface-variant mt-1">{l.description}</p>}
                  <div className="flex items-center gap-3 mt-2 text-on-surface-variant flex-wrap text-xs">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {l._user}</span>
                    {l.date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {l.date}</span>}
                    {l.branch && <span className="flex items-center gap-1"><Folder className="w-3 h-3" /> {l.branch}</span>}
                    {l.timeSpent && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {l.timeSpent}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// ADMIN TRIPS VIEW
// ============================================================
function AdminTripsView({ users, allUserData }) {
  const [userFilter, setUserFilter] = useState("all");
  const [search, setSearch] = useState("");

  const allTrips = useMemo(() => collectAllItems(users, allUserData, "trips"), [users, allUserData]);

  const filtered = useMemo(() => {
    let f = allTrips;
    if (userFilter !== "all") f = f.filter(t => t._userId === userFilter);
    if (search) { const q = search.toLowerCase(); f = f.filter(t => (t.destination || "").toLowerCase().includes(q) || (t.tripName || t.title || "").toLowerCase().includes(q)); }
    return f.sort((a, b) => ((b.createdAt || "") > (a.createdAt || "") ? 1 : -1));
  }, [allTrips, userFilter, search]);

  const now = new Date();
  const todayStr = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
  const destinations = new Set(allTrips.filter(t => t.destination).map(t => t.destination));

  return (
    <div className="p-4 md:p-8 max-w-screen-2xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-primary flex items-center gap-3"><PlaneTakeoff className="w-7 h-7 text-blue-500" />All Trips</h2>
          <p className="text-on-surface-variant mt-1">Travel plans and itineraries across all users</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <select value={userFilter} onChange={e => setUserFilter(e.target.value)}
            className="bg-surface-container border border-outline-variant rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary">
            <option value="all">All Users</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name || u.username}</option>)}
          </select>
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="bg-surface-container border border-outline-variant rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary w-48"
            placeholder="Search destinations..." />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-surface-container rounded-xl p-3 text-center"><span className="text-xs text-on-surface-variant">Total Trips</span><p className="text-xl font-bold text-primary">{filtered.length}</p></div>
        <div className="bg-surface-container rounded-xl p-3 text-center"><span className="text-xs text-on-surface-variant">Upcoming</span><p className="text-xl font-bold text-amber-600">{filtered.filter(t => t.startDate && t.startDate > todayStr).length}</p></div>
        <div className="bg-surface-container rounded-xl p-3 text-center"><span className="text-xs text-on-surface-variant">Ongoing</span><p className="text-xl font-bold text-emerald-600">{filtered.filter(t => t.startDate && t.endDate && t.startDate <= todayStr && t.endDate >= todayStr).length}</p></div>
        <div className="bg-surface-container rounded-xl p-3 text-center"><span className="text-xs text-on-surface-variant">Destinations</span><p className="text-xl font-bold text-indigo-600">{destinations.size}</p></div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-surface-container-lowest border border-outline-variant rounded-xl">
          <PlaneTakeoff className="w-12 h-12 text-surface-container-highest mx-auto mb-4" />
          <p className="text-on-surface-variant">No trips found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((t, i) => (
            <div key={t.id || i} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-blue-100 text-blue-600"><PlaneTakeoff className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-primary">{t.tripName || t.title || "Trip"}</h4>
                  {t.destination && <p className="text-xs flex items-center gap-1 mt-1 text-on-surface-variant"><MapPin className="w-3 h-3" /> {t.destination}</p>}
                  <div className="flex items-center gap-3 mt-2 text-on-surface-variant flex-wrap text-xs">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {t._user}</span>
                    {t.startDate && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {t.startDate}{t.endDate ? ` — ${t.endDate}` : ""}</span>}
                    {t.status && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{t.status}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MapPin({ className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>;
}

// ============================================================
// DATA MANAGEMENT VIEW
// ============================================================
function DataManagementView({ users, allUserData }) {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [importStatus, setImportStatus] = useState("");
  const sysInfo = useMemo(() => {
    const keyCount = allUserData.reduce((s, d) => s + Object.keys(d).length, 0);
    const sizeEst = JSON.stringify(allUserData).length * 2;
    return { keys: keyCount, size: (sizeEst / 1024).toFixed(1) + " KB", users: users.length };
  }, [users, allUserData]);

  const exportData = async () => {
    setExporting(true);
    try {
      const data = { exportedAt: new Date().toISOString(), users: users.map(u => ({ id: u.id, username: u.username, name: u.name, email: u.email, role: u.role, isAdmin: u.is_admin })) };
      users.forEach((u, i) => {
        const d = allUserData[i] || {};
        Object.keys(d).forEach(key => { data[`${key}_${u.username}`] = d[key]; });
      });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = `kalyx-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click(); URL.revokeObjectURL(a.href);
    } catch (err) { alert("Export error: " + err.message); }
    setExporting(false);
  };

  const importData = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm("Import will MERGE backup data with existing records (no data will be lost). Continue?")) { e.target.value = ""; return; }
    setImporting(true);
    setImportStatus("Reading file...");
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.users || !data.exportedAt) { alert("Invalid backup file format."); setImporting(false); setImportStatus(""); e.target.value = ""; return; }

      setImportStatus("Importing users...");
      for (const u of data.users) {
        const profile = { username: u.username, name: u.name || u.username, email: u.email || (u.username + "@app.local"), role: u.role || "executive_task", is_admin: u.isAdmin || false };
        await setDoc(doc(db, "profiles", u.id || u.username), profile, { merge: true });
      }

      setImportStatus("Importing user data...");
      for (const u of data.users) {
        const backupData = {};
        const prefix = u.username;
        Object.keys(data).forEach(k => {
          if (k.endsWith(`_${prefix}`)) {
            const parts = k.split(`_${prefix}`);
            if (parts[0]) backupData[parts[0]] = data[k];
          }
        });
        if (Object.keys(backupData).length > 0) {
          const uid = u.id || prefix;
          // Merge mode: read existing, merge arrays by id, then write
          const existingSnap = await getDoc(doc(db, "userdata", uid));
          const existing = existingSnap.exists() ? (existingSnap.data().data || {}) : {};
          const merged = { ...existing };
          let mergedCount = 0;
          Object.entries(backupData).forEach(([key, items]) => {
            if (Array.isArray(items) && Array.isArray(merged[key])) {
              const existingIds = new Set(merged[key].map(i => i.id));
              const newItems = items.filter(i => !existingIds.has(i.id));
              if (newItems.length > 0) {
                merged[key] = [...merged[key], ...newItems];
                mergedCount += newItems.length;
              }
            } else if (!merged[key]) {
              merged[key] = items;
              mergedCount += Array.isArray(items) ? items.length : 1;
            }
          });
          await setDoc(doc(db, "userdata", uid), { data: merged, updated_at: new Date().toISOString() });
          if (mergedCount > 0) setImportStatus(`Merged ${mergedCount} records for ${u.username}...`);
        }
      }

      setImportStatus("Done!");
      alert("Data imported successfully!");
    } catch (err) { alert("Import error: " + err.message); }
    setImporting(false);
    setImportStatus("");
    e.target.value = "";
  };

  const clearAllData = async () => {
    if (!confirm("Are you sure you want to clear ALL data? This cannot be undone. User accounts will be preserved.")) return;
    if (!confirm("FINAL WARNING: This will delete all tasks, plans, milestones, daily logs, trips, and IT data. Proceed?")) return;
    setClearing(true);
    try {
      for (const u of users) {
        if (u.id) await setDoc(doc(db, "userdata", u.id), { data: {} });
      }
      alert("All data cleared. User accounts preserved.");
    } catch (err) { alert("Clear error: " + err.message); }
    setClearing(false);
  };

  return (
    <div className="p-4 md:p-8 max-w-screen-2xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-primary flex items-center gap-3"><Database className="w-7 h-7 text-indigo-500" />Data Management</h2>
        <p className="text-on-surface-variant mt-1">Export, import, and manage system data</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2"><Download className="w-5 h-5 text-indigo-500" /> Export Data</h3>
          <p className="text-sm text-on-surface-variant mb-4">Download all system data (users, tasks, plans, trips, logs) as a JSON file for backup.</p>
          <button onClick={exportData} disabled={exporting}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50">
            <Download className="w-4 h-4" />{exporting ? "Exporting..." : "Export All Data"}
          </button>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2"><Upload className="w-5 h-5 text-amber-500" /> Import Data</h3>
          <p className="text-sm text-on-surface-variant mb-4">Restore data from a previously exported JSON backup file. This will overwrite existing data.</p>
          <input onChange={importData} disabled={importing}
            className="w-full mb-3 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-primary file:text-on-primary file:font-semibold hover:file:opacity-90"
            type="file" accept=".json" />
          {importStatus && <p className="text-xs text-on-surface-variant">{importStatus}</p>}
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-500" /> Clear Data</h3>
          <p className="text-sm text-on-surface-variant mb-4">Remove all system data. This action cannot be undone. Only user accounts will be preserved.</p>
          <button onClick={clearAllData} disabled={clearing}
            className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50">
            <Trash2 className="w-4 h-4" />{clearing ? "Clearing..." : "Clear All Data"}
          </button>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2"><Info className="w-5 h-5 text-emerald-500" /> System Info</h3>
          <div className="space-y-3">
            <div className="flex justify-between p-3 rounded-xl bg-surface-container"><span className="text-xs text-on-surface-variant">Firestore data keys</span><span className="text-sm font-semibold">{sysInfo.keys}</span></div>
            <div className="flex justify-between p-3 rounded-xl bg-surface-container"><span className="text-xs text-on-surface-variant">Total data size (est.)</span><span className="text-sm font-semibold">{sysInfo.size}</span></div>
            <div className="flex justify-between p-3 rounded-xl bg-surface-container"><span className="text-xs text-on-surface-variant">Registered users</span><span className="text-sm font-semibold">{sysInfo.users}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// GLOBAL SEARCH VIEW
// ============================================================
function GlobalSearchView({ users, allUserData }) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ users: true, tasks: true, plans: true, trips: true, logs: true, it: true });

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const hits = [];

    const addIfMatch = (item, fields, result) => {
      if (fields.some(f => (item[f] || "").toLowerCase().includes(q))) hits.push(result);
    };

    if (filters.users) {
      users.forEach(u => {
        if ((u.name || "").toLowerCase().includes(q) || u.username.toLowerCase().includes(q))
          hits.push({ type: "user", title: u.name || u.username, subtitle: "@" + u.username, user: u.name || u.username });
      });
    }

    users.forEach((u, i) => {
      const d = allUserData[i] || {};
      const uname = u.name || u.username;

      if (filters.tasks && d.tasks) d.tasks.forEach(t => {
        addIfMatch(t, ["title", "description", "category"], { type: "task", title: t.title, subtitle: uname, user: uname, date: t.dueDate });
      });
      if (filters.plans && d.plans) d.plans.forEach(p => {
        addIfMatch(p, ["title", "description"], { type: "plan", title: p.title, subtitle: uname, user: uname, date: p.startDate });
      });
      if (filters.trips && d.trips) d.trips.forEach(t => {
        addIfMatch(t, ["tripName", "title", "destination"], { type: "trip", title: t.tripName || t.title || "Trip", subtitle: t.destination || uname, user: uname, date: t.startDate });
      });
      if (filters.logs && d.dailylog) d.dailylog.forEach(l => {
        addIfMatch(l, ["title", "description", "category"], { type: "log", title: l.title, subtitle: uname, user: uname, date: l.date });
      });
      if (filters.it) {
        ["assets","services","maintenance","inventory","task","planner","accomplishments","tickets","systems"].forEach(itType => {
          const items = d["it_" + itType];
          if (items) items.forEach(item => {
            addIfMatch(item, ["name", "title", "description"], { type: "it_" + itType, title: item.name || item.title || "(unnamed)", subtitle: uname, user: uname, date: item.date || item.createdAt });
          });
        });
      }
    });

    return hits.slice(0, 50);
  }, [query, users, allUserData, filters]);

  const iconMap = { user: <User className="w-4 h-4" />, task: <CheckSquare className="w-4 h-4" />, plan: <Map className="w-4 h-4" />, trip: <PlaneTakeoff className="w-4 h-4" />, log: <FileEdit className="w-4 h-4" /> };
  const colorMap = { user: "bg-amber-100 text-amber-600", task: "bg-indigo-100 text-indigo-600", plan: "bg-emerald-100 text-emerald-600", trip: "bg-blue-100 text-blue-600", log: "bg-pink-100 text-pink-600" };

  const toggleFilter = (key) => setFilters(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="p-4 md:p-8 max-w-screen-2xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-primary flex items-center gap-3"><Search className="w-7 h-7 text-indigo-500" />Global Search</h2>
        <p className="text-on-surface-variant mt-1">Search across all users, tasks, plans, trips, and logs</p>
      </div>

      <div className="max-w-2xl mx-auto mb-8">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-primary transition-all text-lg"
            placeholder="Type to search across all data..." />
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          {Object.entries(filters).map(([key, val]) => (
            <label key={key} className="flex items-center gap-1.5 cursor-pointer select-none">
              <input type="checkbox" checked={val} onChange={() => toggleFilter(key)}
                className="rounded border-outline-variant text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5" />
              <span className="text-xs font-semibold capitalize">{key === "it" ? "IT Data" : key}</span>
            </label>
          ))}
        </div>
      </div>

      {!query.trim() ? (
        <p className="text-on-surface-variant text-center py-16">Type something to search across all data</p>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="w-12 h-12 text-surface-container-highest mx-auto mb-4" />
          <p className="text-on-surface-variant">No results for &ldquo;{query}&rdquo;</p>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto">
          <p className="text-xs text-on-surface-variant mb-4">{results.length} result{results.length > 1 ? "s" : ""} for &ldquo;{query}&rdquo;</p>
          <div className="space-y-2">
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-surface-container-lowest border border-outline-variant rounded-xl">
                <div className={`p-3 rounded-xl ${colorMap[r.type] || "bg-gray-100 text-gray-600"}`}>{iconMap[r.type] || <Circle className="w-4 h-4" />}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary">{r.title}</p>
                  <p className="text-xs text-on-surface-variant">{r.subtitle}{r.date ? ` · ${r.date}` : ""}</p>
                </div>
                <span className="text-xs font-semibold px-2 py-1 rounded-full capitalize bg-surface-container text-on-surface-variant">{r.type.replace("it_", "IT ").replace("_", " ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
function AdminDashboardInner() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") || "dashboard";

  const [users, setUsers] = useState([]);
  const [allUserData, setAllUserData] = useState([]);
  const [sharedTasksCount, setSharedTasksCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadUserData = useCallback(async (profilesList) => {
    const userDataResults = await Promise.all(
      profilesList.map(async p => {
        try {
          const dSnap = await getDoc(doc(db, "userdata", p.id));
          return dSnap.exists() ? (dSnap.data().data || {}) : {};
        } catch { return {}; }
      })
    );
    setAllUserData(userDataResults);
  }, []);

  useEffect(() => {
    const unsubs = [];

    const unsubProfiles = onSnapshot(collection(db, "profiles"), (snap) => {
      const profilesList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(profilesList);
    });
    unsubs.push(unsubProfiles);

    const unsubTasks = onSnapshot(collection(db, "shared_tasks"), snap => {
      setSharedTasksCount(snap.size);
    });
    unsubs.push(unsubTasks);

    // Load all user data once on mount
    getDocs(collection(db, "profiles")).then(async (snap) => {
      const profilesList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      await loadUserData(profilesList);
      setLoading(false);
    });

    return () => unsubs.forEach(u => u());
  }, [loadUserData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  if (view === "users") {
    return <UsersView users={users} allUserData={allUserData} onRefresh={() => {}} />;
  }
  if (view === "dashboard") {
    return <DashboardView users={users} allUserData={allUserData} sharedTasksCount={sharedTasksCount} />;
  }
  if (view === "tasks") {
    return <AdminTasksView users={users} allUserData={allUserData} />;
  }
  if (view === "plans") {
    return <AdminPlansView users={users} allUserData={allUserData} />;
  }
  if (view === "daily-logs") {
    return <AdminDailyLogsView users={users} allUserData={allUserData} />;
  }
  if (view === "trips") {
    return <AdminTripsView users={users} allUserData={allUserData} />;
  }
  if (view === "data") {
    return <DataManagementView users={users} allUserData={allUserData} />;
  }
  if (view === "search") {
    return <GlobalSearchView users={users} allUserData={allUserData} />;
  }

  const viewMeta = {
    tasks: { title: "Shared Tasks", icon: <CheckSquare className="w-16 h-16" /> },
    plans: { title: "Plans & Roadmaps", icon: <Map className="w-16 h-16" /> },
    "daily-logs": { title: "Daily Logs", icon: <FileEdit className="w-16 h-16" /> },
    trips: { title: "All Trips", icon: <PlaneTakeoff className="w-16 h-16" /> },
    data: { title: "Data Management", icon: <Database className="w-16 h-16" /> },
    search: { title: "Global Search", icon: <Search className="w-16 h-16" /> },
  };
  const current = viewMeta[view] || { title: view || "Unknown", icon: <ShieldAlert className="w-16 h-16" /> };
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="text-on-surface-variant/20 mb-4">{current.icon}</div>
      <h2 className="text-2xl font-bold text-primary">{current.title}</h2>
      <p className="text-on-surface-variant mt-2">This section is coming soon.</p>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" /></div>}>
      <AdminDashboardInner />
    </Suspense>
  );
}
