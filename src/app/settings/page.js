"use client"

import { useEffect, useState } from "react"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth"
import { useRouter } from "next/navigation"
import { Shield, Lock, Eye, EyeOff, User, Save, AlertTriangle, ArrowLeft } from "lucide-react"

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) { router.replace("/login"); return }
      setUser(u)
      try {
        let snap = await getDoc(doc(db, "profiles", u.uid))
        if (!snap.exists()) {
          const q = query(collection(db, "profiles"), where("email", "==", u.email))
          const results = await getDocs(q)
          if (!results.empty) snap = results.docs[0]
        }
        if (snap.exists()) setProfile(snap.data())
      } catch (e) {
        console.error("Failed to load profile", e)
      }
      setLoading(false)
    })
    return unsub
  }, [router])

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (newPassword.length < 6) { setError("New password must be at least 6 characters"); return }
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return }

    setSaving(true)
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPassword)
      await reauthenticateWithCredential(user, cred)
      await updatePassword(user, newPassword)
      setSuccess("Password updated successfully")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (e) {
      if (e.code === "auth/wrong-password") setError("Current password is incorrect")
      else if (e.code === "auth/weak-password") setError("New password is too weak")
      else setError(e.message)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => {
                  const role = (profile?.role || "").trim()
                  if (role === "admin") router.push("/admin")
                  else if (role === "executive_path") router.push("/executive-path")
                  else if (role === "executive_it") router.push("/executive-it")
                  else router.push("/executive-task")
                }}
                className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Portal
              </button>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-500 mt-1">Manage your account and security</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Change Password */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
                    <p className="text-sm text-gray-500">Update your account password</p>
                  </div>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrent ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        placeholder="Enter current password"
                      />
                      <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                    <div className="relative">
                      <input
                        type={showNew ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        placeholder="Enter new password"
                      />
                      <button type="button" onClick={() => setShowNew(!showNew)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      placeholder="Confirm new password"
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
                      <Save className="w-4 h-4 shrink-0" />
                      {success}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all"
                  >
                    {saving ? (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {saving ? "Updating..." : "Update Password"}
                  </button>
                </form>
              </div>
            </div>

            {/* Account Info */}
            <div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Account Info</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">{profile?.name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Username</p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">@{profile?.username || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">{user?.email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Role</p>
                    <span className="inline-block mt-0.5 px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-semibold">
                      {profile?.role || "User"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white">
                <Shield className="w-8 h-8 mb-3 opacity-80" />
                <h3 className="text-base font-semibold">Security Tip</h3>
                <p className="text-sm text-indigo-200 mt-1">Use a strong, unique password with at least 8 characters including numbers and symbols.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
