"use client";

import React from 'react';
import { useWeb3Auth } from '@/contexts/Web3AuthContext';

export const LoginButton: React.FC = () => {
  const { login, logout, isLoading, isConnected, isInitialized, user } = useWeb3Auth();

  if (isLoading || !isInitialized) {
    return (
      <button
        disabled
        className="bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold cursor-not-allowed"
      >
        {!isInitialized ? 'Initializing Web3Auth...' : 'Loading...'}
      </button>
    );
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-2">
            {user.profileImage && (
              <img 
                src={user.profileImage} 
                alt="Profile" 
                className="w-8 h-8 rounded-full"
              />
            )}
            <span className="text-sm text-gray-600">
              {user.name || user.email}
            </span>
          </div>
        )}
        <button
          onClick={logout}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={login}
      className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-lg hover:shadow-xl"
    >
      Connect Wallet
    </button>
  );
};
