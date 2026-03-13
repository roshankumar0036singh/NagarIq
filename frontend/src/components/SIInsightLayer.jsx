import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, RefreshCw, FileText, AlertTriangle, CheckCircle, Sparkles, History, Globe } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const SIInsightLayer = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:8000/api/si-insights');
      if (!response.ok) throw new Error('Failed to fetch insights');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getDeltaIcon = (delta) => {
    if (delta > 0) return <span style={{ color: 'hsl(var(--accent-red))' }}>↑ {delta}</span>;
    if (delta < 0) return <span style={{ color: 'hsl(var(--accent-blue))' }}>↓ {Math.abs(delta)}</span>;
    return <span style={{ color: 'hsl(var(--text-secondary))', opacity: 0.5 }}>- 0</span>;
  };

  return (
    <div className="si-insight-page" style={{ paddingBottom: '4rem' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <Sparkles color="hsl(var(--accent-blue))" size={24} />
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--accent-blue))' }}>
              Advanced AI Analytics
            </span>
          </div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0 }}>SI Insight Intelligence</h2>
          <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '1.1rem', marginTop: '0.5rem' }}>
            Cross-commit delta analysis and automated report generation for Nagpur Smart City.
          </p>
        </div>
        
        <motion.button 
          whileHover={{ scale: 1.02, translateY: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={fetchInsights} 
          disabled={loading}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem', 
            padding: '0.875rem 2rem',
            fontSize: '1rem',
            fontWeight: 600,
            borderRadius: '14px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: loading 
              ? 'rgba(255,255,255,0.05)' 
              : 'linear-gradient(135deg, hsl(var(--accent-blue)), hsl(var(--accent-purple)))',
            color: 'white',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: loading ? 'none' : '0 10px 25px -5px rgba(var(--accent-blue-rgb), 0.4), inset 0 1px 1px rgba(255,255,255,0.2)',
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {loading && (
            <motion.div
              layoutId="glow"
              style={{
                position: 'absolute',
                top: 0, left: '-100%', width: '100%', height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
              }}
              animate={{ left: '100%' }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            />
          )}
          <RefreshCw size={20} className={loading ? 'spin' : ''} />
          {data ? 'Refresh City Pulse' : 'Generate City Intelligence'}
        </motion.button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 1fr)', gap: '2rem' }}>
        {/* Main Content Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {loading && (
            <div className="glass-panel" style={{ padding: '6rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', borderRadius: '24px' }}>
              <motion.div
                animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                style={{ 
                  width: '80px', 
                  height: '80px', 
                  borderRadius: '50%',
                  border: '4px solid rgba(255,255,255,0.05)',
                  borderTopColor: 'hsl(var(--accent-blue))',
                  borderBottomColor: 'hsl(var(--accent-purple))',
                  boxShadow: '0 0 40px rgba(var(--accent-blue-rgb), 0.2)'
                }}
              />
              <div>
                <h3 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '0.75rem', fontWeight: 700 }}>Synthesizing Intelligence</h3>
                <p style={{ opacity: 0.7, maxWidth: '450px', margin: '0 auto', fontSize: '1.1rem' }}>
                  Mistral LLM is currently cross-referencing delta patterns in the city telemetry sequence...
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '2rem', borderRadius: '16px' }}>
              <AlertTriangle size={32} color="hsl(var(--accent-red))" />
              <div>
                <h3 style={{ margin: 0, marginBottom: '0.25rem' }}>Intelligence Update Failed</h3>
                <p style={{ margin: 0, fontSize: '1rem', opacity: 0.8 }}>{error}</p>
                <button 
                  onClick={fetchInsights}
                  style={{ marginTop: '1rem', background: 'none', border: '1px solid currentColor', color: 'inherit', padding: '0.4rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' }}
                >
                  Retry Analysis
                </button>
              </div>
            </div>
          )}

          {data && !loading && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="intelligence-report"
            >
              <div className="glass-panel" style={{ padding: '2.5rem', borderRadius: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', color: 'hsl(var(--accent-blue))' }}>
                  <FileText size={24} />
                  <h3 style={{ margin: 0, fontSize: '1.5rem', letterSpacing: '0.02em' }}>Current City Pulse Report</h3>
                </div>
                
                <div className="prose si-report-content" style={{ fontSize: '1.1rem', lineHeight: '1.7' }}>
                  <ReactMarkdown>{data.report}</ReactMarkdown>
                </div>

                <div style={{ 
                  marginTop: '3rem', 
                  paddingTop: '1.5rem', 
                  borderTop: '1px solid var(--glass-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  color: 'hsl(var(--text-secondary))',
                  fontSize: '0.85rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Globe size={14} /> City: Nagpur
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Cpu size={14} /> Model: Mistral-Large
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={14} color="hsl(var(--accent-green))" />
                    Data Snapshot: {data.commits.current.substring(0, 7)}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {!data && !loading && !error && (
            <div className="glass-panel flex-center" style={{ padding: '6rem 2rem', flexDirection: 'column', textAlign: 'center', opacity: 0.6, borderRadius: '24px' }}>
              <div style={{ padding: '2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '50%', marginBottom: '2rem' }}>
                <Sparkles size={64} color="hsl(var(--accent-blue))" />
              </div>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>Awaiting City Sequence</h3>
              <p style={{ maxWidth: '400px', fontSize: '1.1rem' }}>
                Click the generate button to begin AI-powered comparative analysis of your smart city telemetry.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar Analytics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h4 style={{ margin: 0, marginBottom: '1.5rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <History size={18} /> delta Snapshot
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {data ? (
                Object.entries(data.comparison).map(([key, val]) => (
                  <div key={key} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                    <div style={{ textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 700, color: 'hsl(var(--text-secondary))', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                      {key} Evolution
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                        {val.current_segments || val.current_stops || val.current_lines || 0}
                      </span>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                          {getDeltaIcon(val.delta || 0)}
                        </div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>vs previous</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '1rem', textAlign: 'center', opacity: 0.4 }}>
                  <p style={{ fontSize: '0.85rem' }}>No comparison data available. Generate pulse to see deltas.</p>
                </div>
              )}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(var(--accent-blue-rgb), 0.1), rgba(var(--accent-purple-rgb), 0.1))' }}>
            <h4 style={{ margin: 0, marginBottom: '1rem', fontSize: '1rem' }}>Intelligence Context</h4>
            <p style={{ fontSize: '0.85rem', opacity: 0.8, lineHeight: '1.6' }}>
              The SI Insight Layer monitors changes in city infrastructure data synced via GitHub Actions. By analyzing commit history, we provide context on urban growth and maintenance patterns.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SIInsightLayer;
