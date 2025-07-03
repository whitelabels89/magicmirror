import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  event.preventDefault();
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  event.preventDefault();
});

// Catch any initialization errors
const initApp = () => {
  try {
    const root = document.getElementById("root");
    if (!root) {
      throw new Error("Root element not found");
    }
    
    createRoot(root).render(<App />);
  } catch (error) {
    console.error("Failed to initialize app:", error);
    
    // Show fallback UI
    const root = document.getElementById("root");
    if (root) {
      root.innerHTML = `
        <div style="
          display: flex; 
          justify-content: center; 
          align-items: center; 
          height: 100vh; 
          font-family: Arial, sans-serif;
          background: #f5f5f5;
        ">
          <div style="text-align: center; padding: 20px;">
            <h2>Loading...</h2>
            <p>Please wait while the application loads.</p>
            <button onclick="location.reload()" style="
              padding: 10px 20px; 
              background: #007bff; 
              color: white; 
              border: none; 
              border-radius: 5px; 
              cursor: pointer;
            ">
              Refresh
            </button>
          </div>
        </div>
      `;
    }
  }
};

// Initialize with slight delay to ensure DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  setTimeout(initApp, 100);
}
