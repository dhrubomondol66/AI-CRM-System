import React, { useState, useEffect } from 'react';
import { Save, Globe, Info, Database, Loader, CheckCircle, AlertCircle, Tag, Cpu, RefreshCw, Trash2, XCircle } from 'lucide-react';
import Sidebar from '../components/Sidebar.jsx';
import '../assets/styles/chatboconfig.css';
import axios from 'axios';
import Cookies from 'js-cookie';

// ── API Instance for Chatbot Configuration ──────────────────────────────────
const chatbotApi = axios.create({
  baseURL: import.meta.env.PROD ? 'https://ai-reservation.onrender.com' : '',
  headers: { 'Content-Type': 'application/json' }
});

// Add authentication interceptor
chatbotApi.interceptors.request.use(request => {
  const token = Cookies.get('access_token') || localStorage.getItem('access_token');
  if (token) {
    request.headers.Authorization = `Bearer ${token}`;
  }
  console.log('Chatbot Config API Request:', {
    method: request.method,
    url: request.url,
    baseURL: request.baseURL,
    fullURL: `${request.baseURL}${request.url}`,
    hasAuth: !!token
  });
  return request;
});

chatbotApi.interceptors.response.use(
  response => {
    console.log('Chatbot Config API Response:', { status: response.status, data: response.data });
    return response;
  },
  error => {
    console.error('Chatbot Config API Error:', { status: error.response?.status, data: error.response?.data, message: error.message });
    return Promise.reject(error);
  }
);

const ChatbotConfig = () => {
  const [config, setConfig] = useState({
    name: 'Business Name',
    website_url: 'https://www.domain.com/en',
    description: 'Business description',
    domain: 'General Business', // Will be auto-generated from description
    vector_data: { embeddings_data: {} }
  });

  const [businesses, setBusinesses] = useState([]);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [editingBusinessId, setEditingBusinessId] = useState(null); // Track which business is being edited

  // Ensure domain is always generated from description
  useEffect(() => {
    setConfig(prev => ({
      ...prev,
      domain: generateDomainFromDescription(prev.description)
    }));
  }, []); // Only run once on mount

  // const domains = [
  //   'Health & Wellness', 'Real Estate', 'Legal Services', 'E-commerce',
  //   'Customer Support', 'Education', 'Hospitality', 'Sports & Entertainment'
  // ];

  // Function to automatically generate domain from description
  const generateDomainFromDescription = (description) => {
    if (!description || description === 'Business description') {
      return 'General Business';
    }
    
    const desc = description.toLowerCase();
    
    // Domain mapping based on keywords in description
    if (desc.includes('health') || desc.includes('medical') || desc.includes('wellness') || desc.includes('fitness') || desc.includes('spa')) {
      return 'Health & Wellness';
    } else if (desc.includes('real estate') || desc.includes('property') || desc.includes('housing') || desc.includes('rental')) {
      return 'Real Estate';
    } else if (desc.includes('legal') || desc.includes('law') || desc.includes('attorney') || desc.includes('lawyer')) {
      return 'Legal Services';
    } else if (desc.includes('ecommerce') || desc.includes('shop') || desc.includes('store') || desc.includes('retail')) {
      return 'E-commerce';
    } else if (desc.includes('customer') || desc.includes('support') || desc.includes('service') || desc.includes('help')) {
      return 'Customer Support';
    } else if (desc.includes('education') || desc.includes('school') || desc.includes('training') || desc.includes('course')) {
      return 'Education';
    } else if (desc.includes('hospitality') || desc.includes('hotel') || desc.includes('restaurant') || desc.includes('food')) {
      return 'Hospitality';
    } else if (desc.includes('sports') || desc.includes('entertainment') || desc.includes('gaming') || desc.includes('events')) {
      return 'Sports & Entertainment';
    } else if (desc.includes('technology') || desc.includes('software') || desc.includes('it') || desc.includes('tech')) {
      return 'Technology';
    } else if (desc.includes('finance') || desc.includes('banking') || desc.includes('investment') || desc.includes('money')) {
      return 'Finance';
    } else {
      return 'General Business';
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => {
      const newConfig = { ...prev, [name]: value };
      
      // Auto-generate domain when description changes
      if (name === 'description') {
        newConfig.domain = generateDomainFromDescription(value);
      }
      
      return newConfig;
    });
  };

  // Edit mode handlers
  const handleEdit = (business) => {
    // Load business data into form but regenerate domain from description
    const editedBusiness = {
      ...business,
      domain: generateDomainFromDescription(business.description)
    };
    setConfig(editedBusiness);
    setEditingBusinessId(business.id);
  };

  const handleCancelEdit = () => {
    setEditingBusinessId(null);
    // Reset form to default values
    setConfig({
      name: 'Business Name',
      website_url: 'https://www.domain.com/en',
      description: 'Business description',
      domain: 'General Business', // Will be auto-generated from description
      vector_data: { embeddings_data: {} }
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      console.log('Saving business config:', config);
      
      // Try different data structures
      const dataVariations = [
        // Original structure
        config,
        // Flattened structure
        {
          business_name: config.name,
          website: config.website_url,
          business_description: config.description,
          business_domain: config.domain,
          ...config
        },
        // Backend-style structure
        {
          name: config.name,
          website_url: config.website_url,
          description: config.description,
          domain: config.domain,
          vector_data: config.vector_data,
          is_active: true,
          created_at: new Date().toISOString()
        },
        // Django/DRF style - nested data
        {
          name: config.name,
          website_url: config.website_url,
          description: config.description,
          domain: config.domain,
          metadata: {
            vector_data: config.vector_data,
            is_active: true
          }
        },
        // Minimal required fields
        {
          name: config.name,
          website_url: config.website_url,
          description: config.description,
          domain: config.domain
        },
        // Snake case fields
        {
          business_name: config.name,
          website_url: config.website_url,
          business_description: config.description,
          business_domain: config.domain,
          vector_data: config.vector_data
        }
      ];
      
      let response;
      let endpointTried = '';
      
      // Try businesses endpoint with different data structures
      for (let i = 0; i < dataVariations.length; i++) {
        try {
          console.log(`Trying data variation ${i + 1}:`, dataVariations[i]);
          response = await chatbotApi.post('/api/v1/businesses/', dataVariations[i]);
          endpointTried = `/api/v1/businesses/ (variation ${i + 1})`;
          break;
        } catch (businessErr) {
          console.log(`Data variation ${i + 1} failed:`, businessErr.response?.status);
          console.log(`Error response data:`, businessErr.response?.data);
          if (i === dataVariations.length - 1) {
            // Last variation failed, try /create/ endpoint
            try {
              console.log('All variations failed, trying /create/ endpoint');
              response = await chatbotApi.post('/create/', config);
              endpointTried = '/create/ (original)';
            } catch (createErr) {
              throw createErr;
            }
          }
        }
      }
      
      console.log('Bot Config successfully saved via:', endpointTried, response.data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Save error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        config: err.config
      });
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to save configuration. Please try again.';
      setSaveError(errorMsg);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (businessId) => {
    if (!window.confirm('Are you sure you want to delete this business configuration?')) return;
    try {
      console.log('Deleting business:', businessId);
      
      // Try different endpoint formats
      try {
        await chatbotApi.delete(`/api/v1/businesses/${businessId}`);
      } catch (noSlashErr) {
        console.log('No slash endpoint failed, trying with trailing slash:', noSlashErr.response?.status);
        await chatbotApi.delete(`/api/v1/businesses/${businessId}/`);
      }
      
      console.log('Business deleted successfully');
      handleFetch();
    } catch (err) {
      console.error('Delete error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        config: err.config
      });
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to delete business. Please try again.';
      setSaveError(errorMsg);
      setTimeout(() => setSaveError(null), 4000);
    }
  };

  const handleUpdate = async (businessId, updatedConfig) => {
    try {
      console.log('Updating business:', businessId, 'with data:', updatedConfig);
      
      // Prepare data variations for backend compatibility
      const dataVariations = [
        // Variation 1: Direct config with all fields
        {
          name: updatedConfig.name || config.name,
          website_url: updatedConfig.website_url || config.website_url,
          description: updatedConfig.description || config.description,
          vector_data: updatedConfig.vector_data || config.vector_data
        },
        // Variation 2: Minimal required fields
        {
          name: updatedConfig.name || config.name,
          website_url: updatedConfig.website_url || config.website_url,
          description: updatedConfig.description || config.description
        },
        // Variation 3: Only changed fields
        Object.fromEntries(
          Object.entries(updatedConfig).filter(([key, value]) => 
            value !== undefined && value !== null && value !== ''
          )
        ),
        // Variation 4: Backend field names
        {
          business_name: updatedConfig.name || config.name,
          website: updatedConfig.website_url || config.website_url,
          business_description: updatedConfig.description || config.description,
          embeddings: updatedConfig.vector_data || config.vector_data
        }
      ];
      
      // Try different endpoint formats and data variations
      let response;
      let endpointTried = '';
      
      for (let i = 0; i < dataVariations.length; i++) {
        try {
          console.log(`Trying data variation ${i + 1}:`, dataVariations[i]);
          
          // Try PATCH without trailing slash
          try {
            response = await chatbotApi.patch(`/api/v1/businesses/${businessId}`, dataVariations[i]);
            endpointTried = `/api/v1/businesses/${businessId} (variation ${i + 1})`;
            break;
          } catch (patchErr) {
            console.log(`PATCH without slash failed for variation ${i + 1}:`, patchErr.response?.status);
            
            // Try PATCH with trailing slash
            try {
              response = await chatbotApi.patch(`/api/v1/businesses/${businessId}/`, dataVariations[i]);
              endpointTried = `/api/v1/businesses/${businessId}/ (variation ${i + 1})`;
              break;
            } catch (patchSlashErr) {
              console.log(`PATCH with slash failed for variation ${i + 1}:`, patchSlashErr.response?.status);
              
              // Try PUT
              try {
                response = await chatbotApi.put(`/api/v1/businesses/${businessId}`, dataVariations[i]);
                endpointTried = `/api/v1/businesses/${businessId} PUT (variation ${i + 1})`;
                break;
              } catch (putErr) {
                console.log(`PUT failed for variation ${i + 1}:`, putErr.response?.status);
                
                if (i === dataVariations.length - 1) {
                  throw putErr; // Last variation, throw the error
                }
              }
            }
          }
        } catch (err) {
          if (i === dataVariations.length - 1) {
            throw err; // Last variation, throw the error
          }
        }
      }
      
      console.log('Business updated successfully via:', endpointTried, response.data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
      setEditingBusinessId(null); // Exit edit mode after successful update
      
      // Update local state immediately to show new domain
      setBusinesses(prev => prev.map(business => 
        business.id === businessId 
          ? { ...business, domain: config.domain } // Use the current config domain (which is auto-generated)
          : business
      ));
      
      handleFetch(); // Refresh the list from backend
    } catch (err) {
      console.error('Update error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        config: err.config
      });
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to update business. Please try again.';
      setSaveError(errorMsg);
      setTimeout(() => setSaveError(null), 4000);
    }
  };

  const handleFetch = async () => {
    try {
      const response = await chatbotApi.get('/api/v1/businesses/');
      if (typeof response.data === 'string' && response.data.includes('<!doctype html>')) {
        setBusinesses([]);
        return;
      }
      if (Array.isArray(response.data)) setBusinesses(response.data);
      else if (response.data.results && Array.isArray(response.data.results)) setBusinesses(response.data.results);
      else if (response.data && typeof response.data === 'object') setBusinesses([response.data]);
      else setBusinesses([]);
    } catch (err) {
      console.error('Error fetching chatbot config:', err);
      setBusinesses([]);
    }
  };

  return (
    <div className="cbc-root">
      <Sidebar />

      <main className="cbc-main">

        {/* ── Top Header ───────────────────────────────────────────────── */}
        <header className="cbc-header">
          <div className="cbc-header__text">
            <h1 className="cbc-header__title">Chatbot Configuration</h1>
            <p className="cbc-header__subtitle">Configure your AI chat widget's identity and core knowledge base.</p>
          </div>
          <div className="cbc-header__actions">
            <button className="cbc-btn cbc-btn--fetch" onClick={handleFetch}>
              <RefreshCw size={15} /> Fetch Config
            </button>
            <button className="cbc-btn cbc-btn--save" onClick={handleSave} disabled={saveLoading}>
              {saveLoading
                ? <><Loader size={14} className="cbc-spin" /> Saving…</>
                : <><Save size={15} /> Save Changes</>}
            </button>
          </div>
        </header>

        {/* ── Status Banners ────────────────────────────────────────────── */}
        {saveSuccess && (
          <div className="cbc-banner cbc-banner--success" role="status">
            <CheckCircle size={16} /><span>Chatbot configuration saved successfully!</span>
          </div>
        )}
        {saveError && (
          <div className="cbc-banner cbc-banner--error" role="alert">
            <AlertCircle size={16} /><span>{saveError}</span>
          </div>
        )}

        {/* ── Two-Column Body ───────────────────────────────────────────── */}
        <div className="cbc-body">

          {/* ══ LEFT COLUMN ══════════════════════════════════════════════ */}
          <div className="cbc-left">

            {/* Business Identity */}
            <section className="cbc-card">
              <div className="cbc-card__heading">
                <span className="cbc-card__icon cbc-card__icon--blue"><Info size={18} /></span>
                <h2 className="cbc-card__title">Business Identity</h2>
              </div>

              <div className="cbc-field">
                <label className="cbc-label">Business Name *</label>
                <input
                  type="text" name="name" maxLength={255}
                  className="cbc-input"
                  value={config.name} onChange={handleInputChange}
                  placeholder="e.g. Acme Corporation" required
                />
              </div>

              <div className="cbc-field">
                <label className="cbc-label">Website URL *</label>
                <div className="cbc-input-icon-wrap">
                  <Globe size={15} className="cbc-input-icon" />
                  <input
                    type="url" name="website_url" maxLength={200}
                    className="cbc-input cbc-input--icon"
                    value={config.website_url} onChange={handleInputChange}
                    placeholder="https://www.yourbusiness.com" required
                  />
                </div>
              </div>

              {/* <div className="cbc-field">
                <label className="cbc-label">Service Domain *</label>
                <div className="cbc-input-icon-wrap">
                  <Tag size={15} className="cbc-input-icon" />
                  <input
                    type="text"
                    className="cbc-input cbc-input--icon"
                    value={config.domain}
                    readOnly
                    style={{ backgroundColor: '#f5f5f5', cursor: 'default' }}
                    title="Domain is automatically generated from description"
                  />
                </div>
                <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  Domain is automatically generated from business description
                </small>
              </div> */}
            </section>

            {/* Bot Context */}
            <section className="cbc-card">
              <div className="cbc-card__heading">
                <span className="cbc-card__icon cbc-card__icon--red"><Database size={18} /></span>
                <h2 className="cbc-card__title">Bot Context</h2>
              </div>

              <div className="cbc-field">
                <label className="cbc-label">Description *</label>
                <textarea
                  name="description" className="cbc-textarea"
                  value={config.description} onChange={handleInputChange}
                  placeholder="Describe your primary business focus…" required
                />
              </div>

              {/* Vector KB */}
              <div className="cbc-vector-box">
                <div className="cbc-vector-box__header">
                  <Cpu size={16} color="#64748b" />
                  <h4 className="cbc-vector-box__title">Vector Knowledge Base</h4>
                </div>
                <p className="cbc-vector-box__desc">Advanced technical configuration for AI semantic indexing.</p>
                <div className="cbc-vector-box__code">
                  <span>{`{ embeddings_data: {} }`}</span>
                  <span className="cbc-vector-box__badge">INITIALIZED</span>
                </div>
              </div>
            </section>

            {/* Widget Live Preview */}
            <section className="cbc-card">
              <h2 className="cbc-card__title" style={{ marginBottom: '18px' }}>Widget Live Preview</h2>
              <div className="cbc-preview-stage">
                <div className="cbc-preview-widget">
                  <div className="cbc-preview-widget__topbar">
                    <div className="cbc-preview-widget__avatar">AI</div>
                    <div>
                      <p className="cbc-preview-widget__name">{config.name || 'AI Assistant'}</p>
                      <span className="cbc-preview-widget__status">● Online</span>
                    </div>
                  </div>
                  <div className="cbc-preview-widget__body">
                    <div className="cbc-preview-bubble cbc-preview-bubble--left">
                      Hello! Welcome to our {config.domain} portal. How can I help you?
                    </div>
                    <div className="cbc-preview-bubble cbc-preview-bubble--right">
                      I'm interested in {config.name}.
                    </div>
                  </div>
                  <div className="cbc-preview-widget__footer">
                    <div className="cbc-preview-widget__input-mock" />
                    <div className="cbc-preview-widget__send-mock" />
                  </div>
                </div>
              </div>
            </section>
          </div>
          {/* ══ END LEFT ══════════════════════════════════════════════════ */}

          {/* ══ RIGHT COLUMN — Configured Businesses ═════════════════════ */}
          <aside className="cbc-right">
            <section className="cbc-card cbc-card--full-height">
              <div className="cbc-card__heading">
                <span className="cbc-card__icon cbc-card__icon--slate"><Database size={18} /></span>
                <h2 className="cbc-card__title">Configured Businesses</h2>
              </div>

              {businesses.length === 0 ? (
                <div className="cbc-empty-state">
                  <Info size={20} />
                  <span>No businesses configured yet. Click "Fetch Config" to load existing configurations.</span>
                </div>
              ) : (
                <div className="cbc-biz-list">
                  {businesses.map((business, index) => (
                    <div key={index} className="cbc-biz-card">
                      <div className="cbc-biz-card__header">
                        <h3 className="cbc-biz-card__name">{business.name || 'Unnamed Business'}</h3>
                        {/* <span className="cbc-biz-card__domain-badge">{business.domain || 'No Domain'}</span> */}
                      </div>
                      <div className="cbc-biz-card__details">
                        <div className="cbc-biz-card__detail-row">
                          <Globe size={14} />
                          <span>{business.website_url || 'No website URL'}</span>
                        </div>
                        <div className="cbc-biz-card__detail-row">
                          <Tag size={14} />
                          <span>{business.description || 'No description available'}</span>
                        </div>
                        <div className="cbc-biz-card__detail-row">
                          <Database size={14} />
                          <span>Vector Data: {business.vector_data ? 'Available' : 'Not configured'}</span>
                        </div>
                      </div>
                      <div className="cbc-biz-card__actions">
                        {editingBusinessId === business.id ? (
                          <>
                            <button className="cbc-biz-btn cbc-biz-btn--update" onClick={() => handleUpdate(business.id, config)}>
                              <Save size={13} /> Update
                            </button>
                            <button className="cbc-biz-btn cbc-biz-btn--cancel" onClick={handleCancelEdit}>
                              <XCircle size={13} /> Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button className="cbc-biz-btn cbc-biz-btn--edit" onClick={() => handleEdit(business)}>
                              <Cpu size={13} /> Edit
                            </button>
                            <button className="cbc-biz-btn cbc-biz-btn--delete" onClick={() => handleDelete(business.id)}>
                              <Trash2 size={13} /> Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </aside>
          {/* ══ END RIGHT ═════════════════════════════════════════════════ */}

        </div>
      </main>
    </div>
  );
};

export default ChatbotConfig;