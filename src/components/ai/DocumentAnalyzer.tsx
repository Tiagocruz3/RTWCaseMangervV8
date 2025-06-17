import React, { useState } from 'react';
import { FileText, Upload, Loader } from 'lucide-react';
import { aiService } from '../../services/aiService';
import Tesseract from 'tesseract.js';

const DocumentAnalyzer: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<{
    dates?: string[];
    restrictions?: string[];
    recommendations?: string[];
  } | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    try {
      let text = '';

      // Extract text from image using Tesseract
      if (file.type.startsWith('image/')) {
        const { data: { text: extractedText } } = await Tesseract.recognize(
          file,
          'eng'
        );
        text = extractedText;
      } else if (file.type === 'application/pdf') {
        // Handle PDF text extraction
        // Note: In a real implementation, you'd want to use a server-side solution
        // for PDF extraction. This is just a placeholder.
        text = 'PDF text extraction would happen here';
      }

      // Analyze the extracted text
      const analysis = await aiService.extractDocumentData(text);
      setResults(analysis);
    } catch (error) {
      console.error('Error analyzing document:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className="p-4 border-b border-gray-200 flex items-center">
        <FileText className="h-5 w-5 text-primary-500 mr-2" />
        <h2 className="text-lg font-semibold">Document Analysis</h2>
      </div>

      <div className="p-4">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Document
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
                  <span>Upload a file</span>
                  <input
                    type="file"
                    className="sr-only"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    disabled={isAnalyzing}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">
                PDF or image files up to 10MB
              </p>
            </div>
          </div>
        </div>

        {isAnalyzing && (
          <div className="flex items-center justify-center p-4">
            <Loader className="h-8 w-8 text-primary-500 animate-spin" />
            <span className="ml-2 text-sm text-gray-600">Analyzing document...</span>
          </div>
        )}

        {results && (
          <div className="space-y-4">
            {results.dates && results.dates.length > 0 && (
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Important Dates</h3>
                <ul className="space-y-1">
                  {results.dates.map((date, index) => (
                    <li key={index} className="text-sm text-gray-600">• {date}</li>
                  ))}
                </ul>
              </div>
            )}

            {results.restrictions && results.restrictions.length > 0 && (
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Work Restrictions</h3>
                <ul className="space-y-1">
                  {results.restrictions.map((restriction, index) => (
                    <li key={index} className="text-sm text-gray-600">• {restriction}</li>
                  ))}
                </ul>
              </div>
            )}

            {results.recommendations && results.recommendations.length > 0 && (
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Medical Recommendations</h3>
                <ul className="space-y-1">
                  {results.recommendations.map((recommendation, index) => (
                    <li key={index} className="text-sm text-gray-600">• {recommendation}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentAnalyzer;