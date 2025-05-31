'use client';

import { useState } from 'react';
import Image from 'next/image';

interface PodcastBriefProps {
  onStartRecording: () => void;
  isLoading: boolean;
}

export function PodcastBrief({
  onStartRecording,
  isLoading
}: PodcastBriefProps) {
  return (
    <div className="w-full max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md text-center">
      <h2 className="text-2xl font-bold mb-4">We're ready for you now</h2>
      <p className="text-gray-700 mb-6">Click below to start the conversation</p>

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
