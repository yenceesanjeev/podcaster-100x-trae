'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useConversation } from '@elevenlabs/react';
import { RecordingsList } from './components/RecordingsList';
import { LinkedInProfileInput } from './components/LinkedInProfileInput';
import { PodcastBrief } from './components/PodcastBrief';
import { fetchLinkedInProfile, generatePodcastBrief } from './services/linkedinService';

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
  guest_name?: string;
  guest_profile_url?: string;
}

interface PodcastGuest {
  guestName: string;
  guestTitle: string;
  guestProfileUrl: string;
  guestProfilePicture: string;
  introduction: string;
  questions: string[];
}

export default function Page() {
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [isLoadingCredits, setIsLoadingCredits] = useState(true);
  const [isProcessingProfile, setIsProcessingProfile] = useState(false);
  const [currentStep, setCurrentStep] = useState<'input' | 'brief' | 'recording'>('input');
  const [podcastGuest, setPodcastGuest] = useState<PodcastGuest | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
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
      
      // Create a new recording object with guest info if available
      const newRecording: Recording = {
        id: crypto.randomUUID(), // Generate a random UUID
        title: podcastGuest ? `Podcast with ${podcastGuest.guestName}` : `Conversation ${new Date().toLocaleString()}`,
        conversation_id: conversationId,
        duration: 0,
        created_at: new Date().toISOString(),
        guest_name: podcastGuest?.guestName,
        guest_profile_url: podcastGuest?.guestProfileUrl
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

  const handleProfileSubmit = async (profileUrl: string) => {
    try {
      setIsProcessingProfile(true);
      setProfileError(null);
      
      // Fetch LinkedIn profile data
      console.log('Fetching LinkedIn profile:', profileUrl);
      const profileData = await fetchLinkedInProfile(profileUrl);
      console.log('LinkedIn profile data:', profileData);
      
      // Generate podcast brief using OpenAI
      console.log('Generating podcast brief...');
      const brief = await generatePodcastBrief(profileData, profileUrl);
      console.log('Generated podcast brief:', brief);
      
      // Set podcast guest data
      setPodcastGuest(brief);
      
      // Move to brief display step (user must click Start Podcast to proceed)
      setCurrentStep('brief');
    } catch (error) {
      console.error('Error processing LinkedIn profile:', error);
      setProfileError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsProcessingProfile(false);
    }
  };

  const handleStartRecording = async () => {
    console.log('handleStartRecording called');
    console.log('Agent ID:', agentId);
    console.log('API Key (last 4):', apiKey ? apiKey.slice(-4) : 'none');
    try {
      if (!agentId) {
        alert('ElevenLabs Agent ID is not configured.');
        return;
      }
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone permission granted');
      
      startCredits();
      console.log('Credits tracking started');

      // Prepare dynamic variables for the AI host
      if (!podcastGuest?.introduction) {
        throw new Error('Guest introduction is required');
      }

      const dynamicVariables: Record<string, string | number | boolean> = {
        guest_intro: podcastGuest.introduction,
        guest_profile_url: podcastGuest.guestProfileUrl || '',
        guest_profile_picture: podcastGuest.guestProfilePicture || '',
        podcast_questions: podcastGuest.questions?.map((q: string, idx: number) => `${idx + 1}. ${q}`).join('\n') || ''
      };

      // Debug: log the variables being sent to ElevenLabs
      console.log('Dynamic variables being sent to ElevenLabs:', dynamicVariables);

      // Debug: log the variables being sent to ElevenLabs
      console.log('Dynamic variables being sent to ElevenLabs:', dynamicVariables);

      // Start the conversation with your agent
      console.log('Initializing session with agent...');
      const id = await conversation.startSession({
        agentId: agentId,
        dynamicVariables: dynamicVariables
      });
      console.log('Session started successfully with ID:', id);
      
      conversationIdRef.current = id;
      await saveRecording(id);
      
      // Move to recording step
      setCurrentStep('recording');

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
      // Reset to input step
      setCurrentStep('input');
      setPodcastGuest(null);
    } catch (error) {
      console.error('Error stopping session:', error);
      alert('Failed to stop recording. Check console for details.');
    }
  };

  // Placeholder for buying minutes - implement actual logic if needed
  const handleBuyMinutes = () => {
    alert('This functionality is not yet implemented.');
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'input':
        return (
          <LinkedInProfileInput 
            onProfileSubmit={handleProfileSubmit} 
            isLoading={isProcessingProfile} 
          />
        );
      case 'brief':
        return podcastGuest ? (
          <PodcastBrief 
            {...podcastGuest}
            onStartRecording={handleStartRecording}
            isLoading={false}
          />
        ) : null;
      case 'recording':
        return (
          <div className="text-center">
            <p className="mb-4 text-lg">Recording in progress with {podcastGuest?.guestName || 'Guest'}...</p>
            <button
              onClick={handleStopRecording}
              className="bg-red-600 text-white py-3 px-6 rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Stop Recording
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 text-black">
      <header className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-2">Record a podcast with an AI Host</h1>
        <p className="text-xl text-gray-600">
          {currentStep === 'input' ? 
            'Enter a LinkedIn profile to create a personalized podcast experience' : 
            podcastGuest ? `Podcast with ${podcastGuest.guestName}` : 'AI-Powered Podcast'}
        </p>
      </header>

      {profileError && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md max-w-md mx-auto">
          <p><strong>Error:</strong> {profileError}</p>
        </div>
      )}

      <main className="w-full max-w-4xl mx-auto mb-12">
        {renderCurrentStep()}
      </main>

      {/* Credits display */}
      {credits && (
        <div className="mb-8 text-center">
          <p className="text-gray-600">
            {credits.availableMinutes} minutes available
          </p>
          {credits.availableMinutes < 5 && (
            <button
              onClick={handleBuyMinutes}
              className="mt-2 text-blue-600 hover:underline"
            >
              Buy more minutes
            </button>
          )}
        </div>
      )}

      {/* Recordings list */}
      <div className="w-full max-w-4xl mx-auto">
        <RecordingsList />
      </div>
    </div>
  );
}
