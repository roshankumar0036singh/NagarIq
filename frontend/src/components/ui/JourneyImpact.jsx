import React from 'react';
import { motion } from 'framer-motion';
import { Leaf, Zap, Clock, TrendingDown } from 'lucide-react';

const JourneyImpact = ({ savings, totalMetrics, onClose }) => {
  if (!savings) return null;

  const cards = [
    {
      title: 'Time Saved',
      value: savings.time,
      icon: Clock,
      color: '#F59E0B',
      label: 'Optimal Route'
    },
    {
      title: 'Carbon Saved',
      value: savings.co2,
      icon: Leaf,
      color: '#10B981',
      label: 'CO2 Emission Redux'
    },
    {
      title: 'Cost Saved',
      value: savings.cost,
      icon: Zap,
      color: '#3B82F6',
      label: 'Fuel & Transit Cost'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(2, 6, 23, 0.9)',
        backdropFilter: 'blur(40px)',
        padding: '2.5rem',
        borderRadius: '32px',
        border: '1px solid rgba(255,255,255,0.1)',
        zIndex: 100,
        width: '90%',
        maxWidth: '800px',
        boxShadow: '0 40px 100px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.1)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <TrendingDown color="#10B981" size={24} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 200, letterSpacing: '0.05em', color: 'white', margin: 0 }}>Journey Evolution Impact</h2>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', margin: 0 }}>
            Visualizing the sustainable advantages of your multi-modal route.
          </p>
        </div>
        <button 
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: 'none',
            color: 'white',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: '1.2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          &times;
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1/3)', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {cards.map((card, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * idx }}
            style={{
              background: 'rgba(255,255,255,0.03)',
              padding: '1.5rem',
              borderRadius: '24px',
              border: '1px solid rgba(255,255,255,0.05)',
              textAlign: 'center'
            }}
          >
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '14px', 
              background: `${card.color}20`, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              color: card.color
            }}>
              <card.icon size={24} />
            </div>
            <div style={{ fontSize: '0.7rem', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>
              {card.title}
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 600, color: 'white', marginBottom: '0.25rem' }}>
              {card.value}
            </div>
            <div style={{ fontSize: '0.6rem', color: card.color, fontWeight: 700 }}>
              {card.label}
            </div>
          </motion.div>
        ))}
      </div>

      <div style={{ 
        background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.1))',
        padding: '1.25rem 2rem',
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <div>
            <div style={{ fontSize: '0.6rem', opacity: 0.4, textTransform: 'uppercase' }}>Total CO2 Impact</div>
            <div style={{ fontSize: '1rem', fontWeight: 500 }}>{totalMetrics.co2}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.6rem', opacity: 0.4, textTransform: 'uppercase' }}>Est. Travel Cost</div>
            <div style={{ fontSize: '1rem', fontWeight: 500 }}>{totalMetrics.cost}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
           <div style={{ fontSize: '0.6rem', opacity: 0.4, textTransform: 'uppercase' }}>Transit Node</div>
           <div style={{ fontSize: '1rem', color: '#3B82F6', fontWeight: 600 }}>{totalMetrics.station || 'Nagpur Metro'}</div>
        </div>
      </div>
    </motion.div>
  );
};

export default JourneyImpact;
