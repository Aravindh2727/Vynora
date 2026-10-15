import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface NavigationContextType {
  isMobile: boolean;
  historyStack: string[];
  goBack: (fallbackPath?: string) => void;
  canGoBack: boolean;
}

const NavigationContext = createContext<NavigationContextType>({
  isMobile: false,
  historyStack: [],
  goBack: () => {},
  canGoBack: false
});

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [historyStack, setHistoryStack] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  // Track window resize for mobile breakpoint
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Track in-app route history
  const isFirstRender = useRef(true);
  useEffect(() => {
    const currentPath = location.pathname + location.search;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setHistoryStack([currentPath]);
      return;
    }

    setHistoryStack((prev) => {
      // Don't add consecutive duplicates
      if (prev[prev.length - 1] === currentPath) return prev;
      return [...prev, currentPath];
    });
  }, [location.pathname, location.search]);

  /**
   * Intelligently navigate back one level:
   * Uses navigate(-1) if an in-app history stack entry exists;
   * otherwise falls back to a deterministic parent route.
   */
  const goBack = (fallbackPath: string = '/') => {
    const hasBrowserHistory = typeof window !== 'undefined' && 
      window.history.length > 1 && 
      window.history.state && 
      (window.history.state.idx ?? 0) > 0;

    if (historyStack.length > 1 || hasBrowserHistory) {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  };

  const canGoBack = location.pathname !== '/' || location.search.length > 0;

  return (
    <NavigationContext.Provider value={{ isMobile, historyStack, goBack, canGoBack }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useVynoraNav = () => useContext(NavigationContext);
