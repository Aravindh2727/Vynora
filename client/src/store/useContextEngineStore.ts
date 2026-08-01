import { create } from 'zustand';

interface ContextEngineState {
  user: any;
  authLoading: boolean;
  family: any;
  finances: any;
  tasks: any[];
  assets: any[];
  documents: any[];
  aiStatus: string;
  lastInsight: string | null;
  setUser: (user: any) => void;
  setAuthLoading: (loading: boolean) => void;
  addTransaction: (transaction: any) => void;
  addTask: (task: any) => void;
  setAiStatus: (status: string) => void;
  setLastInsight: (insight: string | null) => void;
  dispatchIntent: (prompt: string) => Promise<void>;
}

// The Context Engine Store holds the aggregate state of all modules
// so the AI can read it and respond contextually.
export const useContextEngineStore = create<ContextEngineState>((set, get) => ({
  user: null,
  authLoading: true,
  family: null,
  
  // Module Data
  finances: {
    transactions: [],
    monthlyBudget: 0,
    totalSpent: 0
  },
  tasks: [],
  assets: [],
  documents: [],

  // Context Engine Status
  aiStatus: 'idle', // idle, thinking, ready
  lastInsight: null,

  // Actions
  setUser: (user) => set({ user }),
  setAuthLoading: (loading) => set({ authLoading: loading }),
  
  addTransaction: (transaction) => set((state) => ({
    finances: {
      ...state.finances,
      transactions: [transaction, ...state.finances.transactions],
      totalSpent: state.finances.totalSpent + transaction.amount
    }
  })),

  addTask: (task) => set((state) => ({
    tasks: [...state.tasks, task]
  })),

  setAiStatus: (status) => set({ aiStatus: status }),
  setLastInsight: (insight) => set({ lastInsight: insight }),

  // The core action triggered by the AI Command Palette
  dispatchIntent: async (prompt) => {
    set({ aiStatus: 'thinking' });
    try {
      // Sends the prompt + current state to the backend AI endpoint
      /*
      const response = await fetch('/api/ai/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context: get() })
      });
      const data = await response.json();
      */
      
      // Simulating a network delay and mock AI response
      setTimeout(() => {
        set({ 
          aiStatus: 'ready',
          lastInsight: `Processed your prompt: "${prompt}". Context updated.` 
        });
      }, 1500);

    } catch (error) {
      set({ aiStatus: 'idle', lastInsight: 'Failed to process context.' });
    }
  }
}));
