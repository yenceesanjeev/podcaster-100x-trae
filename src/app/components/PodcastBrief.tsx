'use client';

import { useState } from 'react';
import Image from 'next/image';

interface PodcastBriefProps {
  guestName: string;
  guestProfileUrl: string;
  introduction: string;
  onStartRecording: () => void;
  isLoading: boolean;
}

export function PodcastBrief({
  guestName,
  guestProfileUrl,
  introduction,
  onStartRecording,
  isLoading
}: PodcastBriefProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="w-full max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
      <div className="mb-4">
        <h2 className="text-2xl font-bold">{guestName}</h2>
        <a 
          href={guestProfileUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline text-sm"
        >
          View LinkedIn Profile
        </a>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Guest Introduction</h3>
        <div className={`text-gray-700 ${isExpanded ? '' : 'line-clamp-3'}`}>
          {introduction}
        </div>
        {introduction.length > 150 && (
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-blue-600 hover:underline mt-2 text-sm"
          >
            {isExpanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>

      <button
        onClick={onStartRecording}
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Starting...' : 'Start Podcast Recording'}
      </button>
    </div>
  );
}
