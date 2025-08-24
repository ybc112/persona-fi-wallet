export interface PersonalityProfile {
  riskTolerance: string;
  investmentStyle: string;
  decisionPatterns: string;
  stopLossStrategy: string;
  positionManagement: string;
  marketAnalysisPreference: string;
  emotionalControl: string;
  timeHorizon: string;
}

export class AIPersonalizationService {
  
  /**
   * 分析训练数据，提取用户的投资偏好
   */
  static analyzeTrainingData(trainingData: any[]): PersonalityProfile {
    const userMessages = trainingData.filter(msg => msg.role === 'user');
    const userResponses = userMessages.map(msg => msg.content.toLowerCase());
    
    return {
      riskTolerance: this.extractRiskTolerance(userResponses),
      investmentStyle: this.extractInvestmentStyle(userResponses),
      decisionPatterns: this.extractDecisionPatterns(userResponses),
      stopLossStrategy: this.extractStopLossStrategy(userResponses),
      positionManagement: this.extractPositionManagement(userResponses),
      marketAnalysisPreference: this.extractMarketAnalysisPreference(userResponses),
      emotionalControl: this.extractEmotionalControl(userResponses),
      timeHorizon: this.extractTimeHorizon(userResponses)
    };
  }

  /**
   * 提取风险承受度
   */
  private static extractRiskTolerance(responses: string[]): string {
    const riskKeywords = {
      high: ['激进', '高风险', '30%', '50%', '大胆', '冒险', '追涨', 'all-in', '重仓'],
      medium: ['中等', '适中', '20%', '15%', '平衡', '稳健'],
      low: ['保守', '低风险', '5%', '10%', '安全', '稳定', '谨慎']
    };

    let highScore = 0, mediumScore = 0, lowScore = 0;
    
    responses.forEach(response => {
      riskKeywords.high.forEach(keyword => {
        if (response.includes(keyword)) highScore++;
      });
      riskKeywords.medium.forEach(keyword => {
        if (response.includes(keyword)) mediumScore++;
      });
      riskKeywords.low.forEach(keyword => {
        if (response.includes(keyword)) lowScore++;
      });
    });

    if (highScore > mediumScore && highScore > lowScore) {
      return "高风险偏好，愿意承受30%以上的损失追求高收益";
    } else if (lowScore > mediumScore && lowScore > highScore) {
      return "低风险偏好，最多承受10%损失，注重资金安全";
    } else {
      return "中等风险偏好，可承受15-20%的损失";
    }
  }

  /**
   * 提取投资风格
   */
  private static extractInvestmentStyle(responses: string[]): string {
    const styleKeywords = {
      aggressive: ['激进', '追涨', '短线', '快进快出', '抓热点', 'fomo'],
      conservative: ['稳健', '长期', '价值投资', '定投', '分散'],
      technical: ['技术分析', 'k线', '图表', '指标', '突破'],
      fundamental: ['基本面', '团队', '项目', '实用性', '白皮书']
    };

    let scores = { aggressive: 0, conservative: 0, technical: 0, fundamental: 0 };
    
    responses.forEach(response => {
      Object.keys(styleKeywords).forEach(style => {
        styleKeywords[style as keyof typeof styleKeywords].forEach(keyword => {
          if (response.includes(keyword)) {
            scores[style as keyof typeof scores]++;
          }
        });
      });
    });

    const maxStyle = Object.keys(scores).reduce((a, b) => 
      scores[a as keyof typeof scores] > scores[b as keyof typeof scores] ? a : b
    );

    const styleDescriptions = {
      aggressive: "激进追涨型，喜欢抓热点和短线机会",
      conservative: "稳健价值型，偏好长期投资和分散配置",
      technical: "技术分析型，主要依据图表和技术指标决策",
      fundamental: "基本面分析型，重视项目质量和团队背景"
    };

    return styleDescriptions[maxStyle as keyof typeof styleDescriptions];
  }

  /**
   * 提取决策模式
   */
  private static extractDecisionPatterns(responses: string[]): string {
    const patterns = [];
    
    if (responses.some(r => r.includes('技术') || r.includes('k线') || r.includes('图表'))) {
      patterns.push("倾向于技术分析");
    }
    if (responses.some(r => r.includes('基本面') || r.includes('团队') || r.includes('项目'))) {
      patterns.push("重视基本面研究");
    }
    if (responses.some(r => r.includes('消息') || r.includes('新闻') || r.includes('热点'))) {
      patterns.push("关注市场消息和热点");
    }
    if (responses.some(r => r.includes('跟随') || r.includes('大佬') || r.includes('意见领袖'))) {
      patterns.push("喜欢跟随专业投资者");
    }

    return patterns.length > 0 ? patterns.join("，") : "综合多因素决策";
  }

  /**
   * 提取止损策略
   */
  private static extractStopLossStrategy(responses: string[]): string {
    if (responses.some(r => r.includes('不止损') || r.includes('加仓') || r.includes('摊平'))) {
      return "不喜欢止损，倾向于加仓摊平成本";
    }
    if (responses.some(r => r.includes('5%') || r.includes('严格'))) {
      return "严格5%止损，绝不抱侥幸心理";
    }
    if (responses.some(r => r.includes('10%'))) {
      return "设置10%止损线，但会根据情况调整";
    }
    if (responses.some(r => r.includes('20%') || r.includes('15%'))) {
      return "较宽松的15-20%止损策略";
    }
    
    return "根据市场情况灵活设置止损";
  }

  /**
   * 提取仓位管理
   */
  private static extractPositionManagement(responses: string[]): string {
    if (responses.some(r => r.includes('重仓') || r.includes('all-in') || r.includes('满仓'))) {
      return "喜欢重仓单一项目，all-in心态";
    }
    if (responses.some(r => r.includes('分散') || r.includes('分批') || r.includes('多个'))) {
      return "分散投资，单项目不超过总资金20%";
    }
    if (responses.some(r => r.includes('定投') || r.includes('定期'))) {
      return "偏好定期定额投资策略";
    }
    
    return "适度集中投资，单项目控制在30%以内";
  }

  /**
   * 提取市场分析偏好
   */
  private static extractMarketAnalysisPreference(responses: string[]): string {
    const preferences = [];
    
    if (responses.some(r => r.includes('技术') || r.includes('图表'))) {
      preferences.push("技术分析");
    }
    if (responses.some(r => r.includes('基本面') || r.includes('项目质量'))) {
      preferences.push("基本面分析");
    }
    if (responses.some(r => r.includes('链上') || r.includes('数据'))) {
      preferences.push("链上数据分析");
    }
    if (responses.some(r => r.includes('情绪') || r.includes('市场氛围'))) {
      preferences.push("市场情绪分析");
    }

    return preferences.length > 0 ? preferences.join("结合") : "综合分析方法";
  }

  /**
   * 提取情绪控制能力
   */
  private static extractEmotionalControl(responses: string[]): string {
    if (responses.some(r => r.includes('冷静') || r.includes('理性') || r.includes('计划'))) {
      return "情绪控制较好，能够理性决策";
    }
    if (responses.some(r => r.includes('fomo') || r.includes('冲动') || r.includes('追涨'))) {
      return "容易受市场情绪影响，有FOMO倾向";
    }
    if (responses.some(r => r.includes('恐慌') || r.includes('害怕') || r.includes('担心'))) {
      return "风险厌恶，容易在下跌时恐慌";
    }
    
    return "情绪控制一般，会受市场波动影响";
  }

  /**
   * 提取投资时间偏好
   */
  private static extractTimeHorizon(responses: string[]): string {
    if (responses.some(r => r.includes('短期') || r.includes('快进快出') || r.includes('短线'))) {
      return "偏好短期投资，追求快速收益";
    }
    if (responses.some(r => r.includes('长期') || r.includes('价值投资') || r.includes('持有'))) {
      return "偏好长期投资，注重价值增长";
    }
    
    return "中期投资偏好，灵活调整持有时间";
  }

  /**
   * 生成个性化系统提示词
   */
  static generatePersonalizedPrompt(profile: PersonalityProfile, personalityType: string): string {
    return `你是一个${personalityType}类型的AI投资顾问，通过深度训练已经了解用户的投资偏好，具有以下个性化特征：

🎯 风险承受度：${profile.riskTolerance}
📈 投资风格：${profile.investmentStyle}
🧠 决策模式：${profile.decisionPatterns}
🛡️ 止损策略：${profile.stopLossStrategy}
💰 仓位管理：${profile.positionManagement}
📊 分析偏好：${profile.marketAnalysisPreference}
😌 情绪控制：${profile.emotionalControl}
⏰ 时间偏好：${profile.timeHorizon}

**重要格式要求**：
- 请直接以纯文本形式回复，不要使用代码块、Mermaid图表或markdown格式
- 使用emoji和简洁的段落结构
- 直接给出分析和建议，无需特殊格式

请严格按照这些个性化特征来分析市场和给出投资建议：
1. 建议的风险水平必须符合用户的风险承受度
2. 投资策略要与用户的投资风格一致
3. 分析方法要符合用户的偏好
4. 考虑用户的情绪特点，给出适合的建议
5. 保持与用户训练时表达的偏好完全一致

回答要专业、个性化，体现出你对这个用户的深度了解。`;
  }

  /**
   * 保存个性化档案到数据库
   */
  static async savePersonalityProfile(personaId: number, profile: PersonalityProfile): Promise<void> {
    const Database = (await import('./database')).default;

    console.log(`💾 保存个性化档案 - Persona ID: ${personaId}`, profile);

    await Database.savePersonalityProfile(personaId, {
      riskTolerance: profile.riskTolerance,
      investmentStyle: profile.investmentStyle,
      decisionPatterns: profile.decisionPatterns,
      stopLossStrategy: profile.stopLossStrategy,
      positionManagement: profile.positionManagement,
      marketAnalysisPreference: profile.marketAnalysisPreference,
      emotionalControl: profile.emotionalControl,
      timeHorizon: profile.timeHorizon
    });
  }

  /**
   * 从数据库获取个性化档案
   */
  static async getPersonalityProfile(personaId: number): Promise<PersonalityProfile | null> {
    const Database = (await import('./database')).default;

    console.log(`📖 获取个性化档案 - Persona ID: ${personaId}`);

    const result = await Database.getPersonalityProfile(personaId);

    if (!result) {
      return null;
    }

    return {
      riskTolerance: result.risk_tolerance,
      investmentStyle: result.investment_style,
      decisionPatterns: result.decision_patterns,
      stopLossStrategy: result.stop_loss_strategy,
      positionManagement: result.position_management,
      marketAnalysisPreference: result.market_analysis_preference,
      emotionalControl: result.emotional_control,
      timeHorizon: result.time_horizon
    };
  }
}