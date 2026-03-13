import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Dashboard from './components/Dashboard';
import DeckGLMap from './components/map/DeckGLMap';
import { LayoutDashboard, Settings, Map, Activity, Zap, Droplets } from 'lucide-react';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'traffic', label: 'Traffic & Transit', icon: Map },
    { id: 'environment', label: 'Air Quality', icon: Activity },
    { id: 'energy', label: 'Energy Grid', icon: Zap },
    { id: 'water', label: 'Water Systems', icon: Droplets },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'traffic':
        return <DeckGLMap />;
      default:
        return (
          <div className="glass-panel flex-center" style={{ minHeight: '60vh' }}>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ color: 'hsl(var(--text-secondary))', marginBottom: '1rem' }}>
                {navItems.find(n => n.id === activeTab)?.label} Module
              </h2>
              <p style={{ color: 'hsl(var(--text-secondary))', opacity: 0.7 }}>
                This module is under development. Select Overview or Traffic to see live data.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'hsl(var(--bg-primary))' }}>
      {/* Sidebar */}
      <motion.aside 
        initial={{ x: -280 }}
        animate={{ x: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        style={{ 
          width: '260px', 
          borderRight: '1px solid var(--glass-border)',
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(10px)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10
        }}
      >
        <div style={{ marginBottom: '3rem' }}>
          <h1 className="text-gradient" style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity color="hsl(var(--accent-blue))" size={28} />
            Nexus City
          </h1>
          <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Smart Urban Analyzer
          </p>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          {navItems.map((item) => (
            <div 
              key={item.id}
              className={`sidebar-link ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <item.icon size={20} />
              <span style={{ fontWeight: 500 }}>{item.label}</span>
            </div>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, hsl(var(--accent-blue)), hsl(var(--accent-purple)))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              SA
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>System Admin</div>
              <div style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.8rem' }}>Online</div>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto', position: 'relative' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{ width: '100%', maxWidth: '1600px', margin: '0 auto' }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
