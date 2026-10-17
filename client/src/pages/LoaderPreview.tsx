import React, { useState } from 'react';
import { VynoraLoader } from '../components/common/VynoraLoader';
import { Play, Moon, Sun, ShieldAlert, Sparkles } from 'lucide-react';

export const LoaderPreview: React.FC = () => {
  const [fullscreenDemo, setFullscreenDemo] = useState(false);
  const [demoMessage, setDemoMessage] = useState('Loading your world...');
  const [showWaves, setShowWaves] = useState(true);
  const [simulateTimeout, setSimulateTimeout] = useState(false);

  const triggerFullscreen = () => {
    setFullscreenDemo(true);
    setTimeout(() => {
      setFullscreenDemo(false);
    }, 4500);
  };

  if (fullscreenDemo) {
    return (
      <VynoraLoader
        fullscreen
        message={demoMessage}
        submessage="Preview mode (auto-dismissing in 4s)..."
        showWaves={showWaves}
        timeoutMs={simulateTimeout ? 100 : 15000}
        onRetry={() => setFullscreenDemo(false)}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-glass pb-4">
        <div>
          <h1 className="text-2xl font-bold text-textMain flex items-center gap-2">
            <Sparkles className="text-primary" size={24} />
            <span>Vynora Branded Loader Preview</span>
          </h1>
          <p className="text-sm text-textMuted mt-1">
            Official custom branded loading animation with V-and-leaf emblem, glowing orbit, and ambient waves.
          </p>
        </div>

        <button
          onClick={triggerFullscreen}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-cyan-500 text-slate-950 font-semibold shadow-neon-primary hover:brightness-110 active:scale-95 transition-all text-sm"
        >
          <Play size={16} fill="currentColor" />
          <span>Launch Fullscreen Splash</span>
        </button>
      </div>

      {/* Control Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-surface border border-glass space-y-2">
          <label className="text-xs font-semibold text-textMuted uppercase tracking-wider block">
            Status Message
          </label>
          <input
            type="text"
            value={demoMessage}
            onChange={(e) => setDemoMessage(e.target.value)}
            className="w-full bg-background border border-glass rounded-lg px-3 py-2 text-sm text-textMain focus:outline-none focus:border-primary"
          />
        </div>

        <div className="p-4 rounded-xl bg-surface border border-glass space-y-2">
          <label className="text-xs font-semibold text-textMuted uppercase tracking-wider block">
            Features
          </label>
          <label className="flex items-center gap-2 text-sm text-textMain cursor-pointer">
            <input
              type="checkbox"
              checked={showWaves}
              onChange={(e) => setShowWaves(e.target.checked)}
              className="rounded accent-primary"
            />
            <span>Show Ambient Wave Lines</span>
          </label>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-glass space-y-2">
          <label className="text-xs font-semibold text-textMuted uppercase tracking-wider block">
            Error / Timeout Simulation
          </label>
          <label className="flex items-center gap-2 text-sm text-textMain cursor-pointer">
            <input
              type="checkbox"
              checked={simulateTimeout}
              onChange={(e) => setSimulateTimeout(e.target.checked)}
              className="rounded accent-primary"
            />
            <span>Simulate Network Timeout</span>
          </label>
        </div>
      </div>

      {/* Embedded Live Previews */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Full Branded Preview Card (Dark Navy Reference) */}
        <div className="rounded-2xl border border-glass overflow-hidden shadow-2xl flex flex-col bg-[#050b14]">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between text-xs font-medium text-cyan-400">
            <span>FULL BRANDED VARIANT (DARK NAVY)</span>
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          </div>
          <div className="p-6 relative flex flex-col items-center justify-center min-h-[380px]">
            <VynoraLoader
              variant="inline"
              showBranding={true}
              message={demoMessage}
              showWaves={showWaves}
              timeoutMs={simulateTimeout ? 100 : 0}
            />
          </div>
        </div>

        {/* Compact Section Loader Preview (Used in 18 Modules) */}
        <div className="rounded-2xl border border-glass overflow-hidden shadow-lg flex flex-col bg-surface">
          <div className="px-4 py-3 border-b border-glass flex items-center justify-between text-xs font-medium text-textMuted">
            <span>COMPACT MODULE SPINNER (INLINE)</span>
            <span className="text-xs text-primary font-mono">18 MODULES</span>
          </div>
          <div className="p-6 flex flex-col items-center justify-center min-h-[380px]">
            <VynoraLoader
              variant="inline"
              showBranding={false}
              message="Loading fleet records & schedules..."
              timeoutMs={simulateTimeout ? 100 : 0}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoaderPreview;
