import React, { useState, useEffect, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { Map } from 'react-map-gl/maplibre';
import { AlertTriangle, Clock, Activity, CheckCircle2 } from 'lucide-react';

const INITIAL_VIEW_STATE = {
  longitude: 79.0882,
  latitude: 21.1458,
  zoom: 12.5,
  pitch: 45,
  bearing: 0
};

const GrievanceMap = () => {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [data, setData] = useState(null);
  const [hoverInfo, setHoverInfo] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All'); // All, Open, In Progress, Resolved

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/grievances')
      .then(res => res.json())
      .then(result => setData(result))
      .catch(err => console.error("Error loading grievances:", err));
  }, []);

  const grievances = data?.grievances || [];
  const summary = data?.summary || { total: 0, open: 0, inProgress: 0, resolved: 0, avgResponseTimeHours: 0 };

  const filteredGrievances = useMemo(() => {
    if (filterStatus === 'All') return grievances;
    return grievances.filter(g => g.status === filterStatus);
  }, [grievances, filterStatus]);

  const layers = [
    new HeatmapLayer({
      id: 'grievance-heatmap',
      data: filteredGrievances,
      getPosition: d => d.coordinates,
      getWeight: d => 1,
      radiusPixels: 60,
      intensity: 1,
      threshold: 0.1,
      opacity: 0.6,
      colorRange: [
        [15, 23, 42, 0],
        [75, 40, 40, 50],
        [239, 68, 68, 120],  // Red semi
        [245, 158, 11, 180], // Orange
        [245, 100, 11, 230]  // Red intense
      ]
    }),
    
    new ScatterplotLayer({
      id: 'grievance-points',
      data: filteredGrievances,
      getPosition: d => d.coordinates,
      getFillColor: d => {
        if (d.status === 'Open') return [239, 68, 68, 200]; // Red
        if (d.status === 'In Progress') return [245, 158, 11, 200]; // Amber
        return [16, 185, 129, 200]; // Emerald
      },
      getRadius: 30,
      radiusMinPixels: 4,
      radiusMaxPixels: 10,
      stroked: true,
      getLineColor: [255, 255, 255, 150],
      lineWidthMinPixels: 1,
      pickable: true,
      onHover: info => setHoverInfo(info)
    })
  ].filter(Boolean);

  return (
    <div className="glass-panel" style={{ width: '100%', height: 'calc(100vh - 120px)', position: 'relative', overflow: 'hidden', background: '#020617', borderRadius: '24px' }}>
      <DeckGL
        initialViewState={viewState}
        onViewStateChange={e => setViewState(e.viewState)}
        controller={true}
        layers={layers}
        getCursor={({ isHovering }) => (isHovering ? 'pointer' : 'default')}
      >
        <Map
          reuseMaps
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        />
      </DeckGL>

      {/* Info HUD Top Left */}
      <div style={{
        position: 'absolute',
        top: '2rem',
        left: '2rem',
        zIndex: 1,
        fontFamily: "'Roboto Mono', monospace",
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.2em', color: '#10B981' }}>NAGPUR INTEL // CIVIC</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 200, opacity: 0.9 }}>Grievance Heatmap</div>
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '1rem' }}>
             <div>
                <div style={{ fontSize: '0.6rem', opacity: 0.4, textTransform: 'uppercase' }}>Avg Resolution Time</div>
                <div style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {summary.avgResponseTimeHours} <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>HRS</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Filter Stats HUD Right */}
      <div style={{
        position: 'absolute',
        top: '2rem',
        right: '2rem',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        background: 'rgba(2, 6, 23, 0.7)',
        backdropFilter: 'blur(12px)',
        padding: '1.5rem',
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.1)',
        minWidth: '250px'
      }}>
        <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'white', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Complaint Status</h3>
        
        <div 
          onClick={() => setFilterStatus('All')}
          style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: filterStatus === 'All' ? 'rgba(255,255,255,0.1)' : 'transparent', borderRadius: '8px' }}
        >
            <span style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}><Activity size={16}/> Total</span>
            <span style={{ color: 'white', fontWeight: 'bold' }}>{summary.total}</span>
        </div>
        
        <div 
          onClick={() => setFilterStatus('Open')}
          style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: filterStatus === 'Open' ? 'rgba(239, 68, 68, 0.2)' : 'transparent', borderRadius: '8px' }}
        >
            <span style={{ color: '#EF4444', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}><AlertTriangle size={16}/> Open</span>
            <span style={{ color: '#EF4444', fontWeight: 'bold' }}>{summary.open}</span>
        </div>

        <div 
          onClick={() => setFilterStatus('In Progress')}
          style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: filterStatus === 'In Progress' ? 'rgba(245, 158, 11, 0.2)' : 'transparent', borderRadius: '8px' }}
        >
            <span style={{ color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}><Clock size={16}/> In Progress</span>
            <span style={{ color: '#F59E0B', fontWeight: 'bold' }}>{summary.inProgress}</span>
        </div>

        <div 
          onClick={() => setFilterStatus('Resolved')}
          style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: filterStatus === 'Resolved' ? 'rgba(16, 185, 129, 0.2)' : 'transparent', borderRadius: '8px' }}
        >
            <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}><CheckCircle2 size={16}/> Resolved</span>
            <span style={{ color: '#10B981', fontWeight: 'bold' }}>{summary.resolved}</span>
        </div>
      </div>

      {/* Hover Tooltip */}
      {hoverInfo && hoverInfo.object && (
        <div style={{
          position: 'absolute',
          zIndex: 1,
          pointerEvents: 'none',
          left: hoverInfo.x,
          top: hoverInfo.y,
          background: 'rgba(2, 6, 23, 0.95)',
          color: 'white',
          padding: '1rem',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(8px)',
          transform: 'translate(-50%, -120%)',
          minWidth: '200px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          fontFamily: "'Inter', sans-serif"
        }}>
          <div style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase' }}>
            ID: {hoverInfo.object.id}
          </div>
          <div style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '8px', textTransform: 'capitalize' }}>
            {hoverInfo.object.type}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '4px' }}>
            <strong>Ward:</strong> {hoverInfo.object.ward}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '4px' }}>
            <strong>Status:</strong> <span style={{ 
                color: hoverInfo.object.status === 'Open' ? '#EF4444' : 
                       hoverInfo.object.status === 'In Progress' ? '#F59E0B' : '#10B981',
                fontWeight: 'bold'
              }}>
                {hoverInfo.object.status}
              </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '8px' }}>
            Reported: {new Date(hoverInfo.object.reportTime).toLocaleDateString()}
          </div>
        </div>
      )}
    </div>
  );
};

export default GrievanceMap;
