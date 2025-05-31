'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useConversation } from '@elevenlabs/react'; // Removed ConnectionStatus
import { RecordingsList } from './components/RecordingsList';

interface UserCredits {
  totalMinutesUsed: number;
  availableMinutes: number;
}

interface Recording {
  id: string;
  title: string;
  duration: number;
  created_at: string;
  conversation_id: string;
}

export default function Page() {
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [isLoadingCredits, setIsLoadingCredits] = useState(true);
  const conversationIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

  const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || '';
  console.log('API Key length:', apiKey.length); // Just log the length for security

  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to Eleven Labs WebSocket');
      startTimeRef.current = Date.now();
    },
    onDisconnect: async () => {
      console.log('Disconnected from Eleven Labs WebSocket');
      stopCredits();
      if (conversationIdRef.current) {
        await updateRecordingDuration();
      }
    },
    onMessage: (message) => {
      console.log('Message received:', message);
    },
    onError: (error: unknown) => {
      console.error('WebSocket Error:', error);
      if (error && typeof error === 'object' && 'target' in error && error.target instanceof WebSocket) {
        console.error('WebSocket URL:', (error.target as WebSocket).url);
      }
    },
    headers: {
      'xi-api-key': apiKey
    }
  });

  const startCredits = useCallback(() => {
    console.log('Starting credits tracking');
    // You could implement a timer here to track usage
  }, []);

  const stopCredits = useCallback(() => {
    console.log('Stopping credits tracking');
    // Stop the tracking timer here if implemented
  }, []);

  // Set default credits without user authentication
  useEffect(() => {
    // Set default credits for all users
    setCredits({
      totalMinutesUsed: 0,
      availableMinutes: 20 // Default 20 minutes for testing
    });
    setIsLoadingCredits(false);
  }, []);
  
  // Helper functions for localStorage
  const getRecordingsFromStorage = (): Recording[] => {
    if (typeof window === 'undefined') return []; // Server-side check
    
    const storedRecordings = localStorage.getItem('recordings');
    return storedRecordings ? JSON.parse(storedRecordings) : [];
  };
  
  const saveRecordingsToStorage = (recordings: Recording[]) => {
    if (typeof window === 'undefined') return; // Server-side check
    localStorage.setItem('recordings', JSON.stringify(recordings));
  };

  const saveRecording = (conversationId: string) => {
    try {
      console.log('Saving recording with ID:', conversationId);
      
      // Create a new recording object
      const newRecording: Recording = {
        id: crypto.randomUUID(), // Generate a random UUID
        title: `Conversation ${new Date().toLocaleString()}`,
        conversation_id: conversationId,
        duration: 0,
        created_at: new Date().toISOString()
      };
      
      // Get existing recordings and add the new one
      const recordings = getRecordingsFromStorage();
      recordings.push(newRecording);
      
      // Save back to localStorage
      saveRecordingsToStorage(recordings);
      
      console.log('Recording saved:', newRecording);
    } catch (error) {
      console.error('Error saving recording:', error);
    }
  };

  const updateRecordingDuration = () => {
    try {
      if (!conversationIdRef.current || !startTimeRef.current) return;

      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      
      // Get existing recordings
      const recordings = getRecordingsFromStorage();
      
      // Find and update the recording with matching conversation_id
      const updatedRecordings = recordings.map(recording => {
        if (recording.conversation_id === conversationIdRef.current) {
          return { ...recording, duration };
        }
        return recording;
      });
      
      // Save back to localStorage
      saveRecordingsToStorage(updatedRecordings);
      
      console.log('Updated duration for conversation:', conversationIdRef.current);
    } catch (error) {
      console.error('Error updating recording duration:', error);
    }
  };

  const handleStartRecording = async () => {
    try {
      if (!agentId) {
        alert('ElevenLabs Agent ID is not configured.');
        return;
      }
      
      // No sign-in check required
      
      // Credits check removed - no user-based credits

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone permission granted');
      
      startCredits();
      console.log('Credits tracking started');

      // Start the conversation with your agent
      console.log('Initializing session with agent...');
      const id = await conversation.startSession({
        agentId: agentId,
      });
      console.log('Session started successfully with ID:', id);
      
      conversationIdRef.current = id;
      await saveRecording(id);

    } catch (error) {
      console.error('Failed to start conversation:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
      }
      // Clean up if something goes wrong
      stopCredits();
    }
  };

  const handleStopRecording = async () => {
    try {
      await conversation.endSession();
      await stopCredits();
      console.log('Recording stopped');
    } catch (error) {
      console.error('Error stopping session:', error);
      alert('Failed to stop recording. Check console for details.');
    }
  };

  // Placeholder for buying minutes - implement actual logic if needed
  const handleBuyMinutes = () => {
    alert('This functionality is not yet implemented.');
  };



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
            disabled={conversation.status === 'connected'}
            className="px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 disabled:bg-gray-400 flex items-center space-x-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
            <span>Start Recording</span>
          </button>
          <button
            onClick={handleStopRecording}
            disabled={conversation.status !== 'connected'}
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
          <div className="flex items-center justify-center gap-2">
            <p className="text-gray-700">
              <span className={`inline-block w-3 h-3 rounded-full mr-2 ${conversation.status === 'connected' ? 'bg-green-500' : conversation.status === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
              Status: {conversation.status} {conversation.isSpeaking && "(Agent is speaking)"}
            </p>
          </div>
          {credits !== null && (
            <div className="text-sm mt-2">
              <p>Minutes remaining: <span className="font-medium">{(credits.availableMinutes - credits.totalMinutesUsed).toFixed(2)}</span></p>
            </div>
          )}
        </div>

        <RecordingsList />
      </div>

      <footer className="mt-12 text-center text-sm text-gray-500">
        <p>P.S - I don&apos;t have a credit card on Eleven Labs, so I don&apos;t know when it&apos;ll stop working</p>
      </footer>
    </div>
  );
}
