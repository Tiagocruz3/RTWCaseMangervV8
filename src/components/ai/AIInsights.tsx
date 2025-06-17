import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle, AlertCircle, Loader, XCircle } from 'lucide-react';
import { aiService } from '../../services/aiService';
import { Case } from '../../types';
import { useAISettings } from '../../store/aiSettingsStore';

interface AIInsightsProps {
  caseData: Case;
  cachedInsights?: {
    risks: string[];
    recommendations: string[];
    flags: string[];
  };
  isLoading?: boolean;
  error?: string | null;
}

const AIInsights: React.FC<AIInsightsProps> = ({ caseData, cachedInsights, isLoading: parentLoading, error: parentError }) => {
  const [insights, setInsights] = useState<{
    risks: string[];
    recommendations: string[];
    flags: string[];
  }>({
    risks: [],
    recommendations: [],
    flags: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectedModel } = useAISettings();
  const lastCaseIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (cachedInsights) {
      setInsights(cachedInsights);
      setIsLoading(false);
      setError(null);
      return;
    }
    // Only analyze if the case ID changes
    if (lastCaseIdRef.current === caseData.id) return;
    lastCaseIdRef.current = caseData.id;
    setIsLoading(true);
    const analyzeCase = async () => {
      try {
        setError(null);
        const analysis = await aiService.analyzeCase(caseData, selectedModel);
        setInsights(analysis);
      } catch (error) {
        console.error('Error analyzing case:', error);
        if (error instanceof Error) {
          if (error.message === 'OpenRouter API key not configured') {
            setError('AI analysis is not available. Please configure the OpenRouter API key in your environment variables.');
          } else if (error.message.includes('401') || error.message.includes('No auth credentials found')) {
            setError('Invalid API key. Please check your OpenRouter API key in the .env file and ensure it\'s valid. Get a new key from https://openrouter.ai/keys if needed.');
          } else if (error.message.includes('403')) {
            setError('Access denied. Please check that your OpenRouter API key has the necessary permissions.');
          } else if (error.message.includes('429')) {
            setError('Rate limit exceeded. Please try again in a few moments.');
          } else {
            setError(`AI analysis failed: ${error.message}`);
          }
        } else {
          setError('An unexpected error occurred while analyzing the case. Please try again later.');
        }
      } finally {
        setIsLoading(false);
      }
    };
    analyzeCase();
    // Only re-run if caseData.id changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseData.id, selectedModel, cachedInsights]);

  if (typeof parentLoading === 'boolean' ? parentLoading : isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader className="h-8 w-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (parentError || error) {
    return (
      <div className="p-4 bg-error-50 rounded-lg border border-error-200">
        <div className="flex items-center text-error-700">
          <XCircle className="h-5 w-5 mr-2" />
          <div>
            <p className="text-sm font-medium">AI Analysis Error</p>
            <p className="text-sm mt-1">{parentError || error}</p>
            {error && error.includes('Invalid API key') && (
              <p className="text-xs mt-2 text-error-600">
                1. Go to <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="underline">https://openrouter.ai/keys</a><br/>
                2. Create or copy your API key<br/>
                3. Update the VITE_OPENROUTER_API_KEY in your .env file<br/>
                4. Restart your development server
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Risks */}
      {insights.risks.length > 0 && (
        <div className="p-4 bg-red-50 rounded-lg border border-error-200">
          <h3 className="flex items-center text-error-700 font-medium mb-2">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Identified Risks
          </h3>
          <ul className="space-y-2">
            {insights.risks.map((risk, index) => (
              <li key={index} className="text-sm text-error-600 flex items-start">
                <span className="mr-2">•</span>
                {risk}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {insights.recommendations.length > 0 && (
        <div className="p-4 bg-green-50 rounded-lg border border-success-200">
          <h3 className="flex items-center text-success-700 font-medium mb-2">
            <CheckCircle className="h-5 w-5 mr-2" />
            Recommendations
          </h3>
          <ul className="space-y-2">
            {insights.recommendations.map((rec, index) => (
              <li key={index} className="text-sm text-success-600 flex items-start">
                <span className="mr-2">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Red Flags */}
      {insights.flags.length > 0 && (
        <div className="p-4 bg-yellow-50 rounded-lg border border-warning-200">
          <h3 className="flex items-center text-warning-700 font-medium mb-2">
            <AlertCircle className="h-5 w-5 mr-2" />
            Attention Required
          </h3>
          <ul className="space-y-2">
            {insights.flags.map((flag, index) => (
              <li key={index} className="text-sm text-warning-600 flex items-start">
                <span className="mr-2">•</span>
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AIInsights;