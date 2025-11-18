'use client';

import { useState } from 'react';

const GOOGLE_SHEET_ID = '1yR_9x6SA7wuAlupOmCnXDr1hJoJUVUmOFySKijRB4j8';
const GOOGLE_SHEET_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}`;

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rowsProcessed, setRowsProcessed] = useState(0);
  const [csvUrl, setCsvUrl] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [sheetsUpdated, setSheetsUpdated] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, message]);
  };

  const handleRunScraper = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    setRowsProcessed(0);
    setCsvUrl('');
    setSheetsUpdated(false);
    setLogs([]);

    addLog('Scraping @kantorstafpresidenri...');

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        setError('Server returned invalid response: ' + text.substring(0, 200));
        addLog('❌ Error: Invalid response from server');
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to run scraper');
        addLog(`❌ Error: ${data.error || 'Failed to run scraper'}`);
        return;
      }

      // Add logs based on the process
      addLog(`Found ${data.rows || 0} posts`);
      addLog('Formatting posts...');
      
      if (data.sheetsUpdated) {
        addLog('Updating Google Sheet...');
        setSheetsUpdated(true);
      }
      
      addLog('✅ Success!');

      setSuccess(data.message || `Successfully scraped ${data.rows} posts`);
      setRowsProcessed(data.rows || 0);
      setCsvUrl(data.csvUrl || '');
      setLastUpdated(new Date().toLocaleString());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError('Error running scraper: ' + errorMessage);
      addLog(`❌ Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#141F4D] p-8 relative flex flex-col">
      {/* Centered Logo Background */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
        <img 
          src="/assets/logo.png" 
          alt="Kantor Staf Presiden Logo" 
          className="h-auto w-auto max-w-md max-h-md object-contain opacity-10"
        />
      </div>

      <div className="max-w-4xl mx-auto relative z-10 flex-1 flex flex-col">

        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-2xl p-8 border border-white/20">
          {/* Title */}
          <h1 className="text-3xl font-bold text-slate-900 mb-2 text-center">Kantor Staf Presiden Instagram Data Engine</h1>
          <p className="text-slate-600 mb-8 text-center">hi team, bisa di coba nih automation nya hehe</p>

          {/* Action Buttons */}
          <div className="mb-6">
            <button
              onClick={handleRunScraper}
              disabled={loading}
              className="w-full bg-[#1e40af] hover:bg-[#1e3a8a] disabled:bg-slate-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Running...
                </>
              ) : (
                'Fetch Latest Posts'
              )}
            </button>
          </div>

          {/* Status Box */}
          {(success || error || lastUpdated) && (
            <div className={`mt-6 p-6 rounded-lg border-2 shadow-lg ${
              error 
                ? 'bg-red-50/90 border-red-300 backdrop-blur-sm' 
                : success 
                  ? 'bg-green-50/90 border-green-300 backdrop-blur-sm' 
                  : 'bg-gray-50/90 border-gray-300 backdrop-blur-sm'
            }`}>
              <div className="flex items-center mb-4">
                {error ? (
                  <span className="text-red-800 font-bold text-lg">❌ Error</span>
                ) : success ? (
                  <span className="text-green-800 font-bold text-lg">✅ Success</span>
                ) : (
                  <span className="text-gray-800 font-bold text-lg">Status</span>
                )}
              </div>

              <div className="space-y-2 text-sm">
                {lastUpdated && (
                  <div className="flex items-center">
                    <span className="font-semibold text-gray-700 w-32">Last Updated:</span>
                    <span className="text-gray-600">{lastUpdated}</span>
                  </div>
                )}

                {rowsProcessed > 0 && (
                  <div className="flex items-center">
                    <span className="font-semibold text-gray-700 w-32">Rows Updated:</span>
                    <span className="text-gray-600">{rowsProcessed}</span>
                  </div>
                )}

                {rowsProcessed > 0 && (
                  <div className="flex items-center">
                    <span className="font-semibold text-gray-700 w-32">New posts detected:</span>
                    <span className="text-gray-600">{rowsProcessed}</span>
                  </div>
                )}

                {error && (
                  <div className="mt-4 p-3 bg-red-100 rounded border border-red-300">
                    <p className="text-red-800">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="mt-4 p-3 bg-green-100 rounded border border-green-300">
                    <p className="text-green-800">{success}</p>
                  </div>
                )}

                {sheetsUpdated && (
                  <div className="mt-4">
                    <a
                      href={GOOGLE_SHEET_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center bg-[#059669] hover:bg-[#047857] text-white font-semibold py-2 px-4 rounded-lg transition-colors shadow-md hover:shadow-lg"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      View Google Sheet
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Logs Box */}
          {logs.length > 0 && (
            <div className="mt-6 p-6 bg-[#0f172a] rounded-lg border border-slate-700 shadow-xl">
              <h3 className="text-white font-semibold mb-4">Logs</h3>
              <div className="space-y-2 font-mono text-sm">
                {logs.map((log, index) => (
                  <div key={index} className="text-slate-300 flex items-start">
                    <span className="text-slate-500 mr-2">{String(index + 1).padStart(2, '0')}.</span>
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Copyright Footer - Fixed at bottom of viewport */}
      <div className="fixed bottom-4 left-0 right-0 text-center z-20">
        <p className="text-gray-400 text-sm">
          © 2025 Kantor Staf Presiden – Data Engine V1 Prototype
        </p>
      </div>
    </main>
  );
}
