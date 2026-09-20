import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker
registerSW({
  immediate: true,
  onOfflineReady() {
    console.log('SmartShop POS PWA is ready for offline use');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
