import React, { useState } from 'react';
import { Save, Globe, Info, Database, Loader, CheckCircle, AlertCircle, Tag, Cpu } from 'lucide-react';
import Sidebar from '../components/Sidebar.jsx';
import '../assets/styles/aiconfigaration.css'; 
import axios from 'axios';
import Cookies from 'js-cookie';

// ── API Instance for Chatbot Configuration ──────────────────────────────────
const chatbotApi = axios.create({
  baseURL: import.meta.env.PROD ? 'https://ai-reservation.onrender.com' : '',
  headers: {
    'Content-Type': 'application/json'
  }
});

const ChatbotConfig = () => {
  const [config, setConfig] = useState({
    name: 'Football',
    website_url: 'https://www.fifa.com/en',
    description: 'Football website',
    domain: 'Health & Wellness',
    vector_data: {
      embeddings_data: {}
    }
  });

  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const domains = [
    'Health & Wellness',
    'Real Estate',
    'Legal Services',
    'E-commerce',
    'Customer Support',
    'Education',
    'Hospitality',
    'Sports & Entertainment'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // Perform the real POST request to the /create/ endpoint
      const response = await chatbotApi.post('/create/', config);
      
      console.log('Bot Config successfully saved:', response.data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Error saving chatbot config:', err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to save configuration. Please try again.';
      setSaveError(errorMsg);
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="ai-config-container">
      <Sidebar />
      <main className="ai-config-main-content">
        <header className="ai-config-header">
          <div>
            <h1 className="ai-config-page-title">Chatbot Configuration</h1>
            <p className="ai-config-page-subtitle">Configure your AI chat widget's identity and core knowledge base.</p>
          </div>
          <button className="ai-config-save-btn" onClick={handleSave} disabled={saveLoading}>
            {saveLoading ? <><Loader size={14} className="spinning-icon" /> Saving...</> : <><Save size={16} style={{marginRight: '8px'}}/> Save Changes</>}
          </button>
        </header>

        {saveSuccess && (
          <div className="config-banner config-banner--success" role="status">
            <CheckCircle size={16} /><span>Chatbot configuration saved successfully!</span>
          </div>
        )}
        {saveError && (
          <div className="config-banner config-banner--error" role="alert">
            <AlertCircle size={16} /><span>{saveError}</span>
          </div>
        )}

        <div className="ai-config-sections-wrapper" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
          {/* Main Info Section */}
          <section className="ai-config-section">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '10px' }}>
                <Info size={20} color="#2563eb" />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>Business Identity</h2>
            </div>

            <div className="form-group">
              <label>Business Name *</label>
              <input 
                type="text" 
                name="name" 
                maxLength={255}
                className="service-input" 
                style={{ width: '100%' }}
                value={config.name} 
                onChange={handleInputChange} 
                placeholder="e.g. Acme Corporation"
                required
              />
            </div>

            <div className="form-group" style={{ marginTop: '20px' }}>
              <label>Website URL *</label>
              <div style={{ position: 'relative' }}>
                <Globe size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input 
                  type="url" 
                  name="website_url" 
                  maxLength={200}
                  className="service-input" 
                  style={{ width: '100%', paddingLeft: '40px' }}
                  value={config.website_url} 
                  onChange={handleInputChange} 
                  placeholder="https://www.yourbusiness.com"
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '20px' }}>
              <label>Service Domain *</label>
              <div style={{ position: 'relative' }}>
                <Tag size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', zIndex: 1 }} />
                <select 
                  name="domain" 
                  value={config.domain} 
                  onChange={handleInputChange}
                  style={{ 
                    width: '100%', 
                    padding: '12px 12px 12px 40px', 
                    borderRadius: '8px', 
                    border: '1.5px solid #e5e7eb',
                    fontSize: '0.95rem',
                    background: 'white',
                    appearance: 'none',
                    cursor: 'pointer'
                  }}
                  required
                >
                  {domains.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Description & Context Section */}
          <section className="ai-config-section">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{ background: '#fef2f2', padding: '10px', borderRadius: '10px' }}>
                <Database size={20} color="#dc2626" />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>Bot Context</h2>
            </div>

            <div className="form-group">
              <label>Description *</label>
              <textarea 
                name="description" 
                className="personality-textarea" 
                style={{ minHeight: '120px' }}
                value={config.description} 
                onChange={handleInputChange} 
                placeholder="Describe your primary business focus.."
                required
              />
            </div>

            <div style={{ 
              marginTop: '40px', 
              padding: '24px', 
              background: 'linear-gradient(to bottom, #f8fafc, #f1f5f9)', 
              borderRadius: '16px', 
              border: '1px solid #e2e8f0',
              boxShadow: 'inset 0 1px 2px rgba(255,255,255,1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Cpu size={18} color="#64748b" />
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#1e293b' }}>Vector Knowledge Base</h4>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '16px', lineHeight: '1.5' }}>
                Advanced technical configuration for AI semantic indexing.
              </p>
              <div style={{ 
                background: '#0f172a', 
                padding: '12px 16px', 
                borderRadius: '10px', 
                color: '#38bdf8',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                {`{ embeddings_data: {} }`}
                <span style={{ fontSize: '0.65rem', background: '#38bdf822', color: '#0ea5e9', padding: '2px 6px', borderRadius: '4px' }}>INITIALIZED</span>
              </div>
            </div>
          </section>
        </div>

        {/* Live Preview Section */}
        <section className="ai-config-section" style={{ marginTop: '20px' }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '1.25rem', fontWeight: '700' }}>Widget Live Preview</h2>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            padding: '40px', 
            background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
            borderRadius: '12px'
          }}>
            <div style={{ 
              width: '320px', 
              background: 'white', 
              borderRadius: '16px', 
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}>
              <div style={{ 
                background: '#000', 
                padding: '15px 20px', 
                display: 'flex', 
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{ width: '32px', height: '32px', background: '#333', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>AI</div>
                </div>
                <div>
                  <h4 style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>{config.name || 'AI Assistant'}</h4>
                  <span style={{ color: '#10b981', fontSize: '0.7rem' }}>● Online</span>
                </div>
              </div>
              <div style={{ padding: '20px', height: '180px', background: '#fff' }}>
                <div style={{ background: '#f1f5f9', padding: '10px 15px', borderRadius: '12px 12px 12px 0', maxWidth: '85%', fontSize: '0.85rem', marginBottom: '10px' }}>
                  Hello! Welcome to our {config.domain} portal. How can I help you?
                </div>
                <div style={{ background: '#000', color: 'white', padding: '10px 15px', borderRadius: '12px 12px 0 12px', maxWidth: '85%', fontSize: '0.85rem', marginLeft: 'auto' }}>
                  I'm interested in {config.name}.
                </div>
              </div>
              <div style={{ padding: '15px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1, height: '36px', background: '#f8fafc', borderRadius: '18px', border: '1px solid #e2e8f0' }}></div>
                <div style={{ width: '36px', height: '36px', background: '#000', borderRadius: '50%' }}></div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ChatbotConfig;
