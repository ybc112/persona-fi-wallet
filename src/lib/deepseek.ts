interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DeepSeekResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

export class DeepSeekAI {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY!;
    this.baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
  }

  async chat(messages: DeepSeekMessage[]): Promise<string> {
    try {
      // 创建AbortController用于超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时

      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages,
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      clearTimeout(timeoutId); // 清除超时定时器

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status}`);
      }

      const data: DeepSeekResponse = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('DeepSeek API error:', error);
      if (error.name === 'AbortError') {
        throw new Error('DeepSeek API请求超时，请重试');
      }
      throw error;
    }
  }

  // 生成AI投资建议
  async generateInvestmentAdvice(
    personalityType: string,
    riskLevel: string,
    query: string,
    trainingData?: any[]
  ): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(personalityType, riskLevel, trainingData);
    
    const messages: DeepSeekMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query }
    ];

    return await this.chat(messages);
  }

  // 训练AI角色
  async trainPersonality(
    personalityType: string,
    riskLevel: string,
    userMessage: string,
    previousSessions?: any[]
  ): Promise<string> {
    const systemPrompt = `
你是一个${personalityType}类型的AI投资顾问，风险偏好为${riskLevel}。

现在正在进行个性化训练，请根据用户的问题和偏好，给出符合你角色设定的回答。
要体现出你的投资风格和个性特点。

**重要格式要求**：
- 请直接以纯文本形式回复，不要使用代码块、Mermaid图表或markdown格式
- 使用emoji和简洁的段落结构
- 直接给出分析和建议，无需特殊格式

${previousSessions ? `
之前的对话历史：
${previousSessions.map(s => `用户: ${s.user_message}\n你: ${s.ai_response}`).join('\n\n')}
` : ''}

请保持角色一致性，给出专业且个性化的回答。
`;

    const messages: DeepSeekMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ];

    return await this.chat(messages);
  }

  // 生成AI角色描述
  async generatePersonaDescription(
    personalityType: string,
    riskLevel: string,
    specialization?: string,
    name?: string,
    trainingData?: any[]
  ): Promise<string> {
    let prompt = `
请为一个名为"${name || '智能投资顾问'}"的${personalityType}类型AI投资顾问生成详细的角色描述。

基本特征：
- 角色名称：${name || '智能投资顾问'}
- 投资风格：${personalityType}
- 风险偏好：${riskLevel}
${specialization ? `- 专业领域：${specialization}` : ''}
`;

    // 如果有训练数据，分析用户偏好
    if (trainingData && Array.isArray(trainingData) && trainingData.length > 0) {
      prompt += `

用户训练数据分析：
基于用户的训练对话，这个AI角色应该体现以下特点：
`;

      // 分析训练数据中的关键信息
      const userMessages = trainingData.filter(msg => msg.role === 'user').slice(0, 5);
      userMessages.forEach((msg, index) => {
        prompt += `${index + 1}. 用户关注：${msg.content}\n`;
      });
    }

    prompt += `

请生成一个200字左右的个性化角色描述，包括：
1. 以角色名称开头的自我介绍
2. 基于用户偏好的投资理念和策略
3. 体现个性特点的服务风格
4. 专业优势和特色

要求：
- 必须体现角色的个性化特征
- 专业、有个性、吸引人
- 如果有训练数据，要体现对用户偏好的理解
`;

    const messages: DeepSeekMessage[] = [
      { role: 'user', content: prompt }
    ];

    return await this.chat(messages);
  }

  private buildSystemPrompt(
    personalityType: string,
    riskLevel: string,
    trainingData?: any[]
  ): string {
    let prompt = `
你是一个专业的AI投资顾问，具有以下特征：

角色设定：
- 投资风格：${personalityType}
- 风险偏好：${riskLevel}

投资建议原则：
1. 基于当前市场情况给出建议
2. 考虑风险管理
3. 提供具体的操作建议
4. 保持专业和客观

**重要格式要求**：
- 请直接以纯文本形式回复，不要使用代码块、Mermaid图表或markdown格式
- 使用emoji和简洁的段落结构
- 直接给出分析和建议，无需特殊格式

`;

    // 根据个性类型调整提示词
    switch (personalityType) {
      case 'aggressive-trader':
        prompt += `
你是一个激进的交易者，特点：
- 追求高收益，愿意承担高风险
- 关注短期市场波动和趋势
- 偏好杠杆交易和高波动性资产
- 快速决策，敢于抓住机会
`;
        break;
      case 'conservative-advisor':
        prompt += `
你是一个保守的投资顾问，特点：
- 注重资本保值，风险控制优先
- 偏好稳定收益的投资品种
- 长期投资视角，避免频繁交易
- 谨慎分析，稳健决策
`;
        break;
      case 'defi-expert':
        prompt += `
你是一个DeFi专家，特点：
- 深度了解去中心化金融协议
- 关注流动性挖矿和收益农场
- 熟悉各种DeFi代币和项目
- 重视智能合约安全和协议风险
`;
        break;
    }

    if (trainingData && trainingData.length > 0) {
      prompt += `\n个性化训练数据：\n`;
      trainingData.forEach(session => {
        prompt += `用户问题：${session.user_message}\n你的回答：${session.ai_response}\n\n`;
      });
    }

    return prompt;
  }

  /**
   * 生成个性化投资建议
   */
  async generatePersonalizedAdvice(
    personalizedPrompt: string,
    userQuestion: string,
    personalityType: string,
    riskLevel: string
  ): Promise<string> {
    const messages: DeepSeekMessage[] = [
      {
        role: 'system',
        content: personalizedPrompt
      },
      {
        role: 'user',
        content: `作为我的专属AI投资顾问，请基于你对我的了解回答：${userQuestion}`
      }
    ];

    try {
      const response = await this.chat(messages);
      return response;
    } catch (error) {
      console.error('生成个性化建议失败:', error);
      // 回退到基础回复
      return `作为你的${personalityType}类型AI投资顾问，我建议你在${riskLevel}风险水平下考虑这个问题。不过目前我的个性化功能遇到了一些问题，请稍后再试。`;
    }
  }

  // 使用个性化提示词进行咨询
  async consultWithPersonalizedPrompt(
    personalizedPrompt: string,
    userMessage: string,
    previousMessages?: any[]
  ): Promise<string> {
    const messages: DeepSeekMessage[] = [
      { role: 'system', content: personalizedPrompt }
    ];

    // 添加历史对话上下文（如果有）
    if (previousMessages && previousMessages.length > 0) {
      // 只取最近的几条消息作为上下文，避免token过多
      const recentMessages = previousMessages.slice(-6);
      recentMessages.forEach(msg => {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role,
            content: msg.content
          });
        }
      });
    }

    // 添加当前用户问题
    messages.push({ role: 'user', content: userMessage });

    return await this.chat(messages);
  }
}

export default DeepSeekAI;
