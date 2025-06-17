import React, { useState } from 'react';
import { Settings as SettingsIcon, Bot, Key, AlertTriangle, Info, CheckCircle, Save } from 'lucide-react';
import { availableModels, type AIModel } from '../services/aiService';
import { useAISettings } from '../store/aiSettingsStore';

const Settings = () => {
  const { selectedModel, setSelectedModel } = useAISettings();
  const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [selectedModelTemp, setSelectedModelTemp] = useState(selectedModel);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setSelectedModel(selectedModelTemp);
    
    // Show save confirmation
    setShowSaveConfirmation(true);
    
    // Hide confirmation and reset saving state after 2 seconds
    setTimeout(() => {
      setShowSaveConfirmation(false);
      setIsSaving(false);
    }, 2000);
  };

  const handleModelChange = (modelId: string) => {
    setSelectedModelTemp(modelId);
  };

  const isModelAvailable = (model: AIModel) => {
    return openRouterKey ? true : false;
  };

  // Group models by provider
  const modelsByProvider = availableModels.reduce((acc, model) => {
    const provider = model.id.split('/')[0];
    if (!acc[provider]) {
      acc[provider] = [];
    }
    acc[provider].push(model);
    return acc;
  }, {} as Record<string, AIModel[]>);

  const hasChanges = selectedModelTemp !== selectedModel;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <SettingsIcon className="h-6 w-6 text-primary-500 mr-2" />
            Settings
          </h1>
          <p className="text-gray-600">Configure application settings and preferences</p>
        </div>
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors
            ${hasChanges 
              ? 'bg-primary-600 text-white hover:bg-primary-700' 
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
        >
          {isSaving ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Saved
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              <Bot className="h-5 w-5 text-primary-500 mr-2" />
              AI Configuration
            </h2>
            {showSaveConfirmation && (
              <div className="flex items-center text-success-600 bg-success-50 px-3 py-1 rounded-full animate-fade-in">
                <CheckCircle className="h-4 w-4 mr-1" />
                <span className="text-sm">Settings saved</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* API Status */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-3">API Status</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Key className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">OpenRouter API</span>
                  </div>
                  <span className={`text-sm ${openRouterKey ? 'text-success-600' : 'text-error-600'}`}>
                    {openRouterKey ? 'Configured' : 'Not Configured'}
                  </span>
                </div>
              </div>
            </div>

            {/* Model Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">AI Model Selection</h3>
                <div className="flex items-center text-xs text-gray-500">
                  <Info className="h-4 w-4 mr-1" />
                  Powered by OpenRouter
                </div>
              </div>

              <div className="space-y-6">
                {Object.entries(modelsByProvider).map(([provider, models]) => (
                  <div key={provider} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 capitalize">
                        {provider} Models
                      </h4>
                    </div>
                    <div className="p-4 space-y-3">
                      {models.map((model) => (
                        <div
                          key={model.id}
                          className={`relative flex items-center p-4 border rounded-lg ${
                            selectedModelTemp === model.id
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:bg-gray-50'
                          } ${!isModelAvailable(model) ? 'opacity-50' : ''}`}
                        >
                          <div className="flex items-center h-5">
                            <input
                              type="radio"
                              name="ai-model"
                              value={model.id}
                              checked={selectedModelTemp === model.id}
                              onChange={() => handleModelChange(model.id)}
                              disabled={!isModelAvailable(model)}
                              className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                            />
                          </div>
                          <div className="ml-3 flex-grow">
                            <label className="text-sm font-medium text-gray-900">
                              {model.name}
                            </label>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {model.description}
                            </p>
                            <div className="flex items-center mt-1 space-x-4">
                              <span className="text-xs text-gray-500">
                                Context: {model.contextLength.toLocaleString()} tokens
                              </span>
                              <span className="text-xs text-gray-500">
                                Cost: ${model.costPer1kTokens}/1k tokens
                              </span>
                            </div>
                          </div>
                          {!isModelAvailable(model) && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center text-warning-500">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="ml-1 text-xs">API key required</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;