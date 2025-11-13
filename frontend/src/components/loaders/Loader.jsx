import React from 'react';

const Loader = ({ size = '48px' }) => {
  return (
    <span
      className="loader"
      style={{ '--size': typeof size === 'number' ? `${size}px` : size }}
    ></span>
  );
};

export default Loader;
