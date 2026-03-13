import React, { useState, useEffect, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, PathLayer } from '@deck.gl/layers';
import { TripsLayer } from '@deck.gl/geo-layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { Map } from 'react-map-gl/maplibre';
import { LightingEffect, AmbientLight, PointLight } from '@deck.gl/core';

// Viewport settings for Nagpur - Cinematic Low Angle
const INITIAL_VIEW_STATE = {
  longitude: 79.0882,
  latitude: 21.1458,
  zoom: 13.5,
  pitch: 55,
  bearing: -15
};

const ambientLight = new AmbientLight({
  color: [255, 255, 255],
  intensity: 1.2
});

const lightingEffect = new LightingEffect({ ambientLight });

const DeckGLMap = () => {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [trafficData, setTrafficData] = useState(null);
  const [hoverInfo, setHoverInfo] = useState(null);
  const [time, setTime] = useState(0);

  // New Routing & Mode State
  const [selectedMode, setSelectedMode] = useState('car'); // car, bike, cycle, pedestrian
  const [routingState, setRoutingState] = useState(null); // 'picking-start', 'picking-end', 'calculating', 'resolved'
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);
  const [optimalPath, setOptimalPath] = useState(null);

  // Animation Loop for TripsLayer
  useEffect(() => {
    let animation;
    const animate = () => {
      setTime(t => (t + 0.8) % 1000);
      animation = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animation);
  }, []);

  useEffect(() => {
    fetch('/data/live_traffic.json')
      .then(res => res.json())
      .then(data => setTrafficData(data))
      .catch(err => console.error("Error loading traffic data:", err));
  }, []);

  // Filtered segments based on selected mode
  const filteredFeatures = useMemo(() => {
    if (!trafficData) return [];
    return trafficData.features.filter(f => {
      const mode = f.properties.modalType;
      if (selectedMode === 'car') return mode === 'car';
      if (selectedMode === 'cycle') return mode === 'cycle' || mode === 'car'; // cycles can use both
      if (selectedMode === 'pedestrian') return true; // pedestrians can use anything in this demo
      if (selectedMode === 'bike') return mode === 'bike' || mode === 'car';
      return true;
    });
  }, [trafficData, selectedMode]);

  // Filtered heatmap points (focus on high intensity for selected mode)
  const heatmapPoints = useMemo(() => {
    const points = [];
    filteredFeatures.forEach(f => {
      f.geometry.coordinates.forEach(coord => {
        points.push({ 
          position: [coord[0], coord[1]], 
          weight: f.properties.congestion
        });
      });
    });
    return points;
  }, [filteredFeatures]);

  const calculateRoute = async (start, end) => {
    setRoutingState('calculating');
    try {
      const response = await fetch('http://127.0.0.1:8000/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start, end, mode: selectedMode })
      });
      const data = await response.json();
      if (data.path) {
        setOptimalPath(data.path);
        setRoutingState('resolved');
      } else {
        alert("No path found!");
        setRoutingState(null);
      }
    } catch (err) {
      console.error("Routing error:", err);
      setRoutingState(null);
    }
  };

  const onMapClick = (info) => {
    if (routingState === 'picking-start') {
      setStartPoint(info.coordinate);
      setRoutingState('picking-end');
    } else if (routingState === 'picking-end') {
      setEndPoint(info.coordinate);
      calculateRoute(startPoint, info.coordinate);
    }
  };

  const layers = [
    // 1. Nocturnal Heatmap (Liquid Flow)
    new HeatmapLayer({
      id: 'traffic-heatmap',
      data: heatmapPoints,
      getPosition: d => d.position,
      getWeight: d => d.weight,
      radiusPixels: 80,
      intensity: 0.8,
      threshold: 0.1,
      opacity: 0.25,
      colorRange: [
        [15, 23, 42, 0],    // Slate transparent
        [16, 185, 129, 50],  // Emerald
        [5, 150, 105, 100],  // Emerald semi
        [245, 158, 11, 150], // Amber/Gold
        [252, 211, 77, 200]  // Bright Gold
      ]
    }),

    // 2. Base Neural Network (Micro-lines)
    new PathLayer({
      id: 'traffic-paths-base',
      data: trafficData ? trafficData.features : [],
      getPath: d => d.geometry.coordinates.map(p => [p[0], p[1]]),
      getColor: [148, 163, 184, 25], // Ultra-muted slate
      getWidth: 1,
      widthMinPixels: 0.5,
      opacity: 0.15
    }),

    // 3. Elegant Arteries (Variable Glow)
    new PathLayer({
      id: 'traffic-paths-glow',
      data: filteredFeatures,
      getPath: d => d.geometry.coordinates.map(p => [p[0], p[1]]),
      getColor: d => {
        const c = d.properties.congestion;
        if (c > 0.8) return [245, 158, 11, 220]; // Amber/Gold
        if (c > 0.4) return [16, 185, 129, 180];  // Emerald
        return [20, 184, 166, 100];             // Teal/Slate
      },
      getWidth: d => d.properties.congestion * 2 + 1,
      widthMinPixels: 1.5,
      parameters: {
        blendFunc: [770, 1],
        blendEquation: 32774
      }
    }),

    // 4. Optimal Route Layer (The User Path)
    optimalPath && new PathLayer({
      id: 'optimal-route',
      data: [{ path: optimalPath }],
      getPath: d => d.path,
      getColor: [255, 255, 255], // Pure White for Routing
      getWidth: 8,
      widthMinPixels: 6,
      parameters: {
        blendFunc: [770, 1], // Add Glow
        blendEquation: 32774
      }
    }),

    // 5. Start/End Markers
    startPoint && new ScatterplotLayer({
      id: 'start-marker',
      data: [{ position: startPoint }],
      getPosition: d => d.position,
      getFillColor: [16, 185, 129], // Emerald
      getRadius: 20,
      radiusMinPixels: 8,
      stroked: true,
      getLineColor: [255, 255, 255],
      lineWidthMinPixels: 2
    }),

    endPoint && new ScatterplotLayer({
      id: 'end-marker',
      data: [{ position: endPoint }],
      getPosition: d => d.position,
      getFillColor: [245, 158, 11], // Gold
      getRadius: 20,
      radiusMinPixels: 8,
      stroked: true,
      getLineColor: [255, 255, 255],
      lineWidthMinPixels: 2
    }),

    // 6. Kinetic Threads (TripsLayer)
    new TripsLayer({
      id: 'traffic-trips',
      data: trafficData ? trafficData.features : [],
      getPath: d => d.geometry.coordinates.map(p => [p[0], p[1]]),
      getTimestamps: d => d.properties.timestamps,
      getColor: [255, 255, 255],
      opacity: 0.15,
      widthMinPixels: 1,
      trailLength: 200,
      currentTime: time,
      shadowEnabled: false
    })
  ];

  return (
    <div className="glass-panel" style={{ width: '100%', height: 'calc(100vh - 120px)', position: 'relative', overflow: 'hidden', background: '#020617' }}>
      <DeckGL
        initialViewState={viewState}
        onViewStateChange={e => setViewState(e.viewState)}
        controller={true}
        layers={layers.filter(Boolean)}
        effects={[lightingEffect]}
        getCursor={({ isHovering }) => (isHovering ? 'pointer' : routingState ? 'crosshair' : 'default')}
        onClick={onMapClick}
      >
        <Map
          reuseMaps
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
          preventStyleDiffing={true}
        />
      </DeckGL>

      {/* Transport Mode & Routing Selector HUD */}
      <div style={{
        position: 'absolute',
        top: '2rem',
        right: '2rem',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '1rem'
      }}>
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          background: 'rgba(2, 6, 23, 0.6)',
          padding: '0.5rem',
          borderRadius: '16px',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          {['car', 'bike', 'cycle', 'pedestrian'].map(mode => (
            <button
              key={mode}
              onClick={() => {
                setSelectedMode(mode);
                setOptimalPath(null);
                setRoutingState(null);
              }}
              style={{
                background: selectedMode === mode ? '#10B981' : 'transparent',
                color: selectedMode === mode ? 'black' : 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '12px',
                fontSize: '0.7rem',
                fontFamily: "'Roboto Mono', monospace",
                cursor: 'pointer',
                textTransform: 'uppercase',
                transition: 'all 0.2s'
              }}
            >
              {mode}
            </button>
          ))}
        </div>

        {!routingState && (
          <button
            onClick={() => {
              setRoutingState('picking-start');
              setOptimalPath(null);
              setStartPoint(null);
              setEndPoint(null);
            }}
            style={{
              background: '#F59E0B',
              color: 'black',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.75rem',
              fontFamily: "'Roboto Mono', monospace",
              boxShadow: '0 10px 30px rgba(245,158,11,0.2)'
            }}
          >
            PLAN OPTIMAL ROUTE
          </button>
        )}

        {routingState && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            background: 'rgba(2, 6, 23, 0.8)',
            padding: '1rem',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(20px)',
            minWidth: '240px'
          }}>
            <div style={{ 
              fontSize: '0.6rem', 
              color: routingState === 'picking-start' ? '#10B981' : routingState === 'picking-end' ? '#F59E0B' : 'white',
              letterSpacing: '0.1em',
              fontWeight: 600
            }}>
              {routingState === 'picking-start' ? 'INTEL: SELECT ORIGIN' : 
               routingState === 'picking-end' ? 'INTEL: SELECT DESTINATION' : 
               routingState === 'calculating' ? 'INTEL: RESOLVING NEURAL PATH' : 'INTEL: ROUTE OPTIMIZED'}
            </div>
            {routingState === 'resolved' && (
              <button
                onClick={() => {
                  setRoutingState(null);
                  setOptimalPath(null);
                  setStartPoint(null);
                  setEndPoint(null);
                }}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '1rem',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '0.7rem',
                  fontFamily: "'Roboto Mono', monospace"
                }}
              >
                DISCARD ROUTE
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* HUD: City Telemetry (Minimal Corner Overlays) */}
      <div style={{ 
        position: 'absolute', 
        top: '2rem', 
        left: '2rem', 
        zIndex: 1,
        fontFamily: "'Roboto Mono', monospace, SFMono-Regular, Consolas",
        color: 'white',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.2em', color: '#10B981' }}>NAGPUR INTEL // ACTIVE</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 200, opacity: 0.9 }}>Digital Twin System</div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '1rem' }}>
             <div>
                <div style={{ fontSize: '0.6rem', opacity: 0.4, textTransform: 'uppercase' }}>Nodes Synchronized</div>
                <div style={{ fontSize: '1.2rem' }}>{trafficData ? trafficData.features.length : '----'}</div>
             </div>
             <div>
                <div style={{ fontSize: '0.6rem', opacity: 0.4, textTransform: 'uppercase' }}>Frame Latency</div>
                <div style={{ fontSize: '1.2rem' }}>14ms</div>
             </div>
          </div>
        </div>
      </div>

      {/* HUD: Environment Metrics (Bottom Right) */}
      <div style={{
        position: 'absolute',
        bottom: '3rem',
        right: '3rem',
        zIndex: 1,
        fontFamily: "'Roboto Mono', monospace, SFMono-Regular, Consolas",
        padding: '2rem',
        background: 'rgba(2, 6, 23, 0.4)',
        backdropFilter: 'blur(40px)',
        borderRadius: '32px',
        border: '1px solid rgba(255,255,255,0.06)',
        minWidth: '280px',
        color: 'white'
      }}>
        <div style={{ marginBottom: '2rem' }}>
           <div style={{ fontSize: '0.65rem', opacity: 0.4, textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.1em' }}>Mean Grid Velocity</div>
           <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 100 }}>
                 {trafficData ? (trafficData.features.reduce((acc, f) => acc + f.properties.speed, 0) / trafficData.features.length).toFixed(0) : '--'}
              </span>
              <span style={{ fontSize: '0.8rem', opacity: 0.3 }}>KM/HR</span>
           </div>
        </div>
        
        <div style={{ display: 'flex', gap: '2rem' }}>
           <div>
              <div style={{ fontSize: '0.6rem', opacity: 0.3, textTransform: 'uppercase' }}>Reliability</div>
              <div style={{ fontSize: '0.9rem', color: '#10B981', fontWeight: 600 }}>99.2%</div>
           </div>
           <div>
              <div style={{ fontSize: '0.6rem', opacity: 0.3, textTransform: 'uppercase' }}>Saturation</div>
              <div style={{ fontSize: '0.9rem', color: '#F59E0B', fontWeight: 600 }}>OPTIMAL</div>
           </div>
        </div>
      </div>

      {/* Modern Pointer Telemetry */}
      {hoverInfo && hoverInfo.object && (
        <div style={{
          position: 'absolute',
          zIndex: 10,
          pointerEvents: 'none',
          left: hoverInfo.x + 20,
          top: hoverInfo.y + 20,
          background: 'rgba(2, 6, 23, 0.95)',
          backdropFilter: 'blur(12px)',
          color: 'white',
          padding: '1.5rem',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.1)',
          minWidth: '240px',
          fontFamily: "'Roboto Mono', monospace, SFMono-Regular, Consolas",
        }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem', color: '#F59E0B' }}>
            {hoverInfo.object.properties.name || 'ANONYMOUS_LINK'}
          </div>
          <div style={{ fontSize: '0.65rem', opacity: 0.4, marginBottom: '1rem' }}>SEGMENT_ID: {hoverInfo.object.properties.id.toString().slice(0, 12)}</div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
             <span style={{ opacity: 0.5 }}>FLOW_RATE</span>
             <span>{hoverInfo.object.properties.speed} km/h</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '0.5rem' }}>
             <span style={{ opacity: 0.5 }}>DENSITY</span>
             <span style={{ color: hoverInfo.object.properties.congestion > 0.7 ? '#EF4444' : '#10B981' }}>
               {(hoverInfo.object.properties.congestion * 100).toFixed(1)}%
             </span>
          </div>
        </div>
      )}
    </div>
  );
};



export default DeckGLMap;
