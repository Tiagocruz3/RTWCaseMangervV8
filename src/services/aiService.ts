import OpenAI from 'openai';

const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY;

// Check if we have a valid API key (not empty, not the placeholder, and not undefined)
const hasValidKey = openRouterKey && 
  openRouterKey !== 'your_actual_api_key_here' && 
  openRouterKey !== 'sk-or-v1-your-actual-api-key-here' &&
  openRouterKey !== 'sk-or-v1-placeholder-key-for-development' &&
  openRouterKey.trim() !== '';

// Initialize OpenRouter client only if we have a valid key
const openRouter = hasValidKey ? new OpenAI({
  apiKey: openRouterKey,
  baseURL: 'https://openrouter.ai/api/v1',
  dangerouslyAllowBrowser: true,
  defaultHeaders: {
    'HTTP-Referer': window.location.origin,
    'X-Title': 'Return-to-Work Case Management'
  }
}) : null;

export type AIModel = {
  id: string;
  name: string;
  provider: 'openrouter';
  contextLength: number;
  costPer1kTokens: number;
  description: string;
};

export const availableModels: AIModel[] = [
  // Anthropic Models
  {
    id: 'anthropic/claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'openrouter',
    contextLength: 200000,
    costPer1kTokens: 0.015,
    description: 'Most capable model, best for complex analysis and expert tasks'
  },
  {
    id: 'anthropic/claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'openrouter',
    contextLength: 200000,
    costPer1kTokens: 0.003,
    description: 'Excellent balance of intelligence and speed'
  },
  {
    id: 'anthropic/claude-2.1',
    name: 'Claude 2.1',
    provider: 'openrouter',
    contextLength: 200000,
    costPer1kTokens: 0.008,
    description: 'Powerful model for complex reasoning and analysis'
  },
  
  // OpenAI Models
  {
    id: 'openai/gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openrouter',
    contextLength: 128000,
    costPer1kTokens: 0.01,
    description: 'Latest GPT-4 model with improved capabilities'
  },
  {
    id: 'openai/gpt-4',
    name: 'GPT-4',
    provider: 'openrouter',
    contextLength: 8192,
    costPer1kTokens: 0.03,
    description: 'Highly capable model for complex tasks'
  },
  {
    id: 'openai/gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openrouter',
    contextLength: 16385,
    costPer1kTokens: 0.001,
    description: 'Fast and efficient for general tasks'
  },
  
  // Mistral Models
  {
    id: 'mistral/mistral-large',
    name: 'Mistral Large',
    provider: 'openrouter',
    contextLength: 32768,
    costPer1kTokens: 0.008,
    description: 'Powerful open model with strong reasoning capabilities'
  },
  {
    id: 'mistral/mistral-medium',
    name: 'Mistral Medium',
    provider: 'openrouter',
    contextLength: 32768,
    costPer1kTokens: 0.002,
    description: 'Balanced performance for general tasks'
  },
  {
    id: 'mistral/mistral-small',
    name: 'Mistral Small',
    provider: 'openrouter',
    contextLength: 32768,
    costPer1kTokens: 0.0006,
    description: 'Efficient model for simpler tasks'
  },
  
  // DeepSeek Models
  {
    id: 'deepseek/deepseek-coder-33b',
    name: 'DeepSeek Coder 33B',
    provider: 'openrouter',
    contextLength: 16384,
    costPer1kTokens: 0.002,
    description: 'Specialized for code understanding and generation'
  },
  {
    id: 'deepseek/deepseek-67b',
    name: 'DeepSeek 67B',
    provider: 'openrouter',
    contextLength: 16384,
    costPer1kTokens: 0.004,
    description: 'Large model with strong general capabilities'
  }
];

export const aiService = {
  async answerQuery(query: string, caseData: any, modelId: string = 'anthropic/claude-3-sonnet') {
    if (!openRouter) {
      throw new Error('OpenRouter API key not configured');
    }
    
    try {
      const completion = await openRouter.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant for a Return-to-Work case management system. You help consultants by providing information about cases and suggesting actions."
          },
          {
            role: "user",
            content: `Case Context: ${JSON.stringify(caseData)}\n\nQuery: ${query}`
          }
        ],
        model: modelId,
      });

      return completion.choices[0].message.content;
    } catch (error: any) {
      if (error.status === 401) {
        throw new Error('401 No auth credentials found');
      } else if (error.status === 403) {
        throw new Error('403 Access denied - check API key permissions');
      } else if (error.status === 429) {
        throw new Error('429 Rate limit exceeded');
      }
      throw error;
    }
  },

  async analyzeCase(caseData: any, modelId: string = 'anthropic/claude-3-sonnet') {
    if (!openRouter) {
      throw new Error('OpenRouter API key not configured');
    }
    
    try {
      const completion = await openRouter.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an expert in analyzing Return-to-Work cases. Identify risks, provide recommendations, and flag important issues. Format your response with clear sections: 'Risks:', 'Recommendations:', and 'Flags:' followed by bullet points for each item."
          },
          {
            role: "user",
            content: `Please analyze this case and provide insights:\n${JSON.stringify(caseData, null, 2)}`
          }
        ],
        model: modelId,
      });

      const content = completion.choices[0].message.content || '';
      
      // Parse the response more reliably
      const parseSection = (sectionName: string): string[] => {
        const regex = new RegExp(`${sectionName}:(.*?)(?=(?:Risks:|Recommendations:|Flags:)|$)`, 'is');
        const match = content.match(regex);
        if (!match) return [];
        
        return match[1]
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')))
          .map(line => line.replace(/^[•\-*]\s*/, '').trim())
          .filter(Boolean);
      };

      return {
        risks: parseSection('Risks'),
        recommendations: parseSection('Recommendations'),
        flags: parseSection('Flags')
      };
    } catch (error: any) {
      if (error.status === 401) {
        throw new Error('401 No auth credentials found');
      } else if (error.status === 403) {
        throw new Error('403 Access denied - check API key permissions');
      } else if (error.status === 429) {
        throw new Error('429 Rate limit exceeded');
      }
      throw error;
    }
  },

  async extractDocumentData(text: string, modelId: string = 'anthropic/claude-3-sonnet') {
    if (!openRouter) {
      throw new Error('OpenRouter API key not configured');
    }
    
    try {
      const completion = await openRouter.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an expert at analyzing medical certificates and work capacity documents. Extract key dates, restrictions, and recommendations. Format your response with clear sections: 'Dates:', 'Restrictions:', and 'Recommendations:' followed by bullet points for each item."
          },
          {
            role: "user",
            content: `Please analyze this document text and extract key information:\n\n${text}`
          }
        ],
        model: modelId,
      });

      const content = completion.choices[0].message.content || '';
      
      // Parse the response more reliably
      const parseSection = (sectionName: string): string[] => {
        const regex = new RegExp(`${sectionName}:(.*?)(?=(?:Dates:|Restrictions:|Recommendations:)|$)`, 'is');
        const match = content.match(regex);
        if (!match) return [];
        
        return match[1]
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')))
          .map(line => line.replace(/^[•\-*]\s*/, '').trim())
          .filter(Boolean);
      };

      return {
        dates: parseSection('Dates'),
        restrictions: parseSection('Restrictions'),
        recommendations: parseSection('Recommendations')
      };
    } catch (error: any) {
      if (error.status === 401) {
        throw new Error('401 No auth credentials found');
      } else if (error.status === 403) {
        throw new Error('403 Access denied - check API key permissions');
      } else if (error.status === 429) {
        throw new Error('429 Rate limit exceeded');
      }
      throw error;
    }
  },

  async generateFieldAnswer({ fieldLabel, caseData, rtwPlan, modelId = 'anthropic/claude-3-sonnet' }: { fieldLabel: string, caseData: any, rtwPlan: any, modelId?: string }) {
    if (!openRouter) {
      throw new Error('OpenRouter API key not configured');
    }
    try {
      const completion = await openRouter.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant for a Return-to-Work case management system. Given the case context and RTW plan, generate a clear, concise, and contextually appropriate answer for the given form field."
          },
          {
            role: "user",
            content: `Case Context: ${JSON.stringify(caseData)}\n\nRTW Plan: ${JSON.stringify(rtwPlan)}\n\nField: ${fieldLabel}\n\nWhat is the best answer for this field?`
          }
        ],
        model: modelId,
      });
      return completion.choices[0].message.content?.trim() || '';
    } catch (error: any) {
      return '';
    }
  }
};