import React, { useState, useEffect } from 'react';
import { RotateCcw, AlertCircle } from 'lucide-react';
import './VynoraLoader.css';

export interface VynoraLoaderProps {
  /**
   * Layout mode:
   * - 'fullscreen': Full-screen splash overlay (app boot, auth check, global transition)
   * - 'inline': Compact section loader for inside module views, tables, and cards
   */
  variant?: 'fullscreen' | 'inline';
  /** Backwards compatibility alias for variant="fullscreen" */
  fullscreen?: boolean;
  /** Primary status message */
  message?: string;
  /** Optional secondary message / details */
  submessage?: string;
  /** Whether to show the Vynora V-and-leaf logo & title (default true for fullscreen, false for inline) */
  showBranding?: boolean;
  /** Whether to display the 4 glowing pulsing dots (default true) */
  showDots?: boolean;
  /** Whether to display the bottom flowing ambient waves (default true in fullscreen) */
  showWaves?: boolean;
  /** Timeout in ms before showing a fallback retry button (default 14000ms for fullscreen, 0 to disable) */
  timeoutMs?: number;
  /** Callback triggered when user clicks retry */
  onRetry?: () => void;
  /** Additional CSS class names */
  className?: string;
}

/**
 * High-fidelity SVG of the Vynora V-and-Leaf Brand Logo
 * Matches the reference design: Cyan-to-teal left arm + organic emerald-to-bright-green leaf right arm.
 */
export const VynoraLogo: React.FC<{ size?: number; className?: string }> = ({ size = 76, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`vynora-logo-svg ${className}`}
      aria-hidden="true"
    >
      <defs>
        {/* Left V-arm Cyan-to-Teal Gradient */}
        <linearGradient id="vynoraCyanGrad" x1="20" y1="15" x2="65" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="45%" stopColor="#00f2fe" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>

        {/* Right Leaf Emerald-to-Green Gradient */}
        <linearGradient id="vynoraLeafGrad" x1="55" y1="80" x2="105" y2="15" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="40%" stopColor="#10b981" />
          <stop offset="85%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#4ade80" />
        </linearGradient>

        {/* Inner Leaf Vein Highlight Gradient */}
        <linearGradient id="vynoraVeinGrad" x1="60" y1="65" x2="95" y2="25" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#047857" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#6ee7b7" stopOpacity="0.4" />
        </linearGradient>

        {/* Subtle Ambient Drop Shadow */}
        <filter id="vynoraLogoGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#00f2fe" floodOpacity="0.4" />
          <feDropShadow dx="0" dy="0" stdDeviation="12" floodColor="#10b981" floodOpacity="0.25" />
        </filter>
      </defs>

      <g filter="url(#vynoraLogoGlow)">
        {/* Left V-Arm: Smooth aerodynamic curved blade */}
        <path
          d="M26 22 C 29 18, 38 18, 43 25 L 59 66 C 62 73, 59 81, 52 83 C 46 85, 41 81, 38 75 L 24 33 C 22 28, 23 24, 26 22 Z"
          fill="url(#vynoraCyanGrad)"
        />

        {/* Right Arm: Stylized organic botanical leaf */}
        <path
          d="M 52 79 C 52 79, 62 70, 68 55 C 75 39, 84 25, 102 18 C 103 26, 100 42, 90 56 C 81 68, 69 77, 56 81 C 53 82, 51 81, 52 79 Z"
          fill="url(#vynoraLeafGrad)"
        />

        {/* Delicate inner leaf vein line */}
        <path
          d="M 57 76 C 65 65, 75 50, 93 27"
          stroke="url(#vynoraVeinGrad)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};

/**
 * Miniature center leaf icon for inside the circular loader ring
 */
export const VynoraCenterLeaf: React.FC<{ size?: number; className?: string }> = ({ size = 26, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`vynora-center-leaf ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="vynoraMiniLeaf" x1="4" y1="28" x2="28" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="50%" stopColor="#00f2fe" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      {/* Primary Leaf */}
      <path
        d="M12 24 C12 24, 15 16, 21 11 C 25 8, 28 6, 29 5 C 29 8, 27 15, 23 18 C 18 22, 14 24, 12 24 Z"
        fill="url(#vynoraMiniLeaf)"
      />
      {/* Secondary Left Leaf */}
      <path
        d="M12 24 C10 21, 6 18, 5 13 C 8 13, 11 16, 13 20 Z"
        fill="url(#vynoraMiniLeaf)"
        opacity="0.8"
      />
    </svg>
  );
};

/**
 * Bottom Ambient Wave Lines
 * Dual glowing sinusoidal curves traversing gently at the base of the viewport
 */
export const VynoraAmbientWaves: React.FC = () => {
  return (
    <div className="vynora-bottom-waves" aria-hidden="true">
      <svg
        viewBox="0 0 800 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="vynora-wave-svg"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="vynoraWaveGradCyan" x1="0" y1="0" x2="800" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00f2fe" stopOpacity="0" />
            <stop offset="25%" stopColor="#00f2fe" stopOpacity="0.45" />
            <stop offset="55%" stopColor="#06b6d4" stopOpacity="0.75" />
            <stop offset="85%" stopColor="#38bdf8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#00f2fe" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="vynoraWaveGradGreen" x1="0" y1="0" x2="800" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
            <stop offset="30%" stopColor="#10b981" stopOpacity="0.65" />
            <stop offset="60%" stopColor="#34d399" stopOpacity="0.7" />
            <stop offset="80%" stopColor="#06b6d4" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Wave Line 1 (Cyan/Teal flow) */}
        <path
          className="vynora-wave-path-cyan"
          d="M 0 35 C 160 12, 280 50, 420 32 C 560 14, 680 48, 800 35"
          stroke="url(#vynoraWaveGradCyan)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Wave Line 2 (Emerald/Teal flow) */}
        <path
          className="vynora-wave-path-green"
          d="M 0 25 C 140 46, 290 10, 440 28 C 590 46, 700 18, 800 28"
          stroke="url(#vynoraWaveGradGreen)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

/**
 * Main VynoraLoader Component
 */
export const VynoraLoader: React.FC<VynoraLoaderProps> = ({
  variant,
  fullscreen = false,
  message = 'Loading your world...',
  submessage,
  showBranding,
  showDots = true,
  showWaves,
  timeoutMs = 14000,
  onRetry,
  className = '',
}) => {
  const isFullscreen = variant === 'fullscreen' || fullscreen;
  const shouldShowBranding = showBranding ?? isFullscreen;
  const shouldShowWaves = showWaves ?? isFullscreen;

  const [timedOut, setTimedOut] = useState(false);

  // Safety Timeout: Never keep user stuck indefinitely in an unresponsive spinner
  useEffect(() => {
    if (!timeoutMs || timeoutMs <= 0) return;

    const timer = setTimeout(() => {
      setTimedOut(true);
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [timeoutMs]);

  const handleRetry = () => {
    setTimedOut(false);
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const containerClasses = isFullscreen
    ? `vynora-loader-fullscreen ${className}`
    : `vynora-loader-inline ${className}`;

  // Dimension scaling between fullscreen and inline
  const spinnerSize = isFullscreen ? 116 : 74;
  const strokeWidth = isFullscreen ? 4 : 3.5;
  const radius = (spinnerSize - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const beadOrbitSize = spinnerSize;

  return (
    <div
      className={containerClasses}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      {/* Defs container for gradients used in SVG elements */}
      <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }}>
        <defs>
          <linearGradient id="vynoraSpinnerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f2fe" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
      </svg>

      {/* Main Content Area */}
      <div className="vynora-loader-content">
        {/* Brand Header: Logo + VYNORA + Tagline */}
        {shouldShowBranding && (
          <div className="vynora-brand-wrapper">
            <VynoraLogo size={isFullscreen ? 80 : 54} />
            <h1 className="vynora-brand-title">VYNORA</h1>
            <p className="vynora-brand-tagline">
              <span>Your Life</span>
              <span className="vynora-tagline-separator">•</span>
              <span>Organized</span>
              <span className="vynora-tagline-separator">•</span>
              <span>Smarter</span>
            </p>
          </div>
        )}

        {/* Circular Spinner Ring with Glowing Bead & Center Leaf */}
        <div
          className="vynora-spinner-wrapper"
          style={{ width: spinnerSize, height: spinnerSize }}
        >
          <svg
            width={spinnerSize}
            height={spinnerSize}
            className="vynora-spinner-svg"
            viewBox={`0 0 ${spinnerSize} ${spinnerSize}`}
          >
            {/* Background Circular Track */}
            <circle
              cx={spinnerSize / 2}
              cy={spinnerSize / 2}
              r={radius}
              className="vynora-spinner-track"
              strokeWidth={strokeWidth}
            />

            {/* Glowing Gradient Sweep Arc */}
            <circle
              cx={spinnerSize / 2}
              cy={spinnerSize / 2}
              r={radius}
              className="vynora-spinner-arc"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              style={{
                filter: isFullscreen ? 'drop-shadow(0 0 6px #00f2fe)' : 'none',
              }}
            />
          </svg>

          {/* Glowing Bead on the Circular Orbit */}
          <div
            className="vynora-spinner-bead-orbit"
            style={{ width: beadOrbitSize, height: beadOrbitSize }}
          >
            <div className="vynora-spinner-bead" />
          </div>

          {/* Center Leaf Emblem */}
          <div className="vynora-center-emblem">
            <VynoraCenterLeaf size={isFullscreen ? 28 : 20} />
          </div>
        </div>

        {/* Status Message and 4 Pulsing Dots */}
        <div className="vynora-status-section">
          <p className="vynora-loading-text">{message}</p>
          {submessage && <p className="vynora-submessage">{submessage}</p>}

          {showDots && (
            <div className="vynora-dots-row" aria-hidden="true">
              <span className="vynora-dot" />
              <span className="vynora-dot" />
              <span className="vynora-dot" />
              <span className="vynora-dot" />
            </div>
          )}
        </div>

        {/* Safety Timeout Notice if connection stalls */}
        {timedOut && (
          <div className="vynora-timeout-card" role="alert">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-red-400 shrink-0" />
              <span className="vynora-timeout-text">
                Connection is taking longer than expected.
              </span>
            </div>
            <button
              type="button"
              onClick={handleRetry}
              className="vynora-retry-btn"
              aria-label="Retry connection"
            >
              <RotateCcw size={14} />
              <span>Retry Connection</span>
            </button>
          </div>
        )}
      </div>

      {/* Ambient Flowing Wave Lines (Bottom) */}
      {shouldShowWaves && <VynoraAmbientWaves />}
    </div>
  );
};

export default VynoraLoader;
