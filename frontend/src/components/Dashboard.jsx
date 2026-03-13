import { useState, useEffect } from 'react';
import { KPIBadge } from './AnimatedCard';
import { TrafficChart, EnvironmentChart, EnergyChart, MetroRidershipChart } from './DataCharts';
import { Activity, Radio, AlertTriangle, Zap, Car, TrainTrack } from 'lucide-react';
import { motion } from 'framer-motion';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/all-metrics');
        if (!response.ok) throw new Error('Data fetch failed');
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
        console.error("Failed to load metrics. Ensure Python backend is running.", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Simulate real-time updates every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className="glass-panel flex-center" style={{ minHeight: '60vh', flexDirection: 'column', gap: '1rem', border: '1px solid hsl(var(--accent-red))' }}>
        <AlertTriangle color="hsl(var(--accent-red))" size={48} />
        <h2 style={{ color: 'hsl(var(--accent-red))' }}>Connection Error</h2>
        <p style={{ color: 'hsl(var(--text-secondary))' }}>Could not connect to the Backend API.</p>
        <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>Ensure the FastAPI server is running on port 8000</p>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="flex-center" style={{ minHeight: '60vh', flexDirection: 'column', gap: '1.5rem' }}>
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          style={{ 
            width: '50px', 
            height: '50px', 
            borderRadius: '50%',
            border: '3px solid transparent',
            borderTopColor: 'hsl(var(--accent-blue))',
            borderBottomColor: 'hsl(var(--accent-purple))'
          }}
        />
        <h3 className="text-gradient">Initializing Sensor Network...</h3>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>City Overview</h2>
          <p style={{ color: 'hsl(var(--text-secondary))' }}>Real-time telemetry and urban insights.</p>
        </div>
        
        <div className="glass-panel flex-center" style={{ padding: '0.5rem 1rem', gap: '0.5rem', borderRadius: '20px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'hsl(var(--accent-green))', boxShadow: '0 0 10px hsl(var(--accent-green))' }}></div>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'hsl(var(--accent-green))' }}>System Online</span>
        </div>
      </div>

      {/* KPI Section */}
      <div className="dashboard-grid">
        <KPIBadge 
          title="Overall Efficiency" 
          value={`${data.kpis.overallEfficiency}%`} 
          icon={Activity}
          trend="up"
          trendValue="2.4%"
          colorVariant="blue"
          delay={0.1}
        />
        <KPIBadge 
          title="Active Sensors" 
          value={data.kpis.activeSensors.toLocaleString()} 
          icon={Radio}
          trend="up"
          trendValue="142"
          colorVariant="purple"
          delay={0.2}
        />
        <KPIBadge 
          title="Energy Saved" 
          value={data.kpis.energySaved} 
          icon={Zap}
          trend="up"
          trendValue="1.2%"
          colorVariant="green"
          delay={0.3}
        />
        <KPIBadge 
          title="Traffic Congestion" 
          value={`${data.kpis.trafficFlowIdx} IDX`} 
          icon={Car}
          trend="down"
          trendValue="4 IDX"
          colorVariant="orange"
          delay={0.4}
        />
        <KPIBadge 
          title="Metro Ridership" 
          value={data.metro.ridership.toLocaleString()} 
          icon={TrainTrack}
          trend="up"
          trendValue="8.2%"
          colorVariant="blue"
          delay={0.5}
        />
      </div>

      {/* Charts Section */}
      <div className="dashboard-grid-large" style={{ marginTop: '2rem' }}>
        <TrafficChart data={data.traffic} />
        <EnvironmentChart data={data.environment} />
        <MetroRidershipChart data={data.metroHistory} />
        <EnergyChart data={data.energy} />
        
        {/* Alerts / Summary Panel */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
           <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Critical Alerts</h3>
              <div style={{ background: 'rgba(239,68,68,0.15)', color: 'hsl(var(--accent-red))', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700 }}>
                {data.kpis.criticalAlerts} Active
              </div>
           </div>
           
           <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.05)', borderLeft: '3px solid hsl(var(--accent-red))', borderRadius: '4px' }}>
                <div style={{ fontWeight: 600, color: 'hsl(var(--accent-red))', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={16} /> Substation Alpha Offline
                </div>
                <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>Grid re-routing engaged. Maintenance team dispatched.</div>
                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', marginTop: '0.5rem', opacity: 0.7 }}>12 mins ago</div>
              </div>

              <div style={{ padding: '1rem', background: 'rgba(249,115,22,0.05)', borderLeft: '3px solid hsl(var(--accent-orange))', borderRadius: '4px' }}>
                <div style={{ fontWeight: 600, color: 'hsl(var(--accent-orange))', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Car size={16} /> High Congestion on Route 9
                </div>
                <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>Traffic speed reduced to 18 km/h. Adjusted smart light timings.</div>
                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', marginTop: '0.5rem', opacity: 0.7 }}>45 mins ago</div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
