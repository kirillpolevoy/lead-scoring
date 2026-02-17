import React, { useState, useCallback } from 'react';
import './App.css';
import { AppScreen, Lead, BusinessParams, AnalysisResult } from './types';
import { runAnalysis } from './utils/analysisEngine';
import { Navigation } from './components/Navigation';
import { SetupScreen } from './screens/SetupScreen';
import { HeadlineScreen } from './screens/HeadlineScreen';
import { TrendsScreen } from './screens/TrendsScreen';
import { DiagnosticScreen } from './screens/DiagnosticScreen';
import { ModelBrokenScreen } from './screens/ModelBrokenScreen';
import { ScoringScreen } from './screens/ScoringScreen';
import { RecommendationsScreen } from './screens/RecommendationsScreen';

function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('setup');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [hasCurrentWeights, setHasCurrentWeights] = useState(false);

  const handleRunAnalysis = useCallback((leads: Lead[], params: BusinessParams) => {
    const result = runAnalysis(leads, params);
    setAnalysisResult(result);
    setHasCurrentWeights(params.hasCurrentWeights);
    setCurrentScreen('headline');
  }, []);

  const handleNavigate = useCallback((screen: AppScreen) => {
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Navigation arrows for next/prev
  const screenOrder: AppScreen[] = ['setup', 'headline', 'trends', 'diagnostic'];
  if (hasCurrentWeights) screenOrder.push('model-broken');
  screenOrder.push('scoring', 'recommendations');

  const currentIndex = screenOrder.indexOf(currentScreen);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < screenOrder.length - 1 && currentIndex >= 0;

  const goNext = () => {
    if (hasNext) handleNavigate(screenOrder[currentIndex + 1]);
  };
  const goPrev = () => {
    if (hasPrev) handleNavigate(screenOrder[currentIndex - 1]);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navigation
        currentScreen={currentScreen}
        onNavigate={handleNavigate}
        hasCurrentWeights={hasCurrentWeights}
        analysisComplete={analysisResult !== null}
      />

      <main>
        {currentScreen === 'setup' && (
          <SetupScreen onRunAnalysis={handleRunAnalysis} />
        )}
        {currentScreen === 'headline' && analysisResult && (
          <HeadlineScreen result={analysisResult} />
        )}
        {currentScreen === 'trends' && analysisResult && (
          <TrendsScreen result={analysisResult} />
        )}
        {currentScreen === 'diagnostic' && analysisResult && (
          <DiagnosticScreen result={analysisResult} />
        )}
        {currentScreen === 'model-broken' && analysisResult && (
          <ModelBrokenScreen result={analysisResult} />
        )}
        {currentScreen === 'scoring' && analysisResult && (
          <ScoringScreen result={analysisResult} />
        )}
        {currentScreen === 'recommendations' && analysisResult && (
          <RecommendationsScreen result={analysisResult} />
        )}
      </main>

      {/* Prev/Next navigation */}
      {currentScreen !== 'setup' && analysisResult && (
        <div style={{
          maxWidth: 1400,
          margin: '0 auto',
          padding: '24px 32px 48px',
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <button
            onClick={goPrev}
            disabled={!hasPrev}
            style={{
              padding: '12px 24px',
              background: hasPrev ? 'var(--bg-card)' : 'transparent',
              border: hasPrev ? '1px solid var(--border-color)' : 'none',
              borderRadius: 'var(--radius-md)',
              color: hasPrev ? 'var(--text-secondary)' : 'transparent',
              fontSize: 14,
              fontWeight: 600,
              cursor: hasPrev ? 'pointer' : 'default',
            }}
          >
            &#8592; Previous
          </button>
          <button
            onClick={goNext}
            disabled={!hasNext}
            style={{
              padding: '12px 24px',
              background: hasNext ? 'var(--gradient-blue)' : 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: hasNext ? 'white' : 'transparent',
              fontSize: 14,
              fontWeight: 600,
              boxShadow: hasNext ? '0 4px 15px rgba(30, 144, 255, 0.3)' : 'none',
              cursor: hasNext ? 'pointer' : 'default',
            }}
          >
            Next &#8594;
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
