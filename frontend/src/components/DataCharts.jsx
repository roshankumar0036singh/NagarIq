import { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AnimatedCard } from './AnimatedCard';

// Custom Tooltip for premium aesthetics
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-panel" style={{ padding: '0.75rem 1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
        <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem', marginBottom: '0.25rem' }}>{label}</p>
        {payload.map((entry, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.25rem 0' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: entry.color }}></div>
            <span style={{ fontWeight: 600, color: 'hsl(var(--text-primary))' }}>
              {entry.name}: {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const TrafficChart = ({ data }) => {
  return (
    <AnimatedCard delay={0.4} style={{ height: '350px', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 600 }}>Traffic & Congestion Index</h3>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCongestion" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--accent-red))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--accent-red))" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorSpeed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--accent-blue))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--accent-blue))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="time" type="category" stroke="hsl(var(--text-secondary))" tick={{fill: 'hsl(var(--text-secondary))', fontSize: 12}} axisLine={false} tickLine={false} />
            <YAxis stroke="hsl(var(--text-secondary))" tick={{fill: 'hsl(var(--text-secondary))', fontSize: 12}} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Area type="monotone" name="Congestion (IDX)" dataKey="congestionIndex" stroke="hsl(var(--accent-red))" strokeWidth={2} fillOpacity={1} fill="url(#colorCongestion)" />
            <Area type="monotone" name="Avg Speed (km/h)" dataKey="avgSpeed" stroke="hsl(var(--accent-blue))" strokeWidth={2} fillOpacity={1} fill="url(#colorSpeed)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </AnimatedCard>
  );
};

export const EnvironmentChart = ({ data }) => {
  return (
    <AnimatedCard delay={0.5} style={{ height: '350px', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 600 }}>Air Quality Index (AQI)</h3>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="time" stroke="hsl(var(--text-secondary))" tick={{fill: 'hsl(var(--text-secondary))', fontSize: 12}} axisLine={false} tickLine={false} />
            <YAxis stroke="hsl(var(--text-secondary))" tick={{fill: 'hsl(var(--text-secondary))', fontSize: 12}} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Bar name="AQI" dataKey="aqi" fill="hsl(var(--accent-green))" radius={[4, 4, 0, 0]} />
            <Bar name="PM 2.5" dataKey="pm25" fill="hsl(var(--accent-orange))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </AnimatedCard>
  );
};

export const EnergyChart = ({ data }) => {
  return (
    <AnimatedCard delay={0.6} style={{ height: '350px', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 600 }}>Energy Grid Usage</h3>
      <div style={{ flex: 1, minHeight: 0 }}>
         <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="time" stroke="hsl(var(--text-secondary))" tick={{fill: 'hsl(var(--text-secondary))', fontSize: 12}} axisLine={false} tickLine={false} />
             <YAxis yAxisId="left" stroke="hsl(var(--text-secondary))" tick={{fill: 'hsl(var(--text-secondary))', fontSize: 12}} axisLine={false} tickLine={false} />
            <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--text-secondary))" tick={{fill: 'hsl(var(--text-secondary))', fontSize: 12}} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Line yAxisId="left" type="monotone" name="Demand (MW)" dataKey="consumptionMW" stroke="hsl(var(--accent-purple))" strokeWidth={3} dot={{r: 4, fill: 'hsl(var(--bg-primary))', strokeWidth: 2}} activeDot={{r: 6}} />
            <Line yAxisId="right" type="monotone" name="Renewable (%)" dataKey="renewablePercentage" stroke="hsl(var(--accent-green))" strokeWidth={2} strokeDasharray="5 5" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </AnimatedCard>
  );
};
