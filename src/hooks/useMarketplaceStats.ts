import { useState, useEffect } from 'react';

export interface MarketplaceStats {
  totalPersonas: number;
  activeListings: number;
  activeTraders: number;
  volume24h: number;
  transactions24h: number;
  avgPrice: number;
  avgRentalPrice: number;
}

export function useMarketplaceStats() {
  const [stats, setStats] = useState<MarketplaceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/marketplace/stats');
      const result = await response.json();

      if (result.success) {
        setStats(result.stats);
      } else {
        setError(result.error || 'Failed to fetch stats');
        // 使用默认统计数据
        setStats({
          totalPersonas: 0,
          activeListings: 0,
          activeTraders: 0,
          volume24h: 0,
          transactions24h: 0,
          avgPrice: 0,
          avgRentalPrice: 0
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch stats');
      // 使用默认统计数据
      setStats({
        totalPersonas: 0,
        activeListings: 0,
        activeTraders: 0,
        volume24h: 0,
        transactions24h: 0,
        avgPrice: 0,
        avgRentalPrice: 0
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  };
}