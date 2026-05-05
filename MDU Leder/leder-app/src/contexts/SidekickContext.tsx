import { createContext, useContext, useState, ReactNode } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SidekickData = Record<string, any>;

interface SidekickContextValue {
  sidekickData: SidekickData;
  setSidekickData: (data: SidekickData) => void;
}

const SidekickContext = createContext<SidekickContextValue>({
  sidekickData: {},
  setSidekickData: () => {},
});

export function SidekickProvider({ children }: { children: ReactNode }) {
  const [sidekickData, setSidekickData] = useState<SidekickData>({});
  return (
    <SidekickContext.Provider value={{ sidekickData, setSidekickData }}>
      {children}
    </SidekickContext.Provider>
  );
}

export function useSidekickData() {
  return useContext(SidekickContext);
}
