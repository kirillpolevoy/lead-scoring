import React from 'react';
import { AppScreen } from '../types';

interface NavigationProps {
  currentScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
  hasCurrentWeights: boolean;
  analysisComplete: boolean;
}

const screens: { id: AppScreen; label: string; number: number; requiresWeights?: boolean }[] = [
  { id: 'setup', label: 'Setup', number: 1 },
  { id: 'headline', label: 'The Headline', number: 2 },
  { id: 'trends', label: 'Trends', number: 3 },
  { id: 'diagnostic', label: 'Diagnostic', number: 4 },
  { id: 'model-broken', label: 'Model Gaps', number: 5, requiresWeights: true },
  { id: 'scoring', label: 'New Model', number: 6 },
  { id: 'recommendations', label: 'Actions', number: 7 },
];

export const Navigation: React.FC<NavigationProps> = ({ currentScreen, onNavigate, hasCurrentWeights, analysisComplete }) => {
  const visibleScreens = screens.filter(s => !s.requiresWeights || hasCurrentWeights);

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(10, 22, 40, 0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-color)',
      padding: '0 32px',
    }}>
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        height: 64,
        gap: 8,
      }}>
        <div style={{
          fontFamily: 'Outfit, sans-serif',
          fontWeight: 800,
          fontSize: 22,
          background: 'linear-gradient(135deg, #1E90FF, #00D68F)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginRight: 32,
          letterSpacing: '-0.5px',
        }}>
          LeadLens
        </div>
        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
          {visibleScreens.map(s => {
            const isActive = s.id === currentScreen;
            const isDisabled = s.id !== 'setup' && !analysisComplete;
            return (
              <button
                key={s.id}
                onClick={() => !isDisabled && onNavigate(s.id)}
                disabled={isDisabled}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  background: isActive ? 'var(--accent-blue-dim)' : 'transparent',
                  color: isActive ? 'var(--accent-blue)' : isDisabled ? 'var(--text-muted)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: 14,
                  border: 'none',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                  opacity: isDisabled ? 0.5 : 1,
                }}
              >
                <span style={{ opacity: 0.5, marginRight: 4 }}>{s.number}.</span>
                {s.label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
