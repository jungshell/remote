import React from 'react';
import './Layout.css';

const Layout = ({ children }) => {
  return (
    <div className="layout-container">
      <div className="glass-card">
        {children}
      </div>
    </div>
  );
};

export default Layout;
