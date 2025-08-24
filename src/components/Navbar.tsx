"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useWeb3Auth } from '@/contexts/Web3AuthContext';
import { useSolanaWallet } from '@/hooks/useSolanaWallet';

export const Navbar: React.FC = () => {
  const { isConnected, login, logout, user } = useWeb3Auth();
  const { publicKey, balance, copyAddress } = useSolanaWallet();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const handleCopyAddress = async () => {
    const success = await copyAddress();
    if (success) {
      // 可以添加一个toast通知
      console.log('Address copied!');
    }
  };

  return (
    <nav className="bg-gradient-to-r from-purple-900 via-blue-900 to-indigo-900 shadow-xl border-b border-purple-500/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                PersonaFi
              </h1>
              <p className="text-xs text-purple-300">AI Personality Trading</p>
            </div>
          </div>
          
          {/* 导航菜单 */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="/marketplace" className="text-purple-200 hover:text-white transition-colors">Marketplace</a>
            <a href="/create" className="text-purple-200 hover:text-white transition-colors">Create AI</a>
            <a href="/my-nfts" className="text-purple-200 hover:text-white transition-colors">My NFTs</a>
            <a href="/leaderboard" className="text-purple-200 hover:text-white transition-colors">Leaderboard</a>
          </div>
          
          {/* 右侧用户区域 */}
          <div className="flex items-center space-x-4">
            {isConnected ? (
              <div className="flex items-center space-x-4">
                {/* 钱包余额显示 */}
                <div className="bg-black/20 backdrop-blur-sm rounded-lg px-3 py-2 border border-purple-500/30">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-purple-200 text-sm font-medium">
                      {balance.toFixed(4)} SOL
                    </span>
                  </div>
                </div>
                
                {/* 用户头像和下拉菜单 */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center space-x-2 bg-black/20 backdrop-blur-sm rounded-lg px-3 py-2 border border-purple-500/30 hover:border-purple-400/50 transition-all"
                  >
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {user?.name ? user.name[0].toUpperCase() : publicKey ? publicKey[0].toUpperCase() : '?'}
                      </span>
                    </div>
                    <span className="text-purple-200 text-sm hidden sm:block">
                      {user?.name || formatAddress(publicKey)}
                    </span>
                    <svg 
                      className={`w-4 h-4 text-purple-300 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* 下拉菜单 */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-2xl border border-purple-500/30 z-50">
                      <div className="p-4">
                        {/* 用户信息 */}
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-lg font-medium">
                              {user?.name ? user.name[0].toUpperCase() : publicKey ? publicKey[0].toUpperCase() : '?'}
                            </span>
                          </div>
                          <div>
                            <p className="text-white font-medium">{user?.name || 'Anonymous'}</p>
                            <p className="text-purple-300 text-sm">{user?.email || 'Web3 User'}</p>
                          </div>
                        </div>

                        {/* 钱包信息 */}
                        <div className="bg-black/30 rounded-lg p-3 mb-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-purple-300 text-sm">Wallet Address</span>
                            <button
                              onClick={handleCopyAddress}
                              className="text-purple-400 hover:text-purple-300 text-xs"
                            >
                              Copy
                            </button>
                          </div>
                          <p className="text-white font-mono text-sm break-all">{publicKey}</p>
                          
                          <div className="flex justify-between items-center mt-3">
                            <span className="text-purple-300 text-sm">SOL Balance</span>
                            <span className="text-white font-semibold">{balance.toFixed(4)} SOL</span>
                          </div>
                        </div>

                        {/* 菜单项 */}
                        <div className="space-y-1">
                          <a
                            href="/my-nfts"
                            className="block w-full text-left px-3 py-2 text-purple-200 hover:text-white hover:bg-purple-500/20 rounded-lg transition-colors"
                            onClick={() => setIsDropdownOpen(false)}
                          >
                            🎭 My NFTs
                          </a>
                          <button className="w-full text-left px-3 py-2 text-purple-200 hover:text-white hover:bg-purple-500/20 rounded-lg transition-colors">
                            📊 Portfolio
                          </button>
                          <button className="w-full text-left px-3 py-2 text-purple-200 hover:text-white hover:bg-purple-500/20 rounded-lg transition-colors">
                            ⚙️ Settings
                          </button>
                          <hr className="border-purple-500/30 my-2" />
                          <button
                            onClick={() => {
                              logout();
                              setIsDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
                          >
                            🚪 Logout
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <button
                onClick={login}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-2 rounded-lg font-medium transition-all transform hover:scale-105 shadow-lg"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
