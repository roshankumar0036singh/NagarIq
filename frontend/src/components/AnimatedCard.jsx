import { motion } from 'framer-motion';

export const AnimatedCard = ({ children, delay = 0, className = '', style = {} }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.5, 
        delay: delay,
        ease: [0.25, 0.1, 0.25, 1.0] 
      }}
      whileHover={{ 
        y: -5,
        boxShadow: '0 12px 40px 0 rgba(0, 0, 0, 0.45), 0 0 15px rgba(255, 255, 255, 0.05)',
        transition: { duration: 0.2 }
      }}
      className={`glass-panel ${className}`}
      style={{ padding: '1.5rem', ...style }}
    >
      {children}
    </motion.div>
  );
};

export const KPIBadge = ({ title, value, icon: Icon, trend, trendValue, colorVariant, delay = 0 }) => {
  
  const getColors = () => {
    switch(colorVariant) {
      case 'blue': return 'hsl(var(--accent-blue))';
      case 'green': return 'hsl(var(--accent-green))';
      case 'purple': return 'hsl(var(--accent-purple))';
      case 'orange': return 'hsl(var(--accent-orange))';
      case 'red': return 'hsl(var(--accent-red))';
      default: return 'hsl(var(--text-primary))';
    }
  };

  const color = getColors();

  return (
    <AnimatedCard delay={delay} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="flex-between">
        <span style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem', fontWeight: 500 }}>{title}</span>
        <div style={{ 
          background: `rgba(${colorVariant === 'blue' ? '59,130,246' : colorVariant === 'green' ? '34,197,94' : colorVariant === 'purple' ? '168,85,247' : colorVariant === 'red' ? '239,68,68' : '249,115,22'}, 0.15)`, 
          padding: '0.5rem', 
          borderRadius: '8px',
          color: color
        }}>
          <Icon size={20} />
        </div>
      </div>
      <div>
        <h3 style={{ fontSize: '2rem', fontWeight: 700, margin: '0.25rem 0' }}>{value}</h3>
        {trend && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
            <span style={{ color: trend === 'up' ? 'hsl(var(--accent-green))' : 'hsl(var(--accent-red))', fontWeight: 600 }}>
              {trend === 'up' ? '↑' : '↓'} {trendValue}
            </span>
            <span style={{ color: 'hsl(var(--text-secondary))' }}>vs last week</span>
          </div>
        )}
      </div>
    </AnimatedCard>
  );
};
