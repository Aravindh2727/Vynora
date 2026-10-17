import React from 'react';
import { VynoraLoader } from './VynoraLoader';

export interface LoadingSpinnerProps {
  message?: string;
  submessage?: string;
  fullscreen?: boolean;
  showBranding?: boolean;
  className?: string;
}

/**
 * Standard Loading Spinner for Vynora.
 * Delegates to the branded VynoraLoader component, supporting both compact
 * inline module states and fullscreen overlays.
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading data from Firestore...',
  submessage,
  fullscreen = false,
  showBranding,
  className = '',
}) => {
  return (
    <VynoraLoader
      variant={fullscreen ? 'fullscreen' : 'inline'}
      message={message}
      submessage={submessage}
      showBranding={showBranding}
      className={className}
    />
  );
};

export default LoadingSpinner;
