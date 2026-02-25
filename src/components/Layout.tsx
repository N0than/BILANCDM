import React from 'react';
import CutoffDateControl from './CutoffDateControl';

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  onNavigate: (view: string) => void;
  headerRightContent?: React.ReactNode;
}

const menuItems = [
  { id: 'global', label: 'Vue globale' },
  { id: 'detailed', label: 'Tableau détaillé' },
  { id: 'import', label: 'Import des données' },
  { id: 'settings', label: 'Paramètres' },
];

export default function Layout({ children, currentView, onNavigate, headerRightContent }: LayoutProps) {

  return (
    <div className="flex h-screen bg-slate-50">
      <aside
        className="w-64 bg-slate-900 text-white overflow-hidden flex flex-col"
      >
        <div className="border-b border-slate-700 flex items-center justify-center px-4 py-0">
          <img
            src="/bilancdm.svg"
            alt="TV Campaign Insight"
            className="h-full w-auto scale-75"
          />
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    currentView === item.id
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-slate-700">
          <p className="text-xs text-slate-500">© 2026 TV Campaign Insight</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          {currentView === 'global' && headerRightContent ? (
            <div className="flex-1 flex items-center justify-start">
              {headerRightContent}
            </div>
          ) : (
            <div className="flex items-center gap-4 flex-1">
              <div className="w-5 h-5"></div>
              <h2 className="text-xl font-semibold text-slate-800">
                {menuItems.find(item => item.id === currentView)?.label || 'Dashboard'}
              </h2>
            </div>
          )}

          <CutoffDateControl />
        </header>

        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
