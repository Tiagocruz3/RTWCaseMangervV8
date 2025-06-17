import React, { useState } from 'react';
import { Send, Bot, Loader } from 'lucide-react';
import { aiService } from '../../services/aiService';
import { useCaseStore } from '../../store/caseStore';
import { useAISettings } from '../../store/aiSettingsStore';
import ReactMarkdown from 'react-markdown';
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';

interface Message {
  type: 'user' | 'ai';
  content: string;
}

interface AIChatAssistantProps {
  caseId?: string;
}

const AIChatAssistant: React.FC<AIChatAssistantProps> = ({ caseId }) => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const { getCase } = useCaseStore();
  const { selectedModel } = useAISettings();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentQuery = query.trim();
    if (!currentQuery) return;

    // Clear input immediately
    setQuery('');
    
    // Add user message immediately
    setMessages(prev => [...prev, { type: 'user', content: currentQuery }]);
    setIsLoading(true);

    try {
      let answer: string = '';
      if (caseId) {
        const caseData = await getCase(caseId);
        if (caseData) {
          answer = await aiService.answerQuery(currentQuery, caseData, selectedModel || '');
        }
      } else {
        answer = "Please select a case to get specific information.";
      }
      
      // Add AI response
      setMessages(prev => [...prev, { 
        type: 'ai', 
        content: answer || 'I couldn\'t find an answer to your question.'
      }]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      setMessages(prev => [...prev, { 
        type: 'ai', 
        content: 'Sorry, I encountered an error processing your request.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    setMessages(prev => [...prev, { type: 'user', content: `Uploaded document: ${file.name}` }]);
    try {
      let text = '';
      if (file.type.startsWith('image/')) {
        const { data: { text: extractedText } } = await Tesseract.recognize(file, 'eng');
        text = extractedText;
      } else if (file.type === 'application/pdf') {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map((item: any) => item.str).join(' ') + '\n';
          }
        } catch (err) {
          text = 'Failed to extract text from PDF.';
        }
      } else {
        text = 'Unsupported file type.';
      }
      const analysis = await aiService.extractDocumentData(text);
      let aiMessage = '';
      if (
        (!analysis.dates || analysis.dates.length === 0) &&
        (!analysis.restrictions || analysis.restrictions.length === 0) &&
        (!analysis.recommendations || analysis.recommendations.length === 0)
      ) {
        aiMessage = 'No key information could be extracted from the document.';
      } else {
        aiMessage = '**Document Analysis:**\n';
        if (analysis.dates && analysis.dates.length > 0) {
          aiMessage += '\n**Dates:**\n' + analysis.dates.map(d => `- ${d}`).join('\n');
        }
        if (analysis.restrictions && analysis.restrictions.length > 0) {
          aiMessage += '\n**Restrictions:**\n' + analysis.restrictions.map(r => `- ${r}`).join('\n');
        }
        if (analysis.recommendations && analysis.recommendations.length > 0) {
          aiMessage += '\n**Recommendations:**\n' + analysis.recommendations.map(r => `- ${r}`).join('\n');
        }
      }
      setMessages(prev => [...prev, { type: 'ai', content: aiMessage }]);
    } catch (error) {
      setMessages(prev => [...prev, { type: 'ai', content: 'Sorry, I could not analyze the document.' }]);
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  };

  // Helper to fetch the fillable PDF template
  const fetchTemplate = async () => {
    const response = await fetch('/Return-work-plan-vic.pdf');
    if (!response.ok) throw new Error('Failed to fetch PDF template');
    return new Uint8Array(await response.arrayBuffer());
  };

  // Map of field numbers to field labels for the PDF
  const fieldLabelMapping: Record<string, string> = {
    1: 'Name of worker',
    2: 'WorkSafe claim number',
    3: 'Pre-injury work - Job title',
    4: 'Pre-injury work - Days/hours of work',
    5: 'Pre-injury work - Location',
    6: 'Name of employer',
    7: 'Duties or tasks to be undertaken',
    8: 'Workplace supports, aids or modifications to be provided',
    9: 'Specific duties or tasks to be avoided',
    10: 'Medical restrictions',
    11: 'Week 1 - Monday',
    12: 'Week 1 - Tuesday',
    13: 'Week 1 - Wednesday',
    14: 'Week 1 - Thursday',
    15: 'Week 1 - Friday',
    16: 'Week 1 - Saturday',
    17: 'Week 1 - Sunday',
    18: 'Week 1 - Total p/w',
    19: 'Week 2 - Monday',
    20: 'Week 2 - Tuesday',
    21: 'Week 2 - Wednesday',
    22: 'Week 2 - Thursday',
    23: 'Week 2 - Friday',
    24: 'Week 2 - Saturday',
    25: 'Week 2 - Sunday',
    26: 'Week 2 - Total p/w',
    27: 'Week 3 - Monday',
    28: 'Week 3 - Tuesday',
    29: 'Week 3 - Wednesday',
    30: 'Week 3 - Thursday',
    31: 'Week 3 - Friday',
    32: 'Week 3 - Saturday',
    33: 'Week 3 - Sunday',
    34: 'Week 3 - Total p/w',
    35: 'Week 4 - Monday',
    36: 'Week 4 - Tuesday',
    37: 'Week 4 - Wednesday',
    38: 'Week 4 - Thursday',
    39: 'Week 4 - Friday',
    40: 'Week 4 - Saturday',
    41: 'Week 4 - Sunday',
    42: 'Week 4 - Total p/w',
    43: 'Work Location (address, team, department)',
    44: 'Start date',
    45: 'Supervisor (name, position, phone number)',
    46: 'Review date',
    47: 'Prepared by (name, position, phone number)',
    48: 'Prepared on (date)',
    49: 'Worker - Name',
    50: 'Worker - Phone',
    51: 'Worker - Signed',
    52: 'Worker - Date',
    53: 'Return to Work Coordinator - Name',
    54: 'Return to Work Coordinator - Phone',
    55: 'Return to Work Coordinator - Signed',
    56: 'Return to Work Coordinator - Date',
    57: 'Supervisor - Name',
    58: 'Supervisor - Phone',
    59: 'Supervisor - Signed',
    60: 'Supervisor - Date',
    61: 'Treating Health Practitioner - Name',
    62: 'Treating Health Practitioner - Phone',
    63: 'Treating Health Practitioner - Signed',
    64: 'Treating Health Practitioner - Date',
    65: 'Notes/additional information',
  };

  // Fill the PDF and trigger download using AI for each field
  const handleGeneratePDF = async () => {
    if (!caseId) {
      alert('No case selected.');
      return;
    }
    setIsGeneratingPDF(true);
    setMessages(prev => [...prev, { type: 'ai', content: 'Generating RTW Plan PDF using AI for each field. This may take up to a minute...' }]);
    try {
      const caseData = await getCase(caseId);
      if (!caseData || !caseData.rtwPlan) throw new Error('No RTW plan found for this case.');
      const rtwPlan = caseData.rtwPlan;
      const templateBytes = await fetchTemplate();
      const pdfDoc = await PDFDocument.load(templateBytes);
      const form = pdfDoc.getForm();
      // For each field, use the AI to generate the answer
      for (const [fieldNumber, fieldLabel] of Object.entries(fieldLabelMapping)) {
        // Skip signature fields
        if (fieldLabel.toLowerCase().includes('signed')) continue;
        const aiAnswer = await aiService.generateFieldAnswer({ fieldLabel, caseData, rtwPlan });
        try {
          form.getTextField(fieldNumber).setText(aiAnswer);
        } catch (e) {
          // Field not found, ignore
        }
      }
      form.flatten();
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'RTW-Plan-Filled-AI.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMessages(prev => [...prev, { type: 'ai', content: 'RTW Plan PDF generated and downloaded with AI-generated answers for each field.' }]);
    } catch (err) {
      setMessages(prev => [...prev, { type: 'ai', content: 'Failed to generate PDF with AI. Make sure the RTW plan and template exist and have the correct fields.' }]);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-gray-200 flex items-center">
        <Bot className="h-5 w-5 text-primary-500 mr-2" />
        <h2 className="text-lg font-semibold">AI Assistant</h2>
      </div>

      <div className="flex-1 p-4 overflow-y-auto flex flex-col space-y-4 bg-white min-h-0">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 whitespace-pre-wrap ${
                message.type === 'user'
                  ? 'bg-primary-500 text-white ml-4'
                  : 'bg-gray-50 text-gray-800 mr-4 border border-gray-200 shadow-sm'
              }`}
              style={message.type === 'ai' ? { fontSize: '0.97rem', lineHeight: '1.6' } : {}}
            >
              {message.type === 'ai' && (
                <div className="flex items-center mb-1">
                  <Bot className="h-4 w-4 text-primary-500 mr-1" />
                  <span className="text-xs font-medium text-gray-500">AI Assistant</span>
                </div>
              )}
              <div className="text-sm">
                {message.type === 'ai' ? (
                  <ReactMarkdown
                    components={{
                      ul: ({ node, ...props }: any) => <ul className="list-disc pl-5 my-2" {...props} />,
                      ol: ({ node, ...props }: any) => <ol className="list-decimal pl-5 my-2" {...props} />,
                      li: ({ node, ...props }: any) => <li className="mb-1" {...props} />,
                      code: ({ node, ...props }: any) => <code className="bg-gray-100 px-1 rounded text-xs" {...props} />,
                      strong: ({ node, ...props }: any) => <strong className="font-semibold" {...props} />,
                      em: ({ node, ...props }: any) => <em className="italic" {...props} />,
                      p: ({ node, ...props }: any) => <p className="mb-2" {...props} />,
                      br: () => <br />,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                ) : (
                  <span>{message.content}</span>
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3">
              <Loader className="h-5 w-5 text-primary-500 animate-spin" />
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 flex-shrink-0">
        <div className="flex space-x-2 mb-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about this case..."
            className="flex-1 rounded-md border border-gray-300 shadow-sm px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <label className="cursor-pointer px-3 py-2 bg-gray-100 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-200">
            Upload Document
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileUpload}
              className="sr-only"
              disabled={isLoading}
            />
          </label>
          <span className="text-xs text-gray-400">PDF or image files up to 10MB</span>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleGeneratePDF}
            disabled={isGeneratingPDF}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            {isGeneratingPDF ? 'Generating RTW Plan PDF...' : 'Generate RTW Plan PDF'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AIChatAssistant;