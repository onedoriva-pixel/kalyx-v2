"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { 
  LayoutDashboard, Users, CheckSquare, Map, 
  FileEdit, PlaneTakeoff, Database, Search, 
  LogOut, Menu, X, User, UserPlus
} from "lucide-react";

export default function AdminLayout({ children }) {
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

  const goTo = (view) => {
    router.push(`/admin?view=${view}`);
    setSidebarOpen(false);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        try {
          const docSnap = await getDoc(doc(db, "profiles", user.uid));
          if (docSnap.exists()) {
            const data = docSnap.data();
            setProfile(data);

            const role = (data.role || "").trim();
            const isAdmin =
              role === "admin" ||
              data.is_admin ||
              data.isAdmin;

            if (!isAdmin) {
              alert("Access Denied: You do not have administrator privileges.\n\nYour current role: " + (data.role || "(no role set)"));
              router.push("/login");
              return;
            }
          } else {
            // No profile document found at all
            alert("Access Denied: No profile found for this account. Contact your administrator.");
            router.push("/login");
            return;
          }
        } catch (err) {
          console.error("Failed to load profile:", err);
          alert("Error loading profile: " + err.message);
          router.push("/login");
          return;
        }
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
    { key: "users", label: "Users", icon: <Users className="w-5 h-5" /> },
    { key: "tasks", label: "Tasks", icon: <CheckSquare className="w-5 h-5" /> },
    { key: "plans", label: "Plans & Roadmaps", icon: <Map className="w-5 h-5" /> },
    { key: "daily-logs", label: "Daily Logs", icon: <FileEdit className="w-5 h-5" /> },
    { key: "trips", label: "Trips", icon: <PlaneTakeoff className="w-5 h-5" /> },
    { key: "data", label: "Data Management", icon: <Database className="w-5 h-5" /> },
    { key: "search", label: "Global Search", icon: <Search className="w-5 h-5" /> }
  ];

  return (
    <div className="min-h-screen flex bg-background text-on-background font-sans overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-72 bg-surface border-r border-outline-variant z-50 transform transition-transform duration-300 md:relative md:translate-x-0 shadow-sm flex flex-col ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-8 pb-4">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-primary tracking-tight">Administrator</h1>
              <p className="text-xs text-on-surface-variant mt-1 font-semibold">Control Panel</p>
            </div>
            <button className="md:hidden text-on-surface-variant hover:text-primary" onClick={() => setSidebarOpen(false)}>
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-8 pb-4 space-y-1.5 custom-scrollbar">
          {navItems.map((item, i) => (
            <button
              key={i}
              onClick={() => goTo(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-semibold transition-all duration-200 text-left ${
                activeView === item.key
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
              }`}
            >
              {item.icon}
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-8 pt-4 border-t border-outline-variant">
          <button onClick={() => goTo("users")} className="w-full bg-primary hover:opacity-90 text-on-primary py-3.5 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-200 shadow-sm active:scale-95">
            <UserPlus className="w-5 h-5" /> New User
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen">
        <header className="h-16 bg-surface/80 backdrop-blur-xl border-b border-outline-variant sticky top-0 z-40 flex justify-between items-center w-full px-6 md:px-10 flex-shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <button className="md:hidden text-on-surface-variant hover:bg-surface-container-high p-2 rounded-xl transition-colors" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-bold text-primary hidden md:block">Dashboard</h2>
          </div>
          <div className="flex items-center gap-2 relative">
            <button 
              className="h-9 w-9 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold text-sm hover:opacity-80 transition-all ml-2"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              {profile?.name?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-12 w-56 bg-surface-container-lowest/95 backdrop-blur-xl border border-outline-variant rounded-2xl shadow-xl p-2 z-50 animate-fade-in">
                <div className="px-4 py-3 border-b border-outline-variant">
                  <p className="font-semibold text-primary inline mr-2">{profile?.name || user.email}</p>
                  <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold align-middle">Admin</span>
                  <p className="text-xs text-on-surface-variant mt-1">{profile?.username}</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 mt-1 rounded-xl text-error hover:bg-error-container/30 transition-all text-sm font-semibold"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </header>
        
        <div className="flex-1 overflow-auto bg-background">
          {children}
        </div>
      </main>
    </div>
  );
}
