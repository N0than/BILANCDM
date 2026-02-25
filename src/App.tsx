import React, { useState } from 'react';
import Layout from './components/Layout';
import GlobalView from './components/GlobalView';
import { GlobalViewModeButtons } from './components/GlobalView';
import DetailedView from './components/DetailedView';
import ImportView from './components/ImportView';
import SettingsView from './components/SettingsView';
import { CutoffProvider } from './contexts/CutoffContext';

function App() {
  const [currentView, setCurrentView] = useState('global');
  const [globalViewMode, setGlobalViewMode] = useState<'device' | 'advertiser'>('device');

  const renderView = () => {
    switch (currentView) {
      case 'global':
        return <GlobalView initialViewMode={globalViewMode} onViewModeChange={setGlobalViewMode} />;
      case 'detailed':
        return <DetailedView />;
      case 'import':
        return <ImportView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <GlobalView initialViewMode={globalViewMode} onViewModeChange={setGlobalViewMode} />;
    }
  };

  return (
    <CutoffProvider>
      <Layout
        currentView={currentView}
        onNavigate={setCurrentView}
        headerRightContent={
          <GlobalViewModeButtons
            viewMode={globalViewMode}
            onViewModeChange={setGlobalViewMode}
          />
        }
      >
        {renderView()}
      </Layout>
    </CutoffProvider>
  );
}

export default App;
