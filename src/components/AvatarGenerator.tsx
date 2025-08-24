import React, { useState } from 'react';
import { Sparkles, RefreshCw, Download, Eye, ExternalLink, Database } from 'lucide-react';

interface AvatarGeneratorProps {
  personalityType: string;
  onAvatarGenerated?: (imageUrl: string) => void;
  className?: string;
}

interface GenerationState {
  isGenerating: boolean;
  imageUrl: string | null;
  ipfsHash: string | null;
  ipfsUrl: string | null;
  error: string | null;
  prompt: string | null;
}

export default function AvatarGenerator({ 
  personalityType, 
  onAvatarGenerated,
  className = '' 
}: AvatarGeneratorProps) {
  const [state, setState] = useState<GenerationState>({
    isGenerating: false,
    imageUrl: null,
    ipfsHash: null,
    ipfsUrl: null,
    error: null,
    prompt: null
  });

  const [customPrompt, setCustomPrompt] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'neutral'>('neutral');
  const [artStyle, setArtStyle] = useState<'realistic' | 'anime' | 'cartoon' | 'cyberpunk'>('realistic');

  const generateAvatar = async () => {
    setState(prev => ({ ...prev, isGenerating: true, error: null }));

    try {
      const response = await fetch('/api/generate-avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalityType,
          customPrompt: customPrompt.trim() || undefined,
          gender,
          artStyle
        }),
      });

      const result = await response.json();

      if (result.success && result.imageUrl) {
        setState(prev => ({
          ...prev,
          imageUrl: result.imageUrl,
          ipfsHash: result.ipfsHash || null,
          ipfsUrl: result.ipfsUrl || null,
          prompt: result.prompt,
          error: null
        }));

        // 通知父组件，优先使用IPFS URL
        const finalUrl = result.ipfsUrl || result.imageUrl;
        onAvatarGenerated?.(finalUrl);
      } else {
        setState(prev => ({
          ...prev,
          error: result.error || 'Failed to generate avatar'
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Network error. Please try again.'
      }));
    } finally {
      setState(prev => ({ ...prev, isGenerating: false }));
    }
  };

  const downloadImage = async () => {
    if (!state.imageUrl) return;

    try {
      const response = await fetch(state.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-avatar-${personalityType}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <div className={`bg-gradient-to-br from-purple-900/30 to-pink-900/30 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30 ${className}`}>
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-purple-600/20 rounded-lg">
          <Sparkles className="w-5 h-5 text-purple-400" />
        </div>
        <h3 className="text-xl font-bold text-white">AI Avatar Generator</h3>
      </div>

      {/* 配置选项 */}
      <div className="space-y-4 mb-6">
        {/* 性别选择 */}
        <div>
          <label className="block text-sm font-medium text-purple-200 mb-3">Gender</label>
          <div className="flex gap-2">
            {(['neutral', 'male', 'female'] as const).map((option) => (
              <button
                key={option}
                onClick={() => setGender(option)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  gender === option
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                    : 'bg-black/30 text-purple-200 hover:bg-purple-600/20 border border-purple-500/30'
                }`}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* 艺术风格选择 */}
        <div>
          <label className="block text-sm font-medium text-purple-200 mb-3">Art Style</label>
          <div className="grid grid-cols-2 gap-2">
            {(['realistic', 'anime', 'cartoon', 'cyberpunk'] as const).map((option) => (
              <button
                key={option}
                onClick={() => setArtStyle(option)}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  artStyle === option
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                    : 'bg-black/30 text-purple-200 hover:bg-purple-600/20 border border-purple-500/30'
                }`}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* 自定义提示词 */}
        <div>
          <label className="block text-sm font-medium text-purple-200 mb-3">
            Custom Prompt (Optional)
          </label>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Describe additional details for your AI avatar..."
            className="w-full px-4 py-3 bg-black/30 border border-purple-500/30 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-400 resize-none"
            rows={3}
          />
        </div>
      </div>

      {/* 生成按钮 */}
      <button
        onClick={generateAvatar}
        disabled={state.isGenerating}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-purple-500/25 transform hover:scale-105 disabled:transform-none"
      >
        {state.isGenerating ? (
          <>
            <RefreshCw className="w-5 h-5 animate-spin" />
            🎨 Generating Avatar...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            ✨ Generate AI Avatar
          </>
        )}
      </button>

      {/* 错误显示 */}
      {state.error && (
        <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg">
          <p className="text-red-300 text-sm">{state.error}</p>
        </div>
      )}

      {/* 生成的头像 */}
      {state.imageUrl && (
        <div className="mt-6">
          <div className="relative group">
            <img
              src={state.imageUrl}
              alt="Generated AI Avatar"
              className="w-full rounded-lg border border-gray-600"
            />
            
            {/* 悬浮操作按钮 */}
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={downloadImage}
                className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => window.open(state.ipfsUrl || state.imageUrl!, '_blank')}
                className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors"
                title="View Full Size"
              >
                <Eye className="w-4 h-4" />
              </button>
              {state.ipfsUrl && (
                <button
                  onClick={() => window.open(state.ipfsUrl!, '_blank')}
                  className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors"
                  title="View on IPFS"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* IPFS信息显示 */}
          {state.ipfsHash && (
            <div className="mt-3 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-4 h-4 text-green-400" />
                <p className="text-sm font-medium text-green-400">Stored on IPFS</p>
              </div>
              <div className="space-y-1">
                <div>
                  <span className="text-xs text-gray-400">Hash: </span>
                  <span className="text-xs text-green-300 font-mono">{state.ipfsHash}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400">URL: </span>
                  <a
                    href={state.ipfsUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-green-300 hover:text-green-200 underline"
                  >
                    View on IPFS Gateway
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* 提示词显示 */}
          {state.prompt && (
            <div className="mt-3 p-3 bg-gray-700/50 rounded-lg">
              <p className="text-xs text-gray-400 mb-1">Generated with prompt:</p>
              <p className="text-sm text-gray-300">{state.prompt}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
