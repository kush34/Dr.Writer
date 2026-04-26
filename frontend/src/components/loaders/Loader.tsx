import React from 'react';

const Loader = () => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      zIndex: 9999,
      height: '3px',
      overflow: 'hidden',
    }}>
      <div style={{
        height: '100%',
        background: 'var(--primary, #6366f1)',
        animation: 'breathe 1.5s ease-in-out infinite',
        transformOrigin: 'left center',
      }} />
      <style>{`
        @keyframes breathe {
          0%   { transform: scaleX(0.2); opacity: 0.4; }
          50%  { transform: scaleX(1);   opacity: 1;   }
          100% { transform: scaleX(1.4); opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

export default Loader;

