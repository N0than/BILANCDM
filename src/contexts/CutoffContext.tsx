import React, { createContext, useContext, useState } from 'react';
import { getTodayDate } from '../utils/calculations';

interface CutoffContextType {
  cutoffDate: Date;
  setCutoffDate: (date: Date) => void;
  selectedDeviceId: string | null;
  setSelectedDeviceId: (id: string | null) => void;
}

const CutoffContext = createContext<CutoffContextType | undefined>(undefined);

export function CutoffProvider({ children }: { children: React.ReactNode }) {
  const [cutoffDate, setCutoffDate] = useState<Date>(getTodayDate());
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  return (
    <CutoffContext.Provider value={{ cutoffDate, setCutoffDate, selectedDeviceId, setSelectedDeviceId }}>
      {children}
    </CutoffContext.Provider>
  );
}

export function useCutoffDate() {
  const context = useContext(CutoffContext);
  if (!context) {
    throw new Error('useCutoffDate must be used within CutoffProvider');
  }
  return context;
}
