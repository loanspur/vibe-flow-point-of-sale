import { StrictMode } from "react";
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
  // Remove StrictMode to prevent double effects in development
  // StrictMode intentionally double-invokes effects to help detect side effects
  // but this causes issues with our domain and auth initialization
  <App />
);
