"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { LayoutDashboard, PlaneTakeoff, BarChart3, Settings, LogOut, Menu, X, User, Bell, HelpCircle } from "lucide-react";

export default function ExecutivePathLayout({ children }) {
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
    router.push(`/executive-path?view=${view}`);
    setSidebarOpen(false);
  };

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
        } catch (err) {
          console.error("Failed to load profile:", err);
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
    { key: "trips", label: "Trips", icon: <PlaneTakeoff className="w-5 h-5" /> },
    { key: "reports", label: "Reports", icon: <BarChart3 className="w-5 h-5" /> },
    { key: "settings", label: "Settings", icon: <Settings className="w-5 h-5" /> }
  ];

  return (
    <div className="min-h-screen flex bg-background text-on-background font-sans">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-72 bg-gradient-to-b from-indigo-600 to-indigo-900 border-r border-indigo-500/30 z-50 transform transition-transform duration-300 md:relative md:translate-x-0 shadow-xl ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="h-full flex flex-col p-8">
          <div className="mb-10 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Executive Path</h1>
              <p className="text-xs text-indigo-200 mt-1 font-semibold">Travel Management</p>
            </div>
            <button className="md:hidden text-indigo-200 hover:text-white" onClick={() => setSidebarOpen(false)}>
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 space-y-1.5">
            {navItems.map((item, i) => (
            <button
              key={i}
              onClick={() => goTo(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-semibold transition-all duration-200 text-left ${
                activeView === item.key
                  ? "bg-white/20 text-white shadow-sm"
                  : "text-indigo-200 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
          </nav>

          <button onClick={() => goTo("trips")} className="mt-auto bg-white text-indigo-700 py-3.5 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all duration-200 shadow-sm active:scale-95">
            <PlaneTakeoff className="w-5 h-5" /> New Trip
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-surface border-b border-outline-variant sticky top-0 z-40 flex justify-between items-center w-full px-6 md:px-10">
          <div className="flex items-center gap-4 flex-1">
            <button className="md:hidden text-on-surface-variant hover:bg-surface-container-high p-2 rounded-xl transition-colors" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden md:flex relative w-full max-w-sm">
              <input 
                className="w-full bg-surface-container border border-outline-variant rounded-xl py-2 pl-4 pr-4 text-sm focus:outline-none focus:border-primary transition-all" 
                placeholder="Search..." 
                type="text"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 relative">
            <button className="text-on-surface-variant hover:bg-surface-container-high p-2.5 rounded-xl transition-all">
              <Bell className="w-5 h-5" />
            </button>
            <button className="text-on-surface-variant hover:bg-surface-container-high p-2.5 rounded-xl transition-all">
              <HelpCircle className="w-5 h-5" />
            </button>
            
            <button 
              className="h-9 w-9 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold text-sm hover:opacity-80 transition-all ml-2"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              {profile?.name?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-12 w-56 bg-surface border border-outline-variant rounded-2xl shadow-xl p-2 z-50 animate-fade-in">
                <div className="px-4 py-3 border-b border-outline-variant">
                  <p className="font-semibold text-primary truncate">{profile?.name || user.email}</p>
                  <p className="text-xs text-on-surface-variant truncate">{profile?.role}</p>
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
