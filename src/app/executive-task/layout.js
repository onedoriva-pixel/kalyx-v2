"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { 
  LayoutDashboard, LogOut, Menu, X, User, 
  ListTodo, Columns, Map, FileEdit, StickyNote, Plus 
} from "lucide-react";

export default function ExecutiveTaskLayout({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const router = useRouter();
  const [activeView, setActiveView] = useState("dashboard");

  useEffect(() => {
    const update = () => {
      const params = new URLSearchParams(window.location.search);
      setActiveView(params.get("view") || "dashboard");
    };
    update();
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        try {
          let docSnap = await getDoc(doc(db, "profiles", user.uid));
          if (!docSnap.exists()) {
            const q = query(collection(db, "profiles"), where("email", "==", user.email));
            const results = await getDocs(q);
            if (!results.empty) docSnap = results.docs[0];
          }
          if (docSnap.exists()) {
            setProfile(docSnap.data());
          }
        } catch (err) {}
        setLoading(false);
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const goTo = (view) => {
    router.push(`/executive-task?view=${view}`);
    setSidebarOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
    { key: "all-tasks", label: "All Tasks", icon: <ListTodo className="w-5 h-5" /> },
    { key: "board", label: "Board", icon: <Columns className="w-5 h-5" /> },
    { key: "planner", label: "Planner", icon: <Map className="w-5 h-5" /> },
    { key: "daily-log", label: "Daily Log", icon: <FileEdit className="w-5 h-5" /> },
    { key: "notes", label: "Notes", icon: <StickyNote className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen flex bg-surface-container-low text-on-surface font-sans">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 w-64 bg-surface-container-lowest border-r border-outline-variant z-50 transform transition-transform duration-300 md:relative md:translate-x-0 flex flex-col ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between mb-8 px-6 pt-6">
          <div>
            <h1 className="text-xl font-bold text-primary">KALYX</h1>
            <p className="text-xs text-on-surface-variant">Executive Task</p>
          </div>
          <button className="md:hidden p-1 text-on-surface-variant hover:text-primary" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-4 overflow-y-auto">
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => goTo(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all text-left ${
                activeView === item.key
                  ? "bg-primary text-on-primary shadow-md"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="px-4 py-6 border-t border-outline-variant">
          <button
            onClick={() => goTo("board")}
            className="w-full bg-primary text-on-primary py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" /> New Task
          </button>
          <div className="flex items-center gap-3 px-2 mt-4">
            <div className="w-9 h-9 bg-primary-container text-on-primary-container rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
              {profile?.name?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{profile?.name || user?.email}</p>
              <p className="text-xs text-on-surface-variant truncate capitalize">{profile?.role || "User"}</p>
            </div>
            <button onClick={handleLogout} className="p-1.5 text-error hover:bg-error-container/30 rounded-lg transition-all" title="Sign Out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center px-4 bg-surface-container-lowest border-b border-outline-variant md:hidden">
          <button className="p-2 -ml-2 text-on-surface hover:text-primary" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          <span className="ml-2 font-bold text-lg text-primary">KALYX</span>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
