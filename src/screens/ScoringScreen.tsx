import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, Legend } from 'recharts';
import { AnalysisResult, ScoringCardEntry } from '../types';

interface ScoringScreenProps {
  result: AnalysisResult;
}

export const ScoringScreen: React.FC<ScoringScreenProps> = ({ result }) => {
  const [editableCard, setEditableCard] = useState<ScoringCardEntry[]>(result.scoringCard);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const categories = useMemo(() => Array.from(new Set(editableCard.map(c => c.category))), [editableCard]);

  const filtered = filterCategory === 'all'
    ? editableCard
    : editableCard.filter(c => c.category === filterCategory);

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, ScoringCardEntry[]> = {};
    filtered.forEach(c => {
      if (!groups[c.category]) groups[c.category] = [];
      groups[c.category].push(c);
    });
    return groups;
  }, [filtered]);

  const updatePoints = (factor: string, segment: string, newPoints: number) => {
    setEditableCard(prev => prev.map(c =>
      c.factor === factor && c.segment === segment ? { ...c, points: newPoints } : c
    ));
  };

  const hasOldStaircase = result.oldStaircaseData.length > 0;

  // Merge staircase data for side-by-side comparison
  const staircaseComparison = result.staircaseData.map((s, i) => ({
    label: s.label,
    newModel: s.conversionRate,
    oldModel: hasOldStaircase ? result.oldStaircaseData[i]?.conversionRate || 0 : 0,
    leadCount: s.leadCount,
  }));

  // Calculate separation quality
  const newSep = result.staircaseData[0]?.conversionRate / Math.max(result.staircaseData[3]?.conversionRate || 1, 0.1);
  const oldSep = hasOldStaircase
    ? (result.oldStaircaseData[0]?.conversionRate / Math.max(result.oldStaircaseData[3]?.conversionRate || 1, 0.1))
    : 1;
  const sepImprovement = oldSep > 0 ? Math.round((newSep / oldSep) * 10) / 10 : 0;

  const categoryColors: Record<string, string> = {
    Behavioral: 'var(--accent-blue)',
    Channel: 'var(--accent-green)',
    Firmographic: 'var(--accent-yellow)',
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '48px 32px' }}>
      <h2 style={{ fontSize: 32, marginBottom: 8 }}>New Scoring Model</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 32 }}>
        Evidence-based scoring card with staircase validation.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>
        {/* Left: Scoring Card */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ fontSize: 18 }}>Scoring Card</h3>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setFilterCategory('all')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 16,
                  fontSize: 11,
                  fontWeight: 600,
                  border: 'none',
                  background: filterCategory === 'all' ? 'var(--accent-blue-dim)' : 'var(--bg-input)',
                  color: filterCategory === 'all' ? 'var(--accent-blue)' : 'var(--text-muted)',
                }}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 16,
                    fontSize: 11,
                    fontWeight: 600,
                    border: 'none',
                    background: filterCategory === cat ? 'var(--accent-blue-dim)' : 'var(--bg-input)',
                    color: filterCategory === cat ? categoryColors[cat] || 'var(--accent-blue)' : 'var(--text-muted)',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div style={{ maxHeight: 500, overflowY: 'auto' }}>
            {Object.entries(grouped).map(([category, entries]) => (
              <div key={category} style={{ marginBottom: 20 }}>
                <div style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: categoryColors[category] || 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: 1.5,
                  padding: '8px 0',
                  borderBottom: '1px solid var(--border-color)',
                  marginBottom: 8,
                }}>
                  {category}
                </div>
                {entries.slice(0, 15).map((entry, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: '1px solid rgba(30,48,80,0.5)',
                    gap: 12,
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{entry.factor}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{entry.segment}</div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{entry.lift}x</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="range"
                        min={0}
                        max={50}
                        value={entry.points}
                        onChange={(e) => updatePoints(entry.factor, entry.segment, parseInt(e.target.value))}
                        style={{
                          width: 60,
                          accentColor: 'var(--accent-blue)',
                        }}
                      />
                      <span style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: 'var(--accent-blue)',
                        minWidth: 28,
                        textAlign: 'right',
                      }}>
                        {entry.points}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* MQL Threshold */}
          <div style={{
            marginTop: 20,
            padding: 16,
            background: 'var(--accent-blue-dim)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(30,144,255,0.3)',
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-blue)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
              MQL Threshold
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Outfit, sans-serif', marginBottom: 4 }}>
              {result.mqlThreshold} points
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Set your MQL threshold here to capture ~70% of eventual wins while filtering the majority of non-converters.
            </div>
          </div>
        </div>

        {/* Right: Staircase Validation */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: 24,
        }}>
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>Staircase Validation</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
            A clean descending staircase proves the model separates winners from losers.
          </p>

          <div style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={staircaseComparison} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E3050" />
                <XAxis dataKey="label" stroke="#5A7099" fontSize={12} />
                <YAxis stroke="#5A7099" fontSize={12} tickFormatter={v => `${v}%`} />
                <Tooltip
                  contentStyle={{ background: '#131F35', border: '1px solid #1E3050', borderRadius: 8, color: '#fff' }}
                  formatter={(value: any) => [`${value}%`, '']}
                />
                <Legend />
                {hasOldStaircase && (
                  <Bar dataKey="oldModel" name="Current Model" fill="#5A7099" radius={[4, 4, 0, 0]} barSize={40} />
                )}
                <Bar dataKey="newModel" name="New Model" radius={[4, 4, 0, 0]} barSize={40}>
                  {staircaseComparison.map((entry, i) => (
                    <Cell key={i} fill={i === 0 ? '#1E90FF' : i === 1 ? '#3CA0FF' : i === 2 ? '#6BB8FF' : '#A0D0FF'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Separation callout */}
          <div style={{
            marginTop: 20,
            padding: 16,
            background: 'var(--accent-green-dim)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(0,214,143,0.3)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 36, fontWeight: 900, fontFamily: 'Outfit, sans-serif', color: 'var(--accent-green)' }}>
              {newSep.toFixed(1)}x
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
              separation between top and bottom quartile
              {hasOldStaircase && sepImprovement > 1 && (
                <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>
                  {' '}— {sepImprovement}x better than your current model
                </span>
              )}
            </div>
          </div>

          {/* Quartile details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 20 }}>
            {result.staircaseData.map((q, i) => (
              <div key={i} style={{
                padding: 12,
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-sm)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>{q.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{q.conversionRate}%</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{q.leadCount} leads</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
