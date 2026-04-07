import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "../components/Sidebar.jsx";
import "../assets/styles/addbusiness.css";
import Cookies from "js-cookie";

// ── Axios instance ─────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta?.env?.VITE_API_BASE_URL || "https://reservation-xynh.onrender.com",
  withCredentials: true,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get("access_token") || localStorage.getItem("access_token");
  if (token) config.headers["Authorization"] = `Bearer ${token}`;
  return config;
});

// ── Error formatter ────────────────────────────────────────────────────────
const formatBackendError = (err) => {
  const detail = err?.response?.data?.detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => {
        const path = Array.isArray(d?.loc) ? d.loc.join(".") : "";
        const msg = d?.msg || JSON.stringify(d);
        return path ? `${path}: ${msg}` : msg;
      })
      .join("\n");
  }
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    "Request failed. Please try again."
  );
};

const generateSlug = (name) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-") + "-" + Date.now();

const STANDARD_TYPES = ["Health Clinic", "Dental Clinic", "Restaurant", "Salon", "Fitness", "Cafe"];

// ── Logo upload helper: tries multiple field names ─────────────────────────
const uploadLogoWithFallback = async (businessId, file) => {
  const fieldNames = ["file", "logo", "image", "business_logo", "logo_file", "img"];
  const tried = new Set();
  let lastErr = null;

  const tryUpload = async (fieldName) => {
    if (tried.has(fieldName)) return null;
    tried.add(fieldName);

    try {
      const formData = new FormData();
      formData.append(fieldName, file);
      const res = await api.post(`/api/v1/admin/businesses/${businessId}/logo`, formData, { headers: { "Content-Type": "multipart/form-data" }, });
      return res.data;
    } catch (err) {
      lastErr = err;
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;

      console.warn(`Upload failed for field "${fieldName}":`, status, detail);

      // If FastAPI (422) tells us which field is missing, try to extract it!
      if (status === 422 && Array.isArray(detail)) {
        for (const d of detail) {
          // loc usually looks like ["body", "logo_file"] or ["body", "file"]
          if (Array.isArray(d.loc) && d.loc.length > 1) {
            const discoveredField = d.loc[d.loc.length - 1];
            if (!tried.has(discoveredField)) {
              console.log(`Discovered required field name from server: "${discoveredField}"`);
              return await tryUpload(discoveredField);
            }
          }
        }
      }
      return null;
    }
  };

  // Initial sequence
  for (const name of fieldNames) {
    const success = await tryUpload(name);
    if (success) return success;
  }

  // Final reported error
  const lastDetail = lastErr?.response?.data?.detail;
  let specificMsg = "";
  if (Array.isArray(lastDetail) && lastDetail[0]?.loc) {
    specificMsg = ` (Server requested: ${lastDetail[0].loc.join('.')})`;
  }
  throw lastErr ?? new Error("Logo upload failed — no valid field name accepted by server." + specificMsg);
};

// ── Component ──────────────────────────────────────────────────────────────
const AddBusinessPage = () => {
  const navigate = useNavigate();

  const [businessCards, setBusinessCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAllCards, setShowAllCards] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("USA");
  const [timezone, setTimezone] = useState("UTC");
  const [businessType, setBusinessType] = useState("");
  const [otherService, setOtherService] = useState("");
  const [customServices, setCustomServices] = useState([]);

  const [cardServices, setCardServices] = useState({});
  const [newServiceInputs, setNewServiceInputs] = useState({});
  const [svcLoading, setSvcLoading] = useState({});
  const [svcError, setSvcError] = useState({});

  const [formServices, setFormServices] = useState([]);
  const [newFormService, setNewFormService] = useState("");

  const [editingCardId, setEditingCardId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editPendingAdd, setEditPendingAdd] = useState([]);
  const [editPendingDelete, setEditPendingDelete] = useState([]);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  // Separate logo state for the edit card flow
  const [editLogoFile, setEditLogoFile] = useState(null);
  const [editLogoPreview, setEditLogoPreview] = useState(null);

  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const res = await api.get("/api/v1/admin/businesses/");
        const list = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
        setBusinessCards(list);

        const extras = list
          .map((b) => b.service_type_name)
          .filter((t) => t && !STANDARD_TYPES.includes(t));
        setCustomServices([...new Set(extras)]);

        const serviceResults = await Promise.allSettled(
          list.map((b) => api.get(`/api/v1/admin/businesses/${b.id}/services`))
        );

        const servicesMap = {};
        list.forEach((b, i) => {
          const result = serviceResults[i];
          if (result.status === "fulfilled") {
            const raw = result.value.data?.data ?? result.value.data ?? [];
            servicesMap[b.id] = Array.isArray(raw)
              ? raw.map((s) => ({ id: String(s.id ?? s._id ?? ""), name: s.name ?? s.service_name ?? s }))
              : [];
          } else {
            servicesMap[b.id] = [];
          }
        });
        setCardServices(servicesMap);
      } catch (err) {
        setError(formatBackendError(err));
      } finally {
        setLoading(false);
      }
    };
    fetchBusinesses();
  }, []);

  const refreshBusinessList = async () => {
    const res = await api.get("/api/v1/admin/businesses/");
    const list = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    setBusinessCards(list);
    return list;
  };

  const handleEdit = (business) => {
    setEditingCardId(business.id);
    setEditFormData({
      business_name: business.business_name ?? "",
      slug: business.slug ?? "",
      description: business.description ?? "",
      logo: business.logo ?? "",
      service_type_name: business.service_type_name ?? "",
      contact_fullname: business.contact_fullname ?? "",
      contact_email: business.contact_email ?? "",
      contact_phone: business.contact_phone ?? "",
      street_address: business.street_address ?? "",
      city: business.city ?? "",
      state: business.state ?? "",
      zip_code: business.zip_code ?? "",
      country: business.country || "USA",
      timezone: business.timezone || "UTC",
    });
    setEditPendingAdd([]);
    setEditPendingDelete([]);
    setEditLogoFile(null);
    setEditLogoPreview(null);
  };

  const handleCancelEdit = () => {
    setEditingCardId(null);
    setEditFormData({});
    setEditPendingAdd([]);
    setEditPendingDelete([]);
    setEditLogoFile(null);
    setEditLogoPreview(null);
  };

  const handleEditFieldChange = (field, value) =>
    setEditFormData((prev) => ({ ...prev, [field]: value }));

  // Logo change for NEW business form
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  // Logo change for EDIT card
  const handleEditLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setEditLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setEditLogoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleAddServiceToCard = (business_id) => {
    const newServiceName = newServiceInputs[business_id]?.trim();
    if (!newServiceName) return;
    const existing = cardServices[business_id] || [];
    const alreadyPending = editPendingAdd.some(
      (s) => s.service_name.toLowerCase() === newServiceName.toLowerCase()
    );
    if (existing.some((s) => s.name.toLowerCase() === newServiceName.toLowerCase()) || alreadyPending) {
      setSvcError((prev) => ({ ...prev, [business_id]: "This service already exists." }));
      return;
    }
    const tempId = `temp_${Date.now()}`;
    setCardServices((prev) => ({
      ...prev,
      [business_id]: [...(prev[business_id] || []), { id: tempId, name: newServiceName }],
    }));
    setEditPendingAdd((prev) => [...prev, { service_name: newServiceName, _tempId: tempId }]);
    setNewServiceInputs((prev) => ({ ...prev, [business_id]: "" }));
    setSvcError((prev) => ({ ...prev, [business_id]: null }));
  };

  const handleRemoveServiceFromCard = (business_id, service) => {
    if (!window.confirm(`Remove "${service.name}"?`)) return;
    setCardServices((prev) => ({
      ...prev,
      [business_id]: (prev[business_id] || []).filter((s) => s.id !== service.id),
    }));
    if (service.id.startsWith("temp_")) {
      setEditPendingAdd((prev) => prev.filter((s) => s._tempId !== service.id));
    } else {
      setEditPendingDelete((prev) => [...prev, service.id]);
    }
  };

  const handleServiceInputChange = (business_id, value) => {
    setNewServiceInputs((prev) => ({ ...prev, [business_id]: value }));
    setSvcError((prev) => ({ ...prev, [business_id]: null }));
  };

  const handleUpdateBusiness = async (business_id) => {
    setSvcLoading((prev) => ({ ...prev, [business_id]: true }));
    setError("");
    const payload = {
      business_name: editFormData.business_name?.trim() || undefined,
      description: editFormData.description?.trim() || null,
      service_name: editFormData.service_type_name || null,
      contact_fullname: editFormData.contact_fullname?.trim() || null,
      contact_email: editFormData.contact_email?.trim() || undefined,
      contact_phone: editFormData.contact_phone?.trim() || null,
      street_address: editFormData.street_address?.trim() || null,
      city: editFormData.city?.trim() || null,
      state: editFormData.state?.trim() || undefined,
      zip_code: editFormData.zip_code?.trim() || null,
      country: editFormData.country || "USA",
      timezone: editFormData.timezone || "UTC",
      add_services: editPendingAdd.length > 0 ? editPendingAdd.map(({ service_name }) => ({ service_name })) : null,
      delete_service_ids: editPendingDelete.length > 0 ? editPendingDelete : null,
    };
    try {
      const res = await api.patch(`/api/v1/admin/businesses/${business_id}`, payload);
      const updated = res.data?.data ?? res.data;
      setBusinessCards((prev) => prev.map((b) => (b.id === business_id ? { ...b, ...updated } : b)));

      // Upload logo if a new file was selected in the edit form
      if (editLogoFile) {
        try {
          await uploadLogoWithFallback(business_id, editLogoFile);
          await refreshBusinessList();
        } catch (logoErr) {
          setError("Business updated but logo upload failed: " + formatBackendError(logoErr));
        }
        setEditLogoFile(null);
        setEditLogoPreview(null);
      }

      try {
        const sRes = await api.get(`/api/v1/admin/businesses/${business_id}/services`);
        const sRaw = sRes.data?.data ?? sRes.data ?? [];
        setCardServices((prev) => ({
          ...prev,
          [business_id]: Array.isArray(sRaw)
            ? sRaw.map((s) => ({ id: String(s.id ?? s._id ?? ""), name: s.name ?? s.service_name ?? s }))
            : [],
        }));
      } catch { /* non-critical */ }

      setEditingCardId(null);
      setEditFormData({});
      setEditPendingAdd([]);
      setEditPendingDelete([]);
    } catch (err) {
      setError(formatBackendError(err));
    } finally {
      setSvcLoading((prev) => ({ ...prev, [business_id]: false }));
    }
  };

  const handleDeleteBusiness = async (business_id) => {
    if (!window.confirm("Are you sure you want to delete this business?")) return;
    try {
      await api.delete(`/api/v1/admin/businesses/${business_id}`);
      setBusinessCards((prev) => prev.filter((b) => b.id !== business_id));
      setCardServices((prev) => { const n = { ...prev }; delete n[business_id]; return n; });
    } catch (err) {
      setError(formatBackendError(err));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // ── Capture logo file NOW before any state resets ──
    const capturedLogoFile = logoFile;

    const newCard = Object.fromEntries(
      Object.entries({
        business_name: businessName.trim(),
        slug: slug.trim(),
        description: businessDescription.trim(),
        service_name: businessType.trim(),
        contact_fullname: contactName.trim(),
        contact_email: email.trim(),
        contact_phone: phone.trim(),
        street_address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        zip_code: zipCode.trim(),
        country: country.trim() || "USA",
        timezone: timezone.trim() || "UTC",
      }).filter(([, v]) => v !== "")
    );

    try {
      const res = await api.post("/api/v1/admin/businesses/", newCard);
      const created = res.data?.data ?? res.data;

      // ── Reset form fields immediately ──
      setBusinessName(""); setSlug(""); setBusinessDescription("");
      setLogoFile(null); setLogoPreview(null);
      setContactName(""); setEmail(""); setPhone("");
      setAddress(""); setCity(""); setState(""); setZipCode("");
      setCountry("USA"); setTimezone("UTC");
      setBusinessType(""); setOtherService("");
      setFormServices([]);

      // ── Upload logo using captured file reference ──
      if (capturedLogoFile) {
        try {
          await uploadLogoWithFallback(created.id, capturedLogoFile);
        } catch (logoErr) {
          console.error("Logo upload failed:", logoErr);
          setError("Business created but logo upload failed: " + formatBackendError(logoErr));
        }
      }

      // ── Add services ──
      if (formServices.length > 0) {
        try {
          await api.patch(`/api/v1/admin/businesses/${created.id}`, {
            add_services: formServices.map((s) => ({ service_name: s })),
            delete_service_ids: null,
          });
        } catch (svcErr) {
          console.error("Non-critical: services failed to save", svcErr);
        }
      }

      // ── Refresh list to pick up logo URL & services from server ──
      const updatedList = await refreshBusinessList();
      setCardServices((prev) => ({ ...prev, [created.id]: [] }));

      // Fetch services for the new business
      try {
        const sRes = await api.get(`/api/v1/admin/businesses/${created.id}/services`);
        const sRaw = sRes.data?.data ?? sRes.data ?? [];
        setCardServices((prev) => ({
          ...prev,
          [created.id]: Array.isArray(sRaw)
            ? sRaw.map((s) => ({ id: String(s.id ?? s._id ?? ""), name: s.name ?? s.service_name ?? s }))
            : [],
        }));
      } catch { /* non-critical */ }

    } catch (err) {
      setError(formatBackendError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomService = () => {
    const val = otherService.trim();
    if (val && !customServices.includes(val)) {
      setCustomServices((prev) => [...prev, val]);
      setBusinessType(val);
      setOtherService("");
    }
  };

  const handleAddFormService = () => {
    const val = newFormService.trim();
    if (!val || formServices.includes(val)) return;
    setFormServices((prev) => [...prev, val]);
    setNewFormService("");
  };

  const handleRemoveFormService = (val) => {
    setFormServices((prev) => prev.filter((s) => s !== val));
  };

  return (
    <div className="add-business-container">
      <Sidebar />
      <main className="add-business-content">
        <header className="navbar">
          <div className="navbar-content">
            <h2 className="navbar-title">Add New Business</h2>
            <p className="navbar-subtitle">Set up a new business to use the AI Receptionist system.</p>
          </div>
        </header>

        <div className="page-stack">
          <section className="business-cards-section">
            <h3 className="section-title">Businesses</h3>
            {loading && <p className="loading-text">Loading businesses...</p>}
            {error && <p className="error-message">{error}</p>}

            <div className="business-cards-grid">
              {(showAllCards ? businessCards : businessCards.slice(0, 3)).map((b) => (
                <div key={b.id} className="business-card">
                  <div className="business-card-head">
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                        {b.logo_url && (
                          <img
                            src={b.logo_url}
                            alt={`${b.business_name} logo`}
                            style={{ width: "32px", height: "32px", objectFit: "cover", borderRadius: "6px", border: "1px solid #e5e7eb" }}
                            onError={(e) => { e.target.style.display = "none"; }}
                          />
                        )}
                        <h4 className="business-card-title" style={{ margin: 0 }}>{b.business_name}</h4>
                      </div>
                      {/* <span className="business-card-sub">{b.service_type_name}</span> */}
                    </div>
                    <div className="card-actions">
                      {editingCardId === b.id ? (
                        <>
                          <button className="card-btn" onClick={() => handleUpdateBusiness(b.id)} disabled={svcLoading[b.id]}>
                            {svcLoading[b.id] ? "Saving…" : "Update"}
                          </button>
                          <button className="card-btn secondary" onClick={handleCancelEdit}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button className="card-btn" onClick={() => handleEdit(b)}>Edit</button>
                          <button className="card-btn delete-btn" onClick={() => handleDeleteBusiness(b.id)}>Delete</button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="business-card-content">
                    {editingCardId === b.id ? (
                      <div className="business-card-edit">
                        <div className="edit-grid">
                          <div className="edit-field"><label>Business Name</label><input type="text" value={editFormData.business_name || ""} onChange={(e) => handleEditFieldChange("business_name", e.target.value)} /></div>
                          <div className="edit-field"><label>Slug</label><input type="text" value={editFormData.slug || ""} onChange={(e) => handleEditFieldChange("slug", e.target.value)} /></div>
                          <div className="edit-field full"><label>Description</label><textarea value={editFormData.description || ""} onChange={(e) => handleEditFieldChange("description", e.target.value)} /></div>

                          {/* ── Edit Logo ── */}
                          <div className="edit-field full">
                            <label>Business Logo</label>
                            <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                              {/* Show current logo if no new file picked */}
                              {!editLogoPreview && b.logo_url && (
                                <img
                                  src={b.logo_url}
                                  alt="Current logo"
                                  style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "4px", border: "1px solid #e5e7eb" }}
                                  onError={(e) => { e.target.style.display = "none"; }}
                                />
                              )}
                              {editLogoPreview && (
                                <img
                                  src={editLogoPreview}
                                  alt="New logo preview"
                                  style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "4px", border: "2px solid #2563eb" }}
                                />
                              )}
                              <input type="file" accept="image/*" onChange={handleEditLogoChange} style={{ flex: 1 }} />
                              {editLogoFile && (
                                <span style={{ fontSize: "0.75rem", color: "#2563eb" }}>
                                  ✓ Will upload on save
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="edit-field full">
                            <label>Services</label>
                            {svcError[b.id] && <p className="svc-error-text">{svcError[b.id]}</p>}
                            {(editPendingAdd.length > 0 || editPendingDelete.length > 0) && (
                              <p className="svc-pending-hint" style={{ fontSize: "0.75rem", color: "#2563eb", marginBottom: "0.5rem" }}>
                                {editPendingAdd.length > 0 && `${editPendingAdd.length} service(s) to add`}
                                {editPendingAdd.length > 0 && editPendingDelete.length > 0 && " · "}
                                {editPendingDelete.length > 0 && `${editPendingDelete.length} service(s) to remove`}
                                {" — click Update to save"}
                              </p>
                            )}
                            <div className="service-section">
                              <div className="service-input-wrapper">
                                <input type="text" className="service-input" placeholder="Add a service" value={newServiceInputs[b.id] || ""} onChange={(e) => handleServiceInputChange(b.id, e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddServiceToCard(b.id); } }} />
                                <button className="add-service-btn" onClick={() => handleAddServiceToCard(b.id)} disabled={!newServiceInputs[b.id]?.trim()}>Add</button>
                              </div>
                              <div className="service-chips">
                                {(cardServices[b.id] || []).length > 0
                                  ? (cardServices[b.id] || []).map((service) => (
                                    <span key={service.id} className="chip chip-removable" onClick={() => handleRemoveServiceFromCard(b.id, service)} title="Click to remove">
                                      {service.name}
                                      {service.id.startsWith("temp_") && <span style={{ fontSize: "0.65rem", color: "#2563eb", marginLeft: "2px" }}>new</span>}
                                      <span className="chip-remove">×</span>
                                    </span>
                                  ))
                                  : <p className="no-services-text">No services added yet</p>}
                              </div>
                            </div>
                          </div>
                          <div className="edit-field"><label>Contact Person</label><input type="text" value={editFormData.contact_fullname || ""} onChange={(e) => handleEditFieldChange("contact_fullname", e.target.value)} /></div>
                          <div className="edit-field"><label>Email</label><input type="email" value={editFormData.contact_email || ""} onChange={(e) => handleEditFieldChange("contact_email", e.target.value)} /></div>
                          <div className="edit-field"><label>Phone</label><input type="tel" value={editFormData.contact_phone || ""} onChange={(e) => handleEditFieldChange("contact_phone", e.target.value)} /></div>
                          <div className="edit-field full"><label>Street Address</label><input type="text" value={editFormData.street_address || ""} onChange={(e) => handleEditFieldChange("street_address", e.target.value)} /></div>
                          <div className="edit-field"><label>City</label><input type="text" value={editFormData.city || ""} onChange={(e) => handleEditFieldChange("city", e.target.value)} /></div>
                          <div className="edit-field"><label>State</label><input type="text" value={editFormData.state || ""} onChange={(e) => handleEditFieldChange("state", e.target.value)} /></div>
                          <div className="edit-field"><label>Zip Code</label><input type="text" value={editFormData.zip_code || ""} onChange={(e) => handleEditFieldChange("zip_code", e.target.value)} /></div>
                          <div className="edit-field"><label>Country</label><input type="text" value={editFormData.country || ""} onChange={(e) => handleEditFieldChange("country", e.target.value)} /></div>
                          <div className="edit-field"><label>Timezone</label><input type="text" value={editFormData.timezone || ""} onChange={(e) => handleEditFieldChange("timezone", e.target.value)} /></div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="business-card-desc" style={{ textAlign: "left" }}>{b.description}</p>
                        <div className="business-card-info">
                          <div className="info-row"><span className="info-label">Contact:</span><span className="info-value">{b.contact_fullname}</span></div>
                          <div className="info-row"><span className="info-label">Email:</span><span className="info-value">{b.contact_email}</span></div>
                          <div className="info-row"><span className="info-label">Phone:</span><span className="info-value">{b.contact_phone}</span></div>
                          <div className="info-row"><span className="info-label">Address:</span><span className="info-value">{b.street_address}, {b.city}, {b.state} {b.zip_code}</span></div>
                        </div>
                        <div className="service-section-view">
                          <h4 className="services-title">Services</h4>
                          <div className="service-chips">
                            {(cardServices[b.id] || []).length > 0
                              ? (cardServices[b.id] || []).map((service) => (
                                <span key={service.id} className="chip chip-view">{service.name}</span>
                              ))
                              : <p className="no-services-text">No services available</p>}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {businessCards.length > 3 && (
              <div style={{ textAlign: "center", marginTop: "1rem" }}>
                <button className="card-btn" onClick={() => setShowAllCards((prev) => !prev)}>
                  {showAllCards ? "See Less ▲" : `See More (${businessCards.length - 3} more) ▼`}
                </button>
              </div>
            )}
          </section>

          <section className="form-section">
            <div className="form-card">
              <h3 className="section-title">Business Information</h3>
              <form onSubmit={handleSubmit}>
                <div className="form-group"><label>Business Name *</label><input type="text" value={businessName} onChange={(e) => { setBusinessName(e.target.value); setSlug(generateSlug(e.target.value)); }} placeholder="e.g., Downtown Health Clinic" required /></div>
                <div className="form-group"><label>Slug *</label><input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="e.g., downtown-health-clinic" required /><small style={{ color: "#6b7280", fontSize: "0.75rem" }}>Auto-generated. Must be unique.</small></div>
                <div className="form-group"><label>Description *</label><textarea value={businessDescription} onChange={(e) => setBusinessDescription(e.target.value)} placeholder="About your business" required /></div>

                {/* ── Logo with preview ── */}
                <div className="form-group">
                  <label>Logo</label>
                  <input type="file" accept="image/*" onChange={handleLogoChange} />
                  {logoPreview && (
                    <div style={{ marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        style={{ width: "56px", height: "56px", objectFit: "cover", borderRadius: "6px", border: "2px solid #2563eb" }}
                      />
                      <span style={{ fontSize: "0.8rem", color: "#2563eb" }}>✓ Logo selected — will upload after creation</span>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Service Type *</label>
                  <select value={businessType} onChange={(e) => setBusinessType(e.target.value)} required>
                    <option value="">Select a service type...</option>
                    {STANDARD_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                    <option value="Others (custom)">Others (custom)</option>
                    {customServices.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
                {businessType === "Others (custom)" && (
                  <div className="form-group">
                    <label>Custom Service Type</label>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <input type="text" value={otherService} onChange={(e) => setOtherService(e.target.value)} placeholder="Enter custom service type" />
                      <button type="button" onClick={handleAddCustomService} disabled={!otherService.trim()} style={{
                        padding: "0.80rem 1rem", border: "none", borderRadius: "var(--radius-md)",
                        backgroundColor: otherService.trim() ? "#4CAF50" : "#ccc", color: "white",
                        fontWeight: "600", fontSize: "0.875rem", cursor: otherService.trim() ? "pointer" : "not-allowed",
                        transition: "all var(--transition-base)", whiteSpace: "nowrap", height: "100%", marginTop: "0.5rem"
                      }}>Add Type</button>
                    </div>
                  </div>
                )}
                <div className="service-section">
                  <h4 className="section-title-small" style={{ color: "black", marginBottom: "1rem" }}>Services</h4>
                  <div className="service-input-wrapper">
                    <input type="text" className="service-input" placeholder="Add a service" value={newFormService} onChange={(e) => setNewFormService(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddFormService(); } }} />
                    <button type="button" className="add-service-btn" onClick={handleAddFormService} disabled={!newFormService.trim()}>Add</button>
                  </div>
                  <div className="service-chips">
                    {formServices.map((s) => (
                      <span key={s} className="chip chip-removable" onClick={() => handleRemoveFormService(s)} title="Click to remove">{s} <span className="chip-remove">×</span></span>
                    ))}
                  </div>
                </div>
                <div className="form-group"><label>Contact Name *</label><input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Full Name" required /></div>
                <div className="form-group"><label>Email *</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="business@example.com" required /></div>
                <div className="form-group"><label>Phone *</label><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+8801712345678" required /></div>
                <div className="form-group"><label>Street Address *</label><input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main Street" required /></div>
                <div className="form-group"><label>City *</label><input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" required /></div>
                <div className="form-group"><label>State *</label><input type="text" value={state} onChange={(e) => setState(e.target.value)} placeholder="State" required /></div>
                <div className="form-group"><label>Zip Code *</label><input type="text" value={zipCode} onChange={(e) => setZipCode(e.target.value)} placeholder="12345" required /></div>
                <div className="form-group"><label>Country *</label><input type="text" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="USA" required /></div>
                <div className="form-group"><label>Timezone *</label><input type="text" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="UTC" required /></div>
                <div className="footer-buttons">
                  <button className="cancel-btn" type="button" onClick={() => navigate("/adminBooking")}>Cancel</button>
                  <button className="submit-btn" type="submit" disabled={loading}>{loading ? "Adding Business..." : "Add Business"}</button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default AddBusinessPage;