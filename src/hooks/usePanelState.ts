import { useState, useEffect } from 'react';

export interface PanelState {
  console: boolean;
  complexity: boolean;
  bottomDrawer: boolean;
}

const defaultPanelState: PanelState = {
  console: true,
  complexity: true,
  bottomDrawer: true,
};

const STORAGE_KEY = 'noir-playground-panel-states';

export function usePanelState() {
  const [panelState, setPanelState] = useState<PanelState>(defaultPanelState);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsedState = JSON.parse(saved);
        // Merge with defaults to handle new panels
        setPanelState({ ...defaultPanelState, ...parsedState });
      }
    } catch (error) {
      console.warn('Failed to load panel states from localStorage:', error);
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(panelState));
    } catch (error) {
      console.warn('Failed to save panel states to localStorage:', error);
    }
  }, [panelState]);

  const togglePanel = (panel: keyof PanelState) => {
    setPanelState(prev => ({
      ...prev,
      [panel]: !prev[panel]
    }));
  };

  const setPanelExpanded = (panel: keyof PanelState, expanded: boolean) => {
    setPanelState(prev => ({
      ...prev,
      [panel]: expanded
    }));
  };

  return {
    panelState,
    togglePanel,
    setPanelExpanded,
  };
}