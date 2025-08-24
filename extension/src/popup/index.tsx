// Popup main entry point
import React from 'react';
import { createRoot } from 'react-dom/client';
import { PopupApp } from './components/PopupApp.js';
import './styles.css';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<PopupApp />);
} else {
  console.error('Tab Memory: Root container not found');
}
