"use client"

import { useState } from "react"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { LifeBuoy, Send, CheckCircle, ArrowLeft } from "lucide-react"

const DEPARTMENTS = ["IT", "HR", "Finance", "Operations", "Sales", "Executive", "Admin", "Warehouse", "Other"]
const PRIORITIES = ["low", "medium", "high"]

function generateRef() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let ref = "SD-"
  for (let i = 0; i < 6; i++) ref += chars.charAt(Math.floor(Math.random() * chars.length))
  return ref
}

export default function ServiceDeskPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    department: "IT",
    priority: "medium",
    subject: "",
    description: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [ticketRef, setTicketRef] = useState("")
  const [error, setError] = useState("")

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.description.trim()) {
      setError("Please fill in all required fields")
      return
    }

    setSubmitting(true)
    try {
      const ref = generateRef()
      await addDoc(collection(db, "tickets"), {
        title: form.subject.trim(),
        description: form.description.trim(),
        requestor_name: form.name.trim(),
        requestor_email: form.email.trim(),
        department: form.department,
        priority: form.priority,
        status: "open",
        ref,
        source: "service-desk",
        created_at: serverTimestamp(),
      })
      setTicketRef(ref)
      setSubmitted(true)
    } catch (e) {
      setError("Failed to submit ticket. Please try again.")
      console.error("Ticket submission error:", e)
    }
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl border border-indigo-100 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ticket Submitted!</h2>
          <p className="text-gray-500 text-sm mb-4">
            Your support request has been received. Reference number:
          </p>
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 mb-6">
            <span className="text-lg font-bold text-indigo-700 tracking-wider">{ticketRef}</span>
          </div>
          <p className="text-xs text-gray-400 mb-6">
            Please save this reference number for tracking purposes. Our IT team will respond shortly.
          </p>
          <button
            onClick={() => { setSubmitted(false); setForm({ name: "", email: "", department: "IT", priority: "medium", subject: "", description: "" }) }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Submit Another Ticket
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl border border-indigo-100 p-8 max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center mx-auto mb-3">
            <LifeBuoy className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">IT Service Desk</h1>
          <p className="text-gray-500 text-sm mt-1">
            Submit a support ticket and our team will assist you
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                value={form.name}
                onChange={handleChange("name")}
                required
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={handleChange("email")}
                required
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="your@email.com"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
              <select
                value={form.department}
                onChange={handleChange("department")}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
              <select
                value={form.priority}
                onChange={handleChange("priority")}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              value={form.subject}
              onChange={handleChange("subject")}
              required
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              placeholder="Brief description of your issue"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.description}
              onChange={handleChange("description")}
              required
              rows={4}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
              placeholder="Provide detailed information about the issue..."
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/25"
          >
            {submitting ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {submitting ? "Submitting..." : "Submit Ticket"}
          </button>
        </form>
      </div>
    </div>
  )
}
