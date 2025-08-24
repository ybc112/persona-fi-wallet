"use client";

import React, { useState } from 'react';
import { useWeb3Auth } from '@/contexts/Web3AuthContext';
import { useSolanaWallet } from '@/hooks/useSolanaWallet';

export const WalletInfo: React.FC = () => {
  const { isConnected } = useWeb3Auth();
  const { 
    publicKey, 
    balance, 
    tokenAccounts, 
    recentTransactions, 
    isLoading,
    copyAddress,
    shareAddress,
    refreshWalletData 
  } = useSolanaWallet();
  
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopyAddress = async () => {
    const success = await copyAddress();
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleShareAddress = async () => {
    await shareAddress();
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: number) => {
    return balance.toFixed(4);
  };

  if (!isConnected) {
    return (
      <div className="bg-gray-100 rounded-lg p-6 text-center">
        <p className="text-gray-600">Please connect your wallet to view wallet information</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Wallet Info</h2>
        <button
          onClick={refreshWalletData}
          disabled={isLoading}
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Wallet Address */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Wallet Address</h3>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-1">Solana Devnet</p>
            <p className="font-mono text-sm break-all">{publicKey}</p>
            <p className="text-xs text-gray-500 mt-1">
              Short: {formatAddress(publicKey)}
            </p>
          </div>
          <div className="flex gap-2 ml-4">
            <button
              onClick={handleCopyAddress}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded text-sm transition-colors"
            >
              {copySuccess ? '✓ Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleShareAddress}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm transition-colors"
            >
              Share
            </button>
          </div>
        </div>
      </div>

      {/* SOL Balance */}
      <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg p-4 text-white">
        <h3 className="text-lg font-semibold mb-2">SOL Balance</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold">{formatBalance(balance)} SOL</p>
            <p className="text-sm opacity-80">Solana Devnet</p>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-80">≈ ${(balance * 20).toFixed(2)} USD</p>
            <p className="text-xs opacity-60">(Demo price)</p>
          </div>
        </div>
      </div>

      {/* SPL Tokens */}
      {tokenAccounts.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">SPL Tokens</h3>
          <div className="space-y-2">
            {tokenAccounts.map((token, index) => (
              <div key={index} className="flex justify-between items-center bg-white p-3 rounded">
                <div>
                  <p className="font-mono text-sm text-gray-600">
                    {formatAddress(token.mint)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{token.uiAmount}</p>
                  <p className="text-xs text-gray-500">{token.decimals} decimals</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      {recentTransactions.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Recent Transactions</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {recentTransactions.map((tx, index) => (
              <div key={index} className="flex justify-between items-center bg-white p-3 rounded">
                <div>
                  <p className="font-mono text-sm text-gray-600">
                    {formatAddress(tx.signature)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Slot: {tx.slot}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${tx.err ? 'text-red-500' : 'text-green-500'}`}>
                    {tx.err ? 'Failed' : 'Success'}
                  </p>
                  {tx.blockTime && (
                    <p className="text-xs text-gray-500">
                      {new Date(tx.blockTime * 1000).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Explorer Link */}
      {publicKey && (
        <div className="text-center">
          <a
            href={`https://explorer.solana.com/address/${publicKey}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600 text-sm underline"
          >
            View on Solana Explorer ↗
          </a>
        </div>
      )}
    </div>
  );
};
