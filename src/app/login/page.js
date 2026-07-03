"use client";

import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Mail, Lock, Loader2, LogIn, UserPlus, User } from "lucide-react";

export default function Login() {
  const [tab, setTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Register state
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("executive_task");
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      
      // Fetch profile — try by UID first, then fallback to email lookup
      let profileSnap = await getDoc(doc(db, "profiles", userCred.user.uid));
      
      if (!profileSnap.exists()) {
        const q = query(collection(db, "profiles"), where("email", "==", email));
        const results = await getDocs(q);
        if (!results.empty) {
          profileSnap = results.docs[0];
        }
      }
      
      let route = "/executive-task";
      
      if (profileSnap.exists()) {
        const data = profileSnap.data();
        const role = (data.role || "").trim();
        if (role === "admin" || data.is_admin || data.isAdmin) {
          route = "/admin";
        } else if (role === "executive_path") {
          route = "/executive-path";
        } else if (role === "executive_it") {
          route = "/executive-it";
        }
      }

      router.push(route);
    } catch (err) {
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found") {
        setError("Invalid email or password.");
      } else {
        setError(err.message);
      }
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name || !username || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCred.user;
      
      // Save profile
      await setDoc(doc(db, "profiles", user.uid), {
        name,
        username,
        email,
        role,
        is_admin: false,
        created_at: new Date().toISOString()
      });

      alert("Account created successfully!");
      setTab("login");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-primary tracking-tight">Executive Path</h1>
          <p className="text-sm text-on-surface-variant mt-1 font-semibold">Sign in to your account</p>
        </div>

        <div className="glass-card shadow-2xl p-8 rounded-3xl animate-fade-in">
          <div className="flex mb-6 bg-surface-container rounded-xl p-1">
            <button 
              className={`flex-1 py-2.5 text-center font-semibold rounded-lg transition-all ${tab === "login" ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-primary"}`}
              onClick={() => setTab("login")}
            >
              Login
            </button>
            <button 
              className={`flex-1 py-2.5 text-center font-semibold rounded-lg transition-all ${tab === "register" ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-primary"}`}
              onClick={() => setTab("register")}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="mb-4 text-xs font-semibold text-error bg-error-container text-on-error-container p-3 rounded-xl border border-error/20">
              {error}
            </div>
          )}

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block mb-1.5 text-xs font-bold text-on-surface-variant">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/50" />
                  <input 
                    className="w-full bg-surface-container border border-outline-variant rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none transition-all" 
                    placeholder="Enter your email" 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block mb-1.5 text-xs font-bold text-on-surface-variant">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/50" />
                  <input 
                    className="w-full bg-surface-container border border-outline-variant rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none transition-all" 
                    placeholder="Enter password" 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
              
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-on-primary py-3 rounded-xl font-bold hover:opacity-90 transition-all active:scale-[0.98] shadow-md flex items-center justify-center gap-2 mt-6 disabled:opacity-70"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                Sign In
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block mb-1.5 text-xs font-bold text-on-surface-variant">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/50" />
                  <input 
                    className="w-full bg-surface-container border border-outline-variant rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none transition-all" 
                    placeholder="Enter full name" 
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block mb-1.5 text-xs font-bold text-on-surface-variant">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/50" />
                  <input 
                    className="w-full bg-surface-container border border-outline-variant rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none transition-all" 
                    placeholder="Choose a username" 
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block mb-1.5 text-xs font-bold text-on-surface-variant">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/50" />
                  <input 
                    className="w-full bg-surface-container border border-outline-variant rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none transition-all" 
                    placeholder="Enter email address" 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1.5 text-xs font-bold text-on-surface-variant">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/50" />
                    <input 
                      className="w-full bg-surface-container border border-outline-variant rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none transition-all" 
                      placeholder="Password" 
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block mb-1.5 text-xs font-bold text-on-surface-variant">Confirm</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/50" />
                    <input 
                      className="w-full bg-surface-container border border-outline-variant rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none transition-all" 
                      placeholder="Confirm" 
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block mb-1.5 text-xs font-bold text-on-surface-variant">Portal / Role</label>
                <select 
                  className="w-full bg-surface-container border border-outline-variant rounded-xl py-2.5 px-4 text-sm focus:outline-none transition-all"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="executive_task">Executive Task</option>
                  <option value="executive_path">Executive Path (Travel)</option>
                  <option value="executive_it">Executive IT</option>
                </select>
              </div>
              
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-on-primary py-3 rounded-xl font-bold hover:opacity-90 transition-all active:scale-[0.98] shadow-md flex items-center justify-center gap-2 mt-6 disabled:opacity-70"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                Create Account
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
