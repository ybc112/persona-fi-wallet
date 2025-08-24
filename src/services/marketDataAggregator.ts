import { JupiterAPI } from './jupiterAPI';

// 市场数据聚合服务
export class MarketDataAggregator {
  // 获取综合市场数据
  static async getComprehensiveMarketData() {
    try {
      console.log('开始获取综合市场数据...');

      const [
        jupiterPrices,
        verifiedTokens,
        topTradedTokens,
        recentTokens
      ] = await Promise.all([
        // 获取主要代币价格
        JupiterAPI.getTokenPrices([
          JupiterAPI.TOKENS.SOL,
          JupiterAPI.TOKENS.USDC,
          JupiterAPI.TOKENS.RAY,
          JupiterAPI.TOKENS.ORCA,
          JupiterAPI.TOKENS.JUP
        ]),
        JupiterAPI.getTrendingTokens('verified'),
        JupiterAPI.getTopTradedTokens('24h', 20),
        JupiterAPI.getRecentTokens(10)
      ]);

      const formattedPrices = JupiterAPI.formatPriceData(jupiterPrices);

      console.log('格式化后的价格数据:', formattedPrices);
      console.log('验证代币数量:', verifiedTokens?.length);
      console.log('热门交易代币数量:', topTradedTokens?.length);

      // 为热门交易代币标准化价格字段
      let enrichedTopTraded = topTradedTokens || [];
      if (topTradedTokens && topTradedTokens.length > 0) {
        // 直接使用现有的 usdPrice 字段，并标准化为 price 字段
        enrichedTopTraded = topTradedTokens.map((token: any) => ({
          ...token,
          price: token.usdPrice || 0,
          change24h: token.stats24h?.priceChange || 0,
          volume24h: token.stats24h?.volume || 0
        }));

        console.log('热门交易代币价格标准化完成，样本:', enrichedTopTraded.slice(0, 3));
      }

      const marketData = {
        prices: formattedPrices,
        verified: verifiedTokens?.slice(0, 20) || [],
        topTraded: enrichedTopTraded,
        recent: recentTokens || [],
        timestamp: Date.now(),
        marketSentiment: this.calculateMarketSentiment(formattedPrices),
        summary: this.generateMarketSummary(formattedPrices, enrichedTopTraded)
      };

      console.log('市场数据获取完成:', marketData);
      return marketData;
    } catch (error) {
      console.error('获取综合市场数据失败:', error);
      return null;
    }
  }

  // 计算市场情绪
  static calculateMarketSentiment(priceData: any) {
    const tokens = Object.values(priceData);
    if (tokens.length === 0) return 'neutral';
    
    const positiveCount = tokens.filter((token: any) => 
      token.change24h > 0
    ).length;
    
    const ratio = positiveCount / tokens.length;
    
    if (ratio > 0.6) return 'bullish';
    if (ratio < 0.4) return 'bearish';
    return 'neutral';
  }

  // 生成市场摘要
  static generateMarketSummary(priceData: any, topTradedTokens: any[]) {
    const solData = priceData[JupiterAPI.TOKENS.SOL] || {};
    const usdcData = priceData[JupiterAPI.TOKENS.USDC] || {};
    const rayData = priceData[JupiterAPI.TOKENS.RAY] || {};

    return {
      mainTokens: {
        SOL: {
          price: solData.price || 0,
          change24h: solData.change24h || 0,
          symbol: 'SOL'
        },
        USDC: {
          price: usdcData.price || 0,
          change24h: usdcData.change24h || 0,
          symbol: 'USDC'
        },
        RAY: {
          price: rayData.price || 0,
          change24h: rayData.change24h || 0,
          symbol: 'RAY'
        }
      },
      topTradedCount: topTradedTokens.length,
      lastUpdate: new Date().toISOString()
    };
  }

  // 生成AI分析提示词
  static generateAnalysisPrompt(marketData: any, userQuery: string, persona: any) {
    console.log('生成AI提示词 - 输入数据:', {
      hasMarketData: !!marketData,
      hasPrices: !!marketData?.prices,
      pricesKeys: marketData?.prices ? Object.keys(marketData.prices) : [],
      topTradedCount: marketData?.topTraded?.length || 0,
      marketSentiment: marketData?.marketSentiment
    });

    // 安全地获取价格数据
    const solPrice = marketData?.prices?.[JupiterAPI.TOKENS.SOL]?.price;
    const usdcPrice = marketData?.prices?.[JupiterAPI.TOKENS.USDC]?.price;
    const rayPrice = marketData?.prices?.[JupiterAPI.TOKENS.RAY]?.price;
    const marketSentiment = marketData?.marketSentiment || 'neutral';

    // 获取热门代币符号，限制数量避免提示词过长
    let trendingSymbols = 'N/A';
    if (marketData?.topTraded && Array.isArray(marketData.topTraded) && marketData.topTraded.length > 0) {
      trendingSymbols = marketData.topTraded
        .slice(0, 3)
        .map((t: any) => t.symbol || t.name || 'Unknown')
        .filter(Boolean)
        .join(', ') || 'N/A';
    }

    // 获取验证代币数量
    const verifiedCount = marketData?.verified?.length || 0;
    const recentCount = marketData?.recent?.length || 0;

    console.log('提示词数据提取结果:', {
      solPrice, usdcPrice, rayPrice, marketSentiment,
      trendingSymbols, verifiedCount, recentCount
    });

    return `作为${persona.name || 'Jupiter AI'}，一个${persona.personalityType || '专业型'}的Solana生态投资顾问：

📊 当前Jupiter聚合器实时数据：
- SOL价格: $${solPrice || 'N/A'}
- USDC价格: $${usdcPrice || 'N/A'}
- RAY价格: $${rayPrice || 'N/A'}
- 市场情绪: ${marketSentiment}
- 验证代币: ${verifiedCount}个
- 热门交易代币: ${trendingSymbols}
- 最新代币: ${recentCount}个
- 数据时间: ${new Date().toLocaleString()}

❓ 用户问题: ${userQuery}

请基于你的${persona.riskLevel || '中等风险'}风险偏好和${persona.specialization || 'DeFi'}专业领域，结合以上实时数据给出专业建议。

**重要格式要求**：
- 请直接以纯文本形式回复，不要使用代码块、Mermaid图表或任何markdown格式
- 使用emoji和简洁的段落结构
- 直接给出分析和建议，无需特殊格式

请包含以下内容：
🔍 **市场分析**：
💡 **投资建议**：
⚠️ **风险提示**：
📈 **具体操作**：
🔄 **Jupiter交换建议**：`;
  }

  // 获取代币详细信息
  static async getTokenDetails(tokenMint: string) {
    try {
      const [tokenInfo, priceData] = await Promise.all([
        JupiterAPI.getTokenInfo(tokenMint),
        JupiterAPI.getTokenPrices([tokenMint])
      ]);

      return {
        info: tokenInfo,
        price: priceData?.[tokenMint] || null,
        symbol: JupiterAPI.getTokenSymbol(tokenMint)
      };
    } catch (error) {
      console.error('获取代币详细信息失败:', error);
      return null;
    }
  }

  // 获取交换建议
  static async getSwapSuggestion(inputMint: string, outputMint: string, amount: number) {
    try {
      const quote = await JupiterAPI.getQuote({
        inputMint,
        outputMint,
        amount,
        slippageBps: 50
      });

      if (!quote) return null;

      const inputSymbol = JupiterAPI.getTokenSymbol(inputMint);
      const outputSymbol = JupiterAPI.getTokenSymbol(outputMint);
      
      return {
        inputAmount: quote.inAmount,
        outputAmount: quote.outAmount,
        inputSymbol,
        outputSymbol,
        priceImpact: quote.priceImpactPct,
        route: quote.routePlan,
        suggestion: `建议将 ${quote.inAmount / 1e9} ${inputSymbol} 交换为约 ${quote.outAmount / 1e6} ${outputSymbol}，价格影响约 ${quote.priceImpactPct}%`
      };
    } catch (error) {
      console.error('获取交换建议失败:', error);
      return null;
    }
  }

  // 格式化数字显示
  static formatNumber(num: number, decimals = 2): string {
    if (num === 0) return '0';
    if (num < 0.01) return num.toExponential(2);
    if (num < 1) return num.toFixed(4);
    if (num < 1000) return num.toFixed(decimals);
    if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
    if (num < 1000000000) return (num / 1000000).toFixed(1) + 'M';
    return (num / 1000000000).toFixed(1) + 'B';
  }

  // 格式化价格变化
  static formatPriceChange(change: number): string {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  }

  // 获取市场状态颜色
  static getMarketColor(sentiment: string): string {
    switch (sentiment) {
      case 'bullish': return '#10B981'; // green
      case 'bearish': return '#EF4444'; // red
      default: return '#6B7280'; // gray
    }
  }
}
