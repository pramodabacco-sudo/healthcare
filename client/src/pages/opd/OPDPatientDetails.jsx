// client/src/pages/opd/OPDPatientDetails.jsx
import { useState, useEffect } from "react";
import { ArrowLeft, User, CreditCard, CalendarClock, FileText, Stethoscope, Bell, Save, Loader2, Pill, Plus, Trash2, AlertTriangle } from "lucide-react";
import { SectionCard, StatusBadge } from "../../components/UI";
import { api } from "../../lib/api";

const followUpStatusColors = {
  Pending:   "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
  Completed: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
  Missed:    "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20",
};

const reminderStatusColors = {
  Pending: "text-amber-600 dark:text-amber-400",
  Sent:    "text-emerald-600 dark:text-emerald-400",
  Failed:  "text-red-500 dark:text-red-400",
  "Not Set": "text-slate-400 dark:text-slate-500",
};

export default function OPDPatientDetails({ patient: initP, onBack, onUpdated, isDoctor = false }) {
  const [p, setP] = useState(initP);
  const [loadingPatient, setLoadingPatient] = useState(true);
  const [doctorForm, setDoctorForm] = useState({
    diagnosis: initP.diagnosis || "",
    prescription: initP.prescription || "",
    doctorNotes: initP.doctorNotes || "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [error, setError] = useState("");

  const [medicineOptions, setMedicineOptions] = useState([]);
  const [medicinesLoading, setMedicinesLoading] = useState(true);
  const [selectedMedicineId, setSelectedMedicineId] = useState("");
  const [rxQuantity, setRxQuantity] = useState("");
  const [rxDosage, setRxDosage] = useState("");
  const [rxSaving, setRxSaving] = useState(false);
  const [rxError, setRxError] = useState("");
  const [deletingRxId, setDeletingRxId] = useState(null);

  useEffect(() => {
    (async () => {
      setLoadingPatient(true);
      try {
        const { patient } = await api.get(`/opd/patients/${initP.id}`);
        setP(patient);
      } catch (err) {
        setError(err.message || "Could not load latest patient data.");
      } finally {
        setLoadingPatient(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initP.id]);

  useEffect(() => {
    (async () => {
      setMedicinesLoading(true);
      try {
        const { medicines } = await api.get("/pharmacy/medicines");
        setMedicineOptions(medicines);
      } catch (err) {
        setRxError(err.message || "Could not load medicine list.");
      } finally {
        setMedicinesLoading(false);
      }
    })();
  }, []);

  if (!p) return null;

  const persist = async (patch) => {
    const { patient: updated } = await api.put(`/opd/patients/${p.id}`, { ...p, ...patch });
    setP(updated);
    if (onUpdated) onUpdated(updated);
    return updated;
  };

  const handleDoctorSave = async () => {
    setSaving(true);
    setError("");
    try {
      await persist(doctorForm);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message || "Could not save notes.");
    } finally {
      setSaving(false);
    }
  };

  const handleFollowUpStatus = async (status) => {
    setStatusSaving(true);
    setError("");
    try {
      await persist({ followUpStatus: status });
    } catch (err) {
      setError(err.message || "Could not update follow-up status.");
    } finally {
      setStatusSaving(false);
    }
  };

  const handleAddPrescription = async () => {
    setRxError("");
    if (!selectedMedicineId) { setRxError("Select a medicine."); return; }
    const qty = parseInt(rxQuantity, 10);
    if (!qty || qty <= 0) { setRxError("Enter a valid quantity."); return; }

    setRxSaving(true);
    try {
      const { patient: updated } = await api.post(`/opd/patients/${p.id}/prescriptions`, {
        medicineId: selectedMedicineId,
        quantity: qty,
        dosageInstructions: rxDosage.trim(),
      });
      setP(updated);
      if (onUpdated) onUpdated(updated);
      const { medicines } = await api.get("/pharmacy/medicines");
      setMedicineOptions(medicines);
      setSelectedMedicineId("");
      setRxQuantity("");
      setRxDosage("");
    } catch (err) {
      setRxError(err.message || "Could not add prescribed medicine.");
    } finally {
      setRxSaving(false);
    }
  };

  const handleDeletePrescription = async (itemId) => {
    setDeletingRxId(itemId);
    setRxError("");
    try {
      await api.del(`/opd/patients/${p.id}/prescriptions/${itemId}`);
      setP(prev => ({ ...prev, prescribedMedicines: prev.prescribedMedicines.filter(pm => pm.id !== itemId) }));
      if (onUpdated) onUpdated({ ...p, prescribedMedicines: p.prescribedMedicines.filter(pm => pm.id !== itemId) });
    } catch (err) {
      setRxError(err.message || "Could not delete this prescription record.");
    } finally {
      setDeletingRxId(null);
    }
  };

  const selectedMedicine = medicineOptions.find(m => m.id === selectedMedicineId);

  return (
    <div className="w-full px-2 sm:px-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
        <span className="font-mono text-xs text-teal-600 dark:text-teal-400 font-bold">{p.serialNumber}</span>
        <h1 className="text-slate-800 dark:text-white font-bold text-xl break-words">{p.name}</h1>
        <StatusBadge status={p.condition || "Stable"} />
        {loadingPatient && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl px-4 py-3 text-rose-600 dark:text-rose-400 text-sm font-medium mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Personal Information" icon={User}>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: "Token No.",  val: p.serialNumber },
              { label: "Name",       val: p.name },
              { label: "Age",        val: `${p.age} years` },
              { label: "Gender",     val: p.gender },
              { label: "Place",      val: p.place },
              { label: "Phone",      val: p.phone },
              { label: "Visit Date", val: p.visitDate },
            ].map(item => (
              <div key={item.label}>
                <div className="text-slate-400 dark:text-slate-500 text-xs mb-0.5">{item.label}</div>
                <div className="text-slate-800 dark:text-white font-medium break-words">{item.val || "—"}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Payment Information" icon={CreditCard}>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-3 text-center">
                <div className="text-amber-600 dark:text-amber-400 font-bold text-lg">₹{p.cash}</div>
                <div className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">Cash</div>
              </div>
              <div className="bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 rounded-xl p-3 text-center">
                <div className="text-violet-600 dark:text-violet-400 font-bold text-lg">₹{p.upi}</div>
                <div className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">UPI</div>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-3 text-center">
                <div className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">₹{p.total}</div>
                <div className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">Total</div>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-transparent">
              <div className="text-slate-400 dark:text-slate-500 text-xs mb-1">Consultation Fee</div>
              <div className="text-slate-800 dark:text-white font-bold text-xl">₹{p.fee}</div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Follow-Up Information" icon={CalendarClock}>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-slate-400 dark:text-slate-500 text-xs mb-0.5">Follow-Up Date</div>
                <div className="text-slate-800 dark:text-white font-medium">{p.followUpDate || "Not scheduled"}</div>
              </div>
              <div>
                <div className="text-slate-400 dark:text-slate-500 text-xs mb-0.5">Condition</div>
                <StatusBadge status={p.condition || "Stable"} />
              </div>
            </div>

            <div>
              <div className="text-slate-400 dark:text-slate-500 text-xs mb-1.5 flex items-center gap-2">
                Follow-Up Status
                {statusSaving && <Loader2 className="w-3 h-3 animate-spin" />}
              </div>
              <div className="flex gap-2 flex-wrap">
                {["Pending", "Completed", "Missed"].map(s => (
                  <button
                    key={s}
                    disabled={statusSaving}
                    onClick={() => handleFollowUpStatus(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-60 ${
                      p.followUpStatus === s
                        ? followUpStatusColors[s] + " ring-1 ring-offset-1 ring-current"
                        : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {p.followUpDesc && (
              <div>
                <div className="text-slate-400 dark:text-slate-500 text-xs mb-0.5">Follow-Up Notes</div>
                <div className="text-slate-600 dark:text-slate-300 break-words">{p.followUpDesc}</div>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Reminder Information" icon={Bell}>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-slate-400 dark:text-slate-500 text-xs mb-0.5">Reminder Enabled</div>
              <div className={`font-medium ${p.reminderEnabled ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}>
                {p.reminderEnabled ? "Yes" : "No"}
              </div>
            </div>
            <div>
              <div className="text-slate-400 dark:text-slate-500 text-xs mb-0.5">Reminder Status</div>
              <div className={`font-semibold ${reminderStatusColors[p.reminderStatus] || reminderStatusColors["Not Set"]}`}>
                {p.reminderStatus || "Not Set"}
              </div>
            </div>
            {p.reminderSentDate && (
              <div>
                <div className="text-slate-400 dark:text-slate-500 text-xs mb-0.5">Reminder Sent On</div>
                <div className="text-slate-800 dark:text-white font-medium">{p.reminderSentDate}</div>
              </div>
            )}
          </div>
        </SectionCard>

        {p.notes && (
          <SectionCard title="Clinical Notes" icon={FileText}>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed break-words">{p.notes}</p>
          </SectionCard>
        )}

        <SectionCard title="Prescribed Medicines" icon={Pill}>
          <div className="space-y-4">
            {rxError && (
              <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl px-3 py-2.5 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{rxError}</span>
              </div>
            )}

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Medicine</label>
                  <select
                    value={selectedMedicineId}
                    onChange={e => { setSelectedMedicineId(e.target.value); setRxError(""); }}
                    disabled={medicinesLoading}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white text-sm focus:outline-none focus:border-teal-500 transition-colors disabled:opacity-60"
                  >
                    <option value="">{medicinesLoading ? "Loading..." : "Select..."}</option>
                    {medicineOptions.map(m => (
                      <option key={m.id} value={m.id}>{m.drugName} ({m.quantity} in stock)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={rxQuantity}
                    onChange={e => { setRxQuantity(e.target.value); setRxError(""); }}
                    placeholder="e.g. 10"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500 transition-colors"
                  />
                  {selectedMedicine && (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{selectedMedicine.quantity} available</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Dosage (optional)</label>
                  <input
                    type="text"
                    value={rxDosage}
                    onChange={e => setRxDosage(e.target.value)}
                    placeholder="e.g. 1-0-1 after food"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500 transition-colors"
                  />
                </div>
              </div>
              <button
                onClick={handleAddPrescription}
                disabled={rxSaving}
                className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-400 text-white font-semibold px-4 py-2 rounded-xl hover:scale-[1.02] transition-transform shadow-lg shadow-teal-500/20 text-sm disabled:opacity-60 disabled:hover:scale-100"
              >
                {rxSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {rxSaving ? "Adding..." : "Add to Prescription"}
              </button>
            </div>

            {(!p.prescribedMedicines || p.prescribedMedicines.length === 0) ? (
              <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-4">No medicines prescribed yet.</p>
            ) : (
              <div className="space-y-2">
                {p.prescribedMedicines.map(pm => (
                  <div key={pm.id} className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="text-slate-800 dark:text-white font-medium text-sm truncate">{pm.drugName} × {pm.quantity}</div>
                      {pm.dosageInstructions && (
                        <div className="text-slate-400 dark:text-slate-500 text-xs truncate">{pm.dosageInstructions}</div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeletePrescription(pm.id)}
                      disabled={deletingRxId === pm.id}
                      title="Delete record (does not restore stock)"
                      className="flex-shrink-0 p-2 rounded-lg text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 border border-red-100 dark:border-red-500/10 transition-colors disabled:opacity-50"
                    >
                      {deletingRxId === pm.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-start gap-1.5">
              <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
              Deleting a record does not restore stock automatically — correct inventory manually via Pharmacy's Add Stock if needed.
            </p>
          </div>
        </SectionCard>

        <SectionCard title="Doctor Notes & Prescription" icon={Stethoscope}>
          {isDoctor ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Diagnosis</label>
                <textarea
                  value={doctorForm.diagnosis}
                  onChange={e => setDoctorForm(f => ({ ...f, diagnosis: e.target.value }))}
                  placeholder="Enter diagnosis..."
                  rows={2}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-teal-500 text-sm transition-colors resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">General Prescription Notes</label>
                <textarea
                  value={doctorForm.prescription}
                  onChange={e => setDoctorForm(f => ({ ...f, prescription: e.target.value }))}
                  placeholder="Instructions not tied to a specific pharmacy medicine..."
                  rows={3}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-teal-500 text-sm transition-colors resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Doctor Notes</label>
                <textarea
                  value={doctorForm.doctorNotes}
                  onChange={e => setDoctorForm(f => ({ ...f, doctorNotes: e.target.value }))}
                  placeholder="Additional doctor notes..."
                  rows={2}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-teal-500 text-sm transition-colors resize-none"
                />
              </div>
              <button
                onClick={handleDoctorSave}
                disabled={saving}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-70 ${
                  saved
                    ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30"
                    : "bg-teal-50 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/30 hover:bg-teal-100 dark:hover:bg-teal-500/30"
                }`}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? "Saving..." : saved ? "Saved!" : "Save Notes"}
              </button>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              {[
                { label: "Diagnosis",    val: p.diagnosis },
                { label: "General Prescription Notes", val: p.prescription },
                { label: "Doctor Notes", val: p.doctorNotes },
              ].map(item => (
                <div key={item.label}>
                  <div className="text-slate-400 dark:text-slate-500 text-xs mb-0.5">{item.label}</div>
                  <div className="text-slate-700 dark:text-slate-300 break-words">{item.val || <span className="text-slate-300 dark:text-slate-600 italic">Not filled yet</span>}</div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}