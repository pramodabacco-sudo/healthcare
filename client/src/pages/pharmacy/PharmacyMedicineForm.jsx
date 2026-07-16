// client/src/pages/pharmacy/PharmacyMedicineForm.jsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader, FormInput, FormSelect, FormTextarea, SectionCard } from "../../components/UI";
import { ArrowLeft, Pill, Package, DollarSign, Truck, FileText, Save, X, Plus, Loader2, Layers, Copy } from "lucide-react";
import { api } from "../../lib/api";

const defaultForm = {
  serialNumber: "",
  drugName: "",
  genericName: "",
  category: "",
  manufacturer: "",
  batchNumber: "",
  purchasePrice: "",
  sellingPrice: "",
  quantity: "",
  reorderLevel: "",
  expiryDate: "",
  supplierName: "",
  notes: "",
};

// Small inline modal for adding a new category on the fly, without leaving
// the Add Medicine form. Kept in this file since it's only used here for now.
function AddCategoryModal({ onCancel, onCreated }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!name.trim()) { setError("Enter a category name."); return; }
    setSaving(true);
    setError("");
    try {
      const { category } = await api.post("/pharmacy/categories", { name: name.trim() });
      onCreated(category);
    } catch (err) {
      setError(err.message || "Could not create category.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-4">
          <Plus className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="text-slate-800 dark:text-white font-bold text-lg mb-1">Add Category</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
          Create a new medicine category. It'll be available immediately in the dropdown.
        </p>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setError(""); }}
          onKeyDown={e => e.key === "Enter" && handleSave()}
          placeholder="e.g. Antiviral"
          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-teal-500 text-sm transition-colors mb-2"
        />
        {error && <p className="text-red-500 dark:text-red-400 text-xs font-medium mb-2">{error}</p>}
        <div className="flex gap-3 mt-3">
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium text-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <X className="w-4 h-4" /> Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-colors font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PharmacyMedicineForm({ medicines, setMedicines, editMedicine, onDone }) {
  const { id: routeId } = useParams();
  // editMedicine only arrives as a prop when we got here via in-app
  // navigation (e.g. clicking Edit from a list that already has the data
  // in memory). If this component was mounted straight from the URL —
  // a new tab, a refresh, a shared link — there's no in-memory medicine to
  // receive, even though the URL clearly has the id. In that case we fetch
  // it ourselves using the :id route param.
  const needsFetch = !editMedicine && !!routeId;
  const [fetchedMedicine, setFetchedMedicine] = useState(null);
  const [fetchingMedicine, setFetchingMedicine] = useState(needsFetch);
  const [fetchError, setFetchError] = useState("");

  const activeEditMedicine = editMedicine || fetchedMedicine;

  const [form, setForm] = useState(editMedicine || defaultForm);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [existingMedicines, setExistingMedicines] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!needsFetch) return;
    (async () => {
      setFetchingMedicine(true);
      setFetchError("");
      try {
        const { medicine } = await api.get(`/pharmacy/medicines/${routeId}`);
        setFetchedMedicine(medicine);
        setForm(medicine);
      } catch (err) {
        setFetchError(err.message || "Could not load this medicine.");
      } finally {
        setFetchingMedicine(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId]);

  // Load the full medicine list once so we can spot "this drug already has
  // other batches" while the pharmacist is typing the drug name below. Only
  // relevant when adding a NEW medicine — editing an existing row doesn't
  // need this lookup.
  useEffect(() => {
    if (editMedicine || needsFetch) return;
    (async () => {
      try {
        const { medicines: data } = await api.get("/pharmacy/medicines");
        setExistingMedicines(data);
      } catch {
        // silent — this is a helpful-hint feature, not a blocking one; the
        // form still works fine without it if this fetch fails
      }
    })();
  }, [editMedicine, needsFetch]);

  // Substring match (not exact) so partial typing like "para" surfaces
  // "Paracetamol 500mg" as the pharmacist types — this is meant to work like
  // live autocomplete, not just catch an already-complete name. Requires at
  // least 3 characters so it doesn't fire on every single keystroke.
  // Results are grouped by exact drug name, since a short substring (e.g.
  // "cet") could otherwise match several unrelated drugs at once.
  const typed = form.drugName.trim().toLowerCase();
  const matchedGroups = typed.length >= 3
    ? Object.values(
        existingMedicines
          .filter((m) => m.drugName.toLowerCase().includes(typed))
          .reduce((groups, m) => {
            const key = m.drugName.trim().toLowerCase();
            (groups[key] ||= { drugName: m.drugName, batches: [] }).batches.push(m);
            return groups;
          }, {})
      )
    : [];

  // Copies the non-batch-specific fields from an existing entry as a starting
  // point — Medicine ID, Batch Number, Quantity, and Expiry Date are left for
  // the pharmacist to fill in fresh, since those must differ per batch.
  const useAsTemplate = (m) => {
    setForm((f) => ({
      ...f,
      drugName: m.drugName,
      genericName: m.genericName || "",
      category: m.category || "",
      manufacturer: m.manufacturer || "",
      purchasePrice: m.purchasePrice ?? "",
      sellingPrice: m.sellingPrice ?? "",
      reorderLevel: m.reorderLevel ?? "",
      supplierName: m.supplierName || "",
      notes: m.notes || "",
    }));
  };

  const fetchCategories = async () => {
    setCategoriesLoading(true);
    try {
      const { categories: data } = await api.get("/pharmacy/categories");
      setCategories(data);
    } catch (err) {
      setError(err.message || "Could not load categories.");
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const set = (field) => (val) => setForm(f => ({ ...f, [field]: val }));

  const handleCategoryCreated = (category) => {
    setCategories(cats => [...cats, category].sort((a, b) => a.name.localeCompare(b.name)));
    setForm(f => ({ ...f, category: category.name })); // auto-select the new one
    setShowAddCategory(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    if (activeEditMedicine) {
      const payload = {
        ...form,
        purchasePrice: parseFloat(form.purchasePrice) || 0,
        sellingPrice: parseFloat(form.sellingPrice) || 0,
        quantity: parseInt(form.quantity) || 0,
        reorderLevel: parseInt(form.reorderLevel) || 0,
      };
      try {
        const { medicine: updated } = await api.put(`/pharmacy/medicines/${activeEditMedicine.id}`, payload);
        // setMedicines is only available when this form was rendered from
        // a parent that already has the list in memory (e.g. navigated to
        // in-app). When opened fresh via URL, there's nothing to sync
        // locally — the API call above is the source of truth either way.
        if (setMedicines) {
          setMedicines(ms => ms.map(m => m.id === updated.id ? updated : m));
        }
        if (onDone) onDone(updated); else navigate("/pharmacy/medicines");
      } catch (err) {
        setError(err.message || "Could not update this medicine. Please try again.");
      } finally {
        setSaving(false);
      }
      return;
    }

    try {
      await api.post("/pharmacy/medicines", form);
      if (onDone) onDone(); else navigate("/pharmacy/medicines");
    } catch (err) {
      setError(err.message || "Could not add this medicine. Please try again.");
      setSaving(false);
    }
  };

  const back = () => onDone ? onDone() : navigate("/pharmacy/medicines");

  // Profit margin
  const margin = form.sellingPrice && form.purchasePrice
    ? (((parseFloat(form.sellingPrice) - parseFloat(form.purchasePrice)) / parseFloat(form.purchasePrice)) * 100).toFixed(1)
    : null;

  if (fetchingMedicine) {
    return (
      <div className="w-full px-2 sm:px-4 max-w-6xl mx-auto">
        <PageHeader title="Edit Medicine" subtitle="Pharmacy inventory management" />
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 text-sm font-medium">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading medicine...
          </div>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="w-full px-2 sm:px-4 max-w-6xl mx-auto">
        <PageHeader
          title="Edit Medicine"
          subtitle="Pharmacy inventory management"
          action={
            <button onClick={back} className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-sm font-medium transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          }
        />
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl px-4 py-3 text-rose-600 dark:text-rose-400 text-sm font-medium mb-4">
          {fetchError}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-2 sm:px-4 max-w-6xl mx-auto">
      <PageHeader
        title={activeEditMedicine ? "Edit Medicine" : "Add Medicine"}
        subtitle="Pharmacy inventory management"
        action={
          <button onClick={back} className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-sm font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        }
      />

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl px-4 py-3 text-rose-600 dark:text-rose-400 text-sm font-medium mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 w-full">
        <SectionCard title="Drug Information" icon={Pill}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <FormInput label="Serial / Medicine ID" value={form.serialNumber} onChange={set("serialNumber")} placeholder="MED-001" required />
            <FormInput label="Drug Name"             value={form.drugName}     onChange={set("drugName")}     placeholder="e.g. Paracetamol 500mg" required />
            <FormInput label="Generic Name"          value={form.genericName}  onChange={set("genericName")}  placeholder="e.g. Acetaminophen" />

            {/* Category — dynamic dropdown + inline Add Category button */}
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Category<span className="text-red-500 ml-1">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={form.category}
                  onChange={e => set("category")(e.target.value)}
                  required
                  disabled={categoriesLoading}
                  className="flex-1 min-w-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-800 dark:text-white focus:outline-none focus:border-teal-500 dark:focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 text-sm transition-colors disabled:opacity-60"
                >
                  <option value="">{categoriesLoading ? "Loading..." : "Select..."}</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => setShowAddCategory(true)}
                  title="Add new category"
                  className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/25 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <FormInput label="Manufacturer"          value={form.manufacturer} onChange={set("manufacturer")} placeholder="e.g. Sun Pharma" />
            <FormInput label="Batch Number"          value={form.batchNumber}  onChange={set("batchNumber")}  placeholder="e.g. BTH-2024-001" required />
          </div>

          {/* Existing-drug reference panel — only while adding (not editing).
              Substring-matches as you type, grouped by exact drug name since
              a short search term could match more than one drug. Purely
              informational + a prefill shortcut; submitting always creates a
              brand-new row, never merges into these. */}
          {!activeEditMedicine && matchedGroups.length > 0 && (
            <div className="mt-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                  {matchedGroups.length === 1
                    ? `${matchedGroups[0].drugName} already in inventory`
                    : `${matchedGroups.length} matching drugs already in inventory`}
                </p>
              </div>

              {matchedGroups.map((group) => (
                <div key={group.drugName}>
                  {matchedGroups.length > 1 && (
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1.5">{group.drugName}</p>
                  )}
                  <div className="space-y-2">
                    {group.batches.map((m) => (
                      <div
                        key={m.id}
                        className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-700 rounded-xl px-3.5 py-2.5"
                      >
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <span>Batch: <span className="font-mono text-slate-700 dark:text-slate-300">{m.batchNumber}</span></span>
                          <span>Category: <span className="text-slate-700 dark:text-slate-300">{m.category}</span></span>
                          <span>In Stock: <span className={`font-semibold ${m.quantity === 0 ? "text-red-500 dark:text-red-400" : "text-slate-700 dark:text-slate-300"}`}>{m.quantity}</span></span>
                          <span>Expiry: <span className="text-slate-700 dark:text-slate-300">{m.expiryDate}</span></span>
                        </div>
                        <button
                          type="button"
                          onClick={() => useAsTemplate(m)}
                          className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                        >
                          <Copy className="w-3.5 h-3.5" /> Use as template
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <p className="text-[11px] text-blue-700/70 dark:text-blue-400/70">
                This will start a new, separate batch — Medicine ID, Batch Number, Quantity, and Expiry Date still need to be entered fresh below.
              </p>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Pricing" icon={DollarSign}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormInput label="Purchase Price (₹)" type="number" value={form.purchasePrice} onChange={set("purchasePrice")} placeholder="0.00" required />
            <FormInput label="Selling Price (₹)"  type="number" value={form.sellingPrice}  onChange={set("sellingPrice")}  placeholder="0.00" required />
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Profit Margin</label>
              <div className={`rounded-xl px-4 py-2.5 font-bold text-lg border ${
                margin === null
                  ? "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-transparent text-slate-400 dark:text-slate-500"
                  : parseFloat(margin) >= 0
                  ? "bg-emerald-50 dark:bg-slate-800/50 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-50 dark:bg-slate-800/50 border-red-200 dark:border-red-500/20 text-red-500 dark:text-red-400"
              }`}>
                {margin !== null ? `${margin}%` : "—"}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Stock & Expiry" icon={Package}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormInput label="Quantity In Stock"    type="number" value={form.quantity}     onChange={set("quantity")}     placeholder="0" required />
            <FormInput label="Reorder Level"        type="number" value={form.reorderLevel} onChange={set("reorderLevel")} placeholder="50" />
            <FormInput label="Expiry Date"          type="date"   value={form.expiryDate}   onChange={set("expiryDate")}   required />
          </div>
        </SectionCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SectionCard title="Supplier Details" icon={Truck}>
            <FormInput label="Supplier Name" value={form.supplierName} onChange={set("supplierName")} placeholder="Distributor / Supplier name" />
          </SectionCard>

          <SectionCard title="Notes" icon={FileText}>
            <FormTextarea label="Storage & Usage Notes" value={form.notes} onChange={set("notes")} placeholder="Storage conditions, usage instructions..." />
          </SectionCard>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-semibold px-6 py-2.5 rounded-xl hover:scale-[1.02] transition-transform shadow-lg shadow-emerald-500/20 text-sm disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : activeEditMedicine ? "Update Medicine" : "Add Medicine"}
          </button>
          <button
            type="button"
            onClick={back}
            disabled={saving}
            className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium px-6 py-2.5 rounded-xl text-sm transition-colors border border-slate-200 dark:border-slate-700 disabled:opacity-60"
          >
            <X className="w-4 h-4" /> Cancel
          </button>
        </div>
      </form>

      {showAddCategory && (
        <AddCategoryModal
          onCancel={() => setShowAddCategory(false)}
          onCreated={handleCategoryCreated}
        />
      )}
    </div>
  );
}