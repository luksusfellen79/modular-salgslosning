import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export interface WarRoomItem {
  id: string;
  dealId: string;          // pipeline opportunity ID — kobler War Room til deal
  dealName: string;
  accountName: string;
  value: number;
  discount: number;
  notes: string;
  packageName?: string;
  submittedBy: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  managerComment?: string;
  area?: string;
  units?: number;
  pricePerUnit?: number;
}

// Average price per unit (kr/mnd) from existing customers in each area.
// Used as benchmark for managers when reviewing a deal.
export const AREA_BENCHMARKS: Record<string, { avgPricePerUnit: number; sampleSize: number }> = {
  Oslo: { avgPricePerUnit: 449, sampleSize: 28 },
  Bergen: { avgPricePerUnit: 425, sampleSize: 14 },
  Trondheim: { avgPricePerUnit: 419, sampleSize: 11 },
  Stavanger: { avgPricePerUnit: 439, sampleSize: 9 },
  Bærum: { avgPricePerUnit: 469, sampleSize: 17 },
  Drammen: { avgPricePerUnit: 409, sampleSize: 8 },
};

const SEED_ITEMS: WarRoomItem[] = [
  {
    id: 'wr-seed-1',
    dealId: '1',
    dealName: 'Fellesavtale Bredbånd + TV',
    accountName: 'Jordbærhagen Borettslag',
    value: 80820,
    discount: 18,
    notes: 'Styret krever minst 15 % rabatt for å signere. Konkurrent (Altibox) har gitt tilbud på 410 kr/mnd.',
    packageName: 'Frihet M',
    submittedBy: 'Anna Kristiansen',
    submittedAt: '2026-04-19T10:24:00',
    status: 'pending',
    area: 'Oslo',
    units: 180,
    pricePerUnit: 409,
  },
  {
    id: 'wr-seed-2',
    dealId: '2',
    dealName: 'Fiberoppgradering',
    accountName: 'Solbakken Sameie',
    value: 47025,
    discount: 12,
    notes: 'Ber om 12 % rabatt. Lojal kunde i 6 år, fornyer hele bygget.',
    packageName: 'Frihet L',
    submittedBy: 'Jonas Mikkelsen',
    submittedAt: '2026-04-18T15:10:00',
    status: 'pending',
    area: 'Bærum',
    units: 95,
    pricePerUnit: 495,
  },
  {
    id: 'wr-seed-3',
    dealId: '8',
    dealName: 'Komplett fellesløsning',
    accountName: 'Havnekanten Borettslag',
    value: 89320,
    discount: 22,
    notes: 'Stort borettslag, høyt potensial for referanseverdi i området.',
    packageName: 'Frihet XL',
    submittedBy: 'Ingrid Solberg',
    submittedAt: '2026-04-17T09:00:00',
    status: 'approved',
    managerComment: 'Godkjent pga strategisk verdi. Følg opp med pressemelding.',
    area: 'Bergen',
    units: 145,
    pricePerUnit: 376,
  },
  {
    id: 'wr-seed-4',
    dealId: '6',
    dealName: 'Strømming tillegg',
    accountName: 'Parkveien Borettslag',
    value: 14250,
    discount: 28,
    notes: 'Ber om 28 % rabatt på add-on. Vurderer å bytte leverandør.',
    packageName: 'Frihet S',
    submittedBy: 'Henrik Lund',
    submittedAt: '2026-04-16T14:35:00',
    status: 'rejected',
    managerComment: 'For høy rabatt på tillegg. Tilby max 15 %.',
    area: 'Oslo',
    units: 75,
    pricePerUnit: 285,
  },
];

interface WarRoomContextValue {
  items: WarRoomItem[];
  submit: (item: Omit<WarRoomItem, 'id' | 'submittedAt' | 'status'>) => void;
  approve: (id: string, comment?: string) => void;
  reject: (id: string, comment?: string) => void;
  isInWarRoom: (dealName: string, accountName: string, dealId?: string) => WarRoomItem | undefined;
}

const WarRoomContext = createContext<WarRoomContextValue | undefined>(undefined);

export function WarRoomProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WarRoomItem[]>(SEED_ITEMS);

  const submit = useCallback((item: Omit<WarRoomItem, 'id' | 'submittedAt' | 'status'>) => {
    setItems((prev) => [
      {
        ...item,
        id: `wr-${Date.now()}`,
        submittedAt: new Date().toISOString(),
        status: 'pending',
      },
      ...prev,
    ]);
  }, []);

  const approve = useCallback((id: string, comment?: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'approved', managerComment: comment } : i)));
  }, []);

  const reject = useCallback((id: string, comment?: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'rejected', managerComment: comment } : i)));
  }, []);

  const isInWarRoom = useCallback(
    (dealName: string, accountName: string, dealId?: string) =>
      items.find((i) =>
        dealId ? i.dealId === dealId : (i.dealName === dealName && i.accountName === accountName)
      ),
    [items]
  );

  return (
    <WarRoomContext.Provider value={{ items, submit, approve, reject, isInWarRoom }}>
      {children}
    </WarRoomContext.Provider>
  );
}

export function useWarRoom() {
  const ctx = useContext(WarRoomContext);
  if (!ctx) throw new Error('useWarRoom must be used within WarRoomProvider');
  return ctx;
}