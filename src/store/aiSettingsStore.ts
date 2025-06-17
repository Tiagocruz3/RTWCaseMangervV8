import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AISettings {
  selectedModel: string;
  setSelectedModel: (modelId: string) => void;
}

export const useAISettings = create<AISettings>()(
  persist(
    (set) => ({
      selectedModel: 'anthropic/claude-3-sonnet',
      setSelectedModel: (modelId) => set({ selectedModel: modelId }),
    }),
    {
      name: 'ai-settings',
    }
  )
);