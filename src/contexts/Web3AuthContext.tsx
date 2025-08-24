"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { IProvider } from '@web3auth/base';
import { web3auth, ADAPTER_EVENTS } from '@/lib/web3auth';

interface Web3AuthContextType {
  provider: IProvider | null;
  isLoading: boolean;
  isConnected: boolean;
  isInitialized: boolean;
  user: any;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getUserInfo: () => Promise<any>;
}

const Web3AuthContext = createContext<Web3AuthContextType | undefined>(undefined);

export const useWeb3Auth = () => {
  const context = useContext(Web3AuthContext);
  if (!context) {
    throw new Error('useWeb3Auth must be used within a Web3AuthProvider');
  }
  return context;
};

interface Web3AuthProviderProps {
  children: ReactNode;
}

export const Web3AuthProvider: React.FC<Web3AuthProviderProps> = ({ children }) => {
  const [provider, setProvider] = useState<IProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        console.log("Initializing Web3Auth...");

        // Subscribe to adapter events
        web3auth.on(ADAPTER_EVENTS.CONNECTED, (data: any) => {
          console.log("Connected to wallet", data);
          setProvider(web3auth.provider);
          setIsConnected(true);
        });

        web3auth.on(ADAPTER_EVENTS.CONNECTING, () => {
          console.log("Connecting to wallet");
        });

        web3auth.on(ADAPTER_EVENTS.DISCONNECTED, () => {
          console.log("Disconnected from wallet");
          setProvider(null);
          setIsConnected(false);
          setUser(null);
        });

        web3auth.on(ADAPTER_EVENTS.ERRORED, (error: any) => {
          console.error("Web3Auth error", error);
        });

        // 尝试初始化 Web3Auth
        await web3auth.initModal();
        console.log("Web3Auth initialized successfully");
        setIsInitialized(true);

        // 检查是否已经连接
        if (web3auth.connected) {
          console.log("Already connected, getting user info...");
          setProvider(web3auth.provider);
          setIsConnected(true);
          const userInfo = await web3auth.getUserInfo();
          setUser(userInfo);
        }
      } catch (error) {
        console.error("Error initializing Web3Auth:", error);
        // 即使初始化失败，也设置为已初始化，避免无限等待
        setIsInitialized(true);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  const login = async () => {
    try {
      setIsLoading(true);
      console.log("Starting login process...");

      // 检查是否已初始化
      if (!isInitialized) {
        console.error("Web3Auth is not initialized yet");
        throw new Error("Web3Auth is not initialized yet");
      }

      console.log("Connecting to Web3Auth...");
      const web3authProvider = await web3auth.connect();
      console.log("Connected successfully, getting user info...");

      setProvider(web3authProvider);
      setIsConnected(true);

      const userInfo = await web3auth.getUserInfo();
      setUser(userInfo);
      console.log("Login completed successfully");
    } catch (error) {
      console.error("Error during login:", error);
      alert(`Login failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await web3auth.logout();
      setProvider(null);
      setIsConnected(false);
      setUser(null);
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getUserInfo = async () => {
    try {
      const userInfo = await web3auth.getUserInfo();
      setUser(userInfo);
      return userInfo;
    } catch (error) {
      console.error("Error getting user info:", error);
      return null;
    }
  };

  const contextValue: Web3AuthContextType = {
    provider,
    isLoading,
    isConnected,
    isInitialized,
    user,
    login,
    logout,
    getUserInfo,
  };

  return (
    <Web3AuthContext.Provider value={contextValue}>
      {children}
    </Web3AuthContext.Provider>
  );
};
