'use client';

import { useEffect, useState } from 'react';

interface Recording {
  id: string;
  title: string;
  duration: number;
  created_at: string;
  conversation_id: string;
}

export function RecordingsList() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [audioUrls, setAudioUrls] = useState<{ [key: string]: string }>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecordings();
  }, []);

  const fetchRecordings = () => {
    try {
      console.log('Fetching recordings from localStorage...');
      
      // Get recordings from localStorage
      const storedRecordings = localStorage.getItem('recordings');
      const parsedRecordings = storedRecordings ? JSON.parse(storedRecordings) : [];
      
      console.log('Loaded recordings:', parsedRecordings);
      
      // Sort by created_at in descending order
      const sortedRecordings = parsedRecordings.sort((a: Recording, b: Recording) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      setRecordings(sortedRecordings);
      setError(null);
    } catch (error) {
      console.error('Error fetching recordings:', error);
      // More detailed error message
      if (error instanceof Error) {
        setError(`Failed to load recordings: ${error.message}`);
      } else {
        setError(`Failed to load recordings: Unknown error`);
      }
    } finally {
      setLoading(false);
    }
  };

  const playAudio = async (recording: Recording) => {
    try {
      // Toggle play/pause if already playing this recording
      if (currentAudio && playingId === recording.id) {
        if (isPaused) {
          currentAudio.play();
          setIsPaused(false);
        } else {
          currentAudio.pause();
          setIsPaused(true);
        }
        return;
      }

      // Stop any currently playing audio
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        setCurrentAudio(null);
      }

      setPlayingId(recording.id);
      setIsPaused(false);
      setError(null);

      let audioUrl = audioUrls[recording.id];

      if (!audioUrl) {
        // Get audio data from ElevenLabs API
        console.log('Fetching audio for conversation:', recording.conversation_id);
        console.log('API Key available:', !!process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY);
        
        const response = await fetch(
          `https://api.elevenlabs.io/v1/convai/conversations/${recording.conversation_id}/audio`,
          {
            headers: {
              "xi-api-key": process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || '',
              "Content-Type": "application/json",
            },
          }
        );

        console.log('ElevenLabs API response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('ElevenLabs API error:', errorText);
          throw new Error(`Failed to fetch audio: ${response.status} ${errorText}`);
        }

        const audioBlob = await response.blob();
        audioUrl = URL.createObjectURL(audioBlob);
        setAudioUrls((prev) => {
          const newUrls = { ...prev, [recording.id]: audioUrl };
          // Cache to localStorage if possible
          try {
            localStorage.setItem('audioUrls', JSON.stringify(newUrls));
          } catch (e) {
            console.warn('Could not save audio URLs to localStorage', e);
          }
          return newUrls;
        });
      }

      const audio = new Audio(audioUrl);

      audio.onended = () => {
        setCurrentAudio(null);
        setPlayingId(null);
        setIsPaused(false);
      };

      audio.onerror = () => {
        setError("Failed to play audio");
        setPlayingId(null);
        setIsPaused(false);
        URL.revokeObjectURL(audioUrl);
      };

      setCurrentAudio(audio);
      await audio.play();
    } catch (error) {
      console.error("Error playing audio:", error);
      setError("Failed to play audio");
      setPlayingId(null);
      setIsPaused(false);
    }
  };

  const downloadAudio = async (recording: Recording) => {
    try {
      let audioUrl = audioUrls[recording.id];

      if (!audioUrl) {
        console.log('Fetching audio for download, conversation:', recording.conversation_id);
        console.log('API Key available:', !!process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY);
        
        const response = await fetch(
          `https://api.elevenlabs.io/v1/convai/conversations/${recording.conversation_id}/audio`,
          {
            headers: {
              "xi-api-key": process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || '',
              "Content-Type": "application/json",
            },
          }
        );

        console.log('ElevenLabs API response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('ElevenLabs API error:', errorText);
          throw new Error(`Failed to fetch audio: ${response.status} ${errorText}`);
        }

        const audioBlob = await response.blob();
        audioUrl = URL.createObjectURL(audioBlob);
        setAudioUrls((prev) => {
          const newUrls = { ...prev, [recording.id]: audioUrl };
          // Cache to localStorage if possible
          try {
            localStorage.setItem('audioUrls', JSON.stringify(newUrls));
          } catch (e) {
            console.warn('Could not save audio URLs to localStorage', e);
          }
          return newUrls;
        });
      }

      const a = document.createElement("a");
      a.href = audioUrl;
      a.download = `${recording.title}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading audio:", error);
      setError("Failed to download audio");
    }
  };

  // Helper function to save recordings to localStorage
  const saveRecordingsToStorage = (recordings: Recording[]) => {
    localStorage.setItem('recordings', JSON.stringify(recordings));
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-semibold mb-4">Your Recordings</h2>
      
      {loading ? (
        <div className="text-center text-gray-500">Loading...</div>
      ) : error ? (
        <div className="text-center text-red-500">{error}</div>
      ) : recordings.length === 0 ? (
        <div className="text-center text-gray-500">No recordings yet</div>
      ) : (
        <div className="space-y-4">
          {recordings.map((recording) => (
            <div
              key={recording.id}
              className="p-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{recording.title}</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(recording.created_at).toLocaleString()}
                    {recording.duration > 0 && ` • ${formatDuration(recording.duration)}`}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => playAudio(recording)}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 transition-colors"
                    disabled={loading}
                  >
                    {playingId === recording.id ? (
                      isPaused ? 'Resume' : 'Pause'
                    ) : (
                      'Play'
                    )}
                  </button>
                  
                  <button
                    onClick={() => downloadAudio(recording)}
                    className="text-gray-500 hover:text-black transition-colors"
                    disabled={loading}
                  >
                    Download
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
