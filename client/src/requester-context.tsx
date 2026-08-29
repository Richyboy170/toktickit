import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { DevelopmentRequester } from "./api.js";

const STORAGE_KEY = "toktickit.developmentRequester";

interface RequesterContextValue {
  requester: DevelopmentRequester | null;
  selectRequester: (requester: DevelopmentRequester) => void;
  clearRequester: () => void;
}

const RequesterContext = createContext<RequesterContextValue | undefined>(undefined);

function readStoredRequester(): DevelopmentRequester | null {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    const requester = JSON.parse(value) as Partial<DevelopmentRequester>;
    if (
      !Number.isInteger(requester.id) ||
      Number(requester.id) <= 0 ||
      typeof requester.name !== "string" ||
      typeof requester.email !== "string"
    ) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return requester as DevelopmentRequester;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function RequesterProvider({ children }: { children: ReactNode }) {
  const [requester, setRequester] = useState<DevelopmentRequester | null>(readStoredRequester);

  const value = useMemo<RequesterContextValue>(
    () => ({
      requester,
      selectRequester(nextRequester) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextRequester));
        setRequester(nextRequester);
      },
      clearRequester() {
        sessionStorage.removeItem(STORAGE_KEY);
        setRequester(null);
      },
    }),
    [requester],
  );

  return <RequesterContext.Provider value={value}>{children}</RequesterContext.Provider>;
}

export function useRequester(): RequesterContextValue {
  const context = useContext(RequesterContext);
  if (!context) throw new Error("useRequester must be used inside RequesterProvider");
  return context;
}
