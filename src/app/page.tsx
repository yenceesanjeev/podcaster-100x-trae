'use client';

import { useEffect, useState } from 'react';
import { useConversation } from '@elevenlabs/react'; // Removed ConnectionStatus

export default function Page() {
  const [recordings, setRecordings] = useState<string[]>([]);
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

  const {
    startSession,
    endSession, // Renamed from stopSession
    isSpeaking, // Renamed from isRecording
    status, // Renamed from connectionStatus
    // ... other properties you might be using from the hook
  } = useConversation({
    agentId: agentId,
    // You might need to add other options here if required by your setup or the hook
  });

  const handleStartRecording = async () => {
    if (!agentId) {
      alert('ElevenLabs Agent ID is not configured.');
      return;
    }
    try {
      await startSession({ agentId }); // Pass agentId here
    } catch (error) {
      console.error('Error starting session:', error);
      alert('Failed to start recording. Check console for details.');
    }
  };

  const handleStopRecording = async () => {
    try {
      await endSession();
    } catch (error) {
      console.error('Error stopping session:', error);
      alert('Failed to stop recording. Check console for details.');
    }
  };

  // Placeholder for buying minutes - implement actual logic if needed
  const handleBuyMinutes = () => {
    alert('This functionality is not yet implemented.');
  };

  useEffect(() => {
    // Example: Log status changes
    console.log('Connection status:', status);
    console.log('Is agent speaking:', isSpeaking);

    // You might want to update recordings based on messages from the conversation
    // This part depends on how you handle messages from the useConversation hook
    // e.g., if there's an onMessage callback that provides audio data or URLs
  }, [status, isSpeaking]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 text-black">
      <header className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-2">Record a podcast with an AI Host</h1>
        <p className="text-lg text-gray-600">Because everybody has a story to share</p>
      </header>

      <div className="w-full max-w-2xl bg-gray-50 p-8 rounded-xl shadow-lg">
        <div className="flex justify-around mb-6">
          <button
            onClick={handleStartRecording}
            disabled={status === 'connected' || isSpeaking}
            className="px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 disabled:bg-gray-400 flex items-center space-x-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
            <span>Start Recording</span>
          </button>
          <button
            onClick={handleStopRecording}
            disabled={status !== 'connected' && !isSpeaking}
            className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg font-semibold hover:bg-gray-100 disabled:bg-gray-200 disabled:text-gray-400 flex items-center space-x-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
            </svg>
            <span>Stop Recording</span>
          </button>
          <button
            onClick={handleBuyMinutes}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
          >
            Buy 20 Minutes (₹299)
          </button>
        </div>

        <div className="bg-white p-4 rounded-lg shadow mb-8 text-center">
          <p className="text-gray-700">
            <span className={`inline-block w-3 h-3 rounded-full mr-2 ${status === 'connected' ? 'bg-green-500' : status === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
            Status: {status} {isSpeaking && "(Agent is speaking)"}
          </p>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Your Recordings</h2>
          {recordings.length === 0 ? (
            <p className="text-gray-500">No recordings yet</p>
          ) : (
            <ul className="space-y-2">
              {recordings.map((rec, index) => (
                <li key={index} className="p-3 bg-gray-100 rounded-md text-left">
                  {/* Display recording info - adjust as needed */}
                  Recording {index + 1}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <footer className="mt-12 text-center text-sm text-gray-500">
        <p>P.S - I don&apos;t have a credit card on Eleven Labs, so I don&apos;t know when it&apos;ll stop working</p>
      </footer>
    </div>
  );
}
