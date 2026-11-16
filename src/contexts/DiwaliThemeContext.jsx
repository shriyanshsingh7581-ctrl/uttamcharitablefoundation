import React, { createContext, useContext, useState, useEffect } from 'react';
import { rtdb } from '../lib/firebase';
import { ref, onValue, set } from 'firebase/database';

const DiwaliThemeContext = createContext({
  isDiwaliActive: true,
  toggleDiwaliTheme: async () => {},
  setDiwaliTheme: async () => {},
  loading: true,
});

export function DiwaliThemeProvider({ children }) {
  const [isDiwaliActive, setIsDiwaliActive] = useState(() => {
    try {
      const cached = localStorage.getItem('ucwf_diwali_theme');
      return cached !== null ? cached === 'true' : true;
    } catch {
      return true;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const themeRef = ref(rtdb, 'settings/diwaliTheme');
    const unsubscribe = onValue(
      themeRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          const active = val === true;
          setIsDiwaliActive(active);
          try {
            localStorage.setItem('ucwf_diwali_theme', String(active));
          } catch {}
        } else {
          // If not configured in Firebase yet, default to TRUE as requested
          setIsDiwaliActive(true);
          try {
            localStorage.setItem('ucwf_diwali_theme', 'true');
          } catch {}
        }
        setLoading(false);
      },
      (error) => {
        console.warn('Diwali theme fetch fallback:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const toggleDiwaliTheme = async () => {
    const nextState = !isDiwaliActive;
    setIsDiwaliActive(nextState);
    try {
      localStorage.setItem('ucwf_diwali_theme', String(nextState));
    } catch {}
    try {
      await set(ref(rtdb, 'settings/diwaliTheme'), nextState);
    } catch (err) {
      console.error('Failed to update Diwali theme in Firebase:', err);
    }
  };

  const setDiwaliTheme = async (active) => {
    setIsDiwaliActive(active);
    try {
      localStorage.setItem('ucwf_diwali_theme', String(active));
    } catch {}
    try {
      await set(ref(rtdb, 'settings/diwaliTheme'), active);
    } catch (err) {
      console.error('Failed to set Diwali theme in Firebase:', err);
    }
  };

  return (
    <DiwaliThemeContext.Provider
      value={{
        isDiwaliActive,
        toggleDiwaliTheme,
        setDiwaliTheme,
        loading,
      }}
    >
      {children}
    </DiwaliThemeContext.Provider>
  );
}

export function useDiwaliTheme() {
  const context = useContext(DiwaliThemeContext);
  if (!context) {
    return {
      isDiwaliActive: true,
      toggleDiwaliTheme: async () => {},
      setDiwaliTheme: async () => {},
      loading: false,
    };
  }
  return context;
}
