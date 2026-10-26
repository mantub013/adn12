import React, { useState, useEffect, useCallback } from 'react';
import { SecurityProvider, useSecurity } from './context/SecurityContext';
import { Navbar } from './components/Navbar';
import { DoorDashboard } from './components/DoorDashboard/DoorDashboard';
import { OwnerConsole } from './components/OwnerConsole/OwnerConsole';
import { ToastContainer } from './components/Toast';
import { ToastMessage } from './types';

const AppContent: React.FC = () => {
  const { activeTab, setActiveTab } = useSecurity();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Listen to browser path / hash on mount and window popstate
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path.includes('owner') || hash.includes('owner')) {
        setActiveTab('owner');
      } else {
        setActiveTab('door');
      }
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, [setActiveTab]);

  // Update hash when activeTab changes
  useEffect(() => {
    if (activeTab === 'owner') {
      if (window.location.hash !== '#owner') {
        window.history.replaceState(null, '', '#owner');
      }
    } else {
      if (window.location.hash !== '#door' && window.location.hash !== '') {
        window.history.replaceState(null, '', '#door');
      }
    }
  }, [activeTab]);

  const showToast = useCallback((text: string, type: 'success' | 'warn' | 'danger' | 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#060912] text-[#edf3ff]">
      <Navbar />

      <main className="flex-1 pb-16">
        {activeTab === 'door' ? (
          <DoorDashboard onShowToast={showToast} />
        ) : (
          <OwnerConsole onShowToast={showToast} />
        )}
      </main>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export function App() {
  return (
    <SecurityProvider>
      <AppContent />
    </SecurityProvider>
  );
}

export default App;
