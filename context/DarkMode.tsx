import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const DarkModeContext = createContext<{
  dark: boolean;
  toggle: () => void;
}>({ dark: false, toggle: () => {} });

export function DarkModeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("kt-dark");
    if (saved === "true") setDark(true);
  }, []);

  const toggle = () => {
    setDark(prev => {
      localStorage.setItem("kt-dark", String(!prev));
      return !prev;
    });
  };

  return (
    <DarkModeContext.Provider value={{ dark, toggle }}>
      {children}
    </DarkModeContext.Provider>
  );
}

export const useDark = () => useContext(DarkModeContext);
