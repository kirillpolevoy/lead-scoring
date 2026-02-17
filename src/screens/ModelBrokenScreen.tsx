import React, { useState, useMemo } from 'react';
import { AnalysisResult, ModelComparisonEntry } from '../types';

interface ModelBrokenScreenProps {
  result: AnalysisResult;
}

export const ModelBrokenScreen: React.FC<ModelBrokenScreenProps> = ({ result }) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const { modelComparison } = result;

  const overweighted = useMemo(() => modelComparison.filter(m => m.status === 'overweighted'), [modelComparison]);
  const underweighted = useMemo(() => modelComparison.filter(m => m.status === 'underweighted'), [modelComparison]);
  const missing = useMemo(() => modelComparison.filter(m => m.status === 'missing'), [modelComparison]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const aligned = useMemo(() => modelComparison.filter(m => m.status === 'aligned'), [modelComparison]);

  const filtered = filterStatus === 'all' ? modelComparison : modelComparison.filter(m => m.status === filterStatus);

  const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
    overweighted: { color: 'var(--accent-red)', bg: 'var(--accent-red-dim)', label: 'Overweighted' },
    underweighted: { color: 'var(--accent-yellow)', bg: 'var(--accent-yellow-dim)', label: 'Underweighted' },
    missing: { color: 'var(--accent-blue)', bg: 'var(--accent-blue-dim)', label: 'Missing' },
    aligned: { color: 'var(--accent-green)', bg: 'var(--accent-green-dim)', label: 'Aligned' },
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '48px 32px' }}>
      <h2 style={{ fontSize: 32, marginBottom: 8 }}>Your Model is Broken</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 32 }}>
        Gap between your current scoring weights and what the evidence shows.
      </p>

      {/* Three callout cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 40 }}>
        {/* Overweighted */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--accent-red)',
          borderRadius: 'var(--radius-lg)',
          padding: 24,
          borderTop: '4px solid var(--accent-red)',
        }}>
          <div style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--accent-red)',
            textTransform: 'uppercase',
            letterSpacing: 1.5,
            marginBottom: 16,
          }}>
            Overweighted ({overweighted.length})
          </div>
          {overweighted.length > 0 ? (
            <div>
              {overweighted.slice(0, 3).map((m, i) => (
                <div key={i} style={{
                  padding: '10px 0',
                  borderBottom: i < Math.min(overweighted.length - 1, 2) ? '1px solid var(--border-color)' : 'none',
                }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{m.factor}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    You give {m.currentPoints} points but evidence shows {m.evidencePoints} ({m.lift}x lift)
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No overweighted factors found.</p>
          )}
        </div>

        {/* Underweighted */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--accent-yellow)',
          borderRadius: 'var(--radius-lg)',
          padding: 24,
          borderTop: '4px solid var(--accent-yellow)',
        }}>
          <div style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--accent-yellow)',
            textTransform: 'uppercase',
            letterSpacing: 1.5,
            marginBottom: 16,
          }}>
            Underweighted ({underweighted.length})
          </div>
          {underweighted.length > 0 ? (
            <div>
              {underweighted.slice(0, 3).map((m, i) => (
                <div key={i} style={{
                  padding: '10px 0',
                  borderBottom: i < Math.min(underweighted.length - 1, 2) ? '1px solid var(--border-color)' : 'none',
                }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{m.factor}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    Only {m.currentPoints} points but has {m.lift}x lift — should be {m.evidencePoints} points
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No underweighted factors found.</p>
          )}
        </div>

        {/* Missing */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--accent-blue)',
          borderRadius: 'var(--radius-lg)',
          padding: 24,
          borderTop: '4px solid var(--accent-blue)',
        }}>
          <div style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--accent-blue)',
            textTransform: 'uppercase',
            letterSpacing: 1.5,
            marginBottom: 16,
          }}>
            Blind Spots ({missing.length})
          </div>
          {missing.length > 0 ? (
            <div>
              {missing.slice(0, 3).map((m, i) => (
                <div key={i} style={{
                  padding: '10px 0',
                  borderBottom: i < Math.min(missing.length - 1, 2) ? '1px solid var(--border-color)' : 'none',
                }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{m.factor}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {m.lift}x lift — worth {m.evidencePoints} points but not in your model
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No blind spots found.</p>
          )}
        </div>
      </div>

      {/* Comparison table */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: 24,
      }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
          <h3 style={{ fontSize: 18, flex: 1 }}>Full Comparison</h3>
          <div style={{ display: 'flex', gap: 6 }}>
            {['all', 'overweighted', 'underweighted', 'missing', 'aligned'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  background: filterStatus === status
                    ? (status === 'all' ? 'var(--accent-blue-dim)' : statusConfig[status]?.bg || 'var(--accent-blue-dim)')
                    : 'var(--bg-input)',
                  color: filterStatus === status
                    ? (status === 'all' ? 'var(--accent-blue)' : statusConfig[status]?.color || 'var(--accent-blue)')
                    : 'var(--text-muted)',
                }}
              >
                {status === 'all' ? 'All' : statusConfig[status]?.label || status}
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, borderBottom: '1px solid var(--border-color)' }}>Factor</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, borderBottom: '1px solid var(--border-color)' }}>Current Points</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, borderBottom: '1px solid var(--border-color)' }}>Evidence Points</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, borderBottom: '1px solid var(--border-color)' }}>Lift</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, borderBottom: '1px solid var(--border-color)' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => {
                const config = statusConfig[m.status];
                return (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px 12px', fontSize: 14, fontWeight: 600 }}>{m.factor}</td>
                    <td style={{ padding: '10px 12px', fontSize: 14, textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {m.currentPoints > 0 ? m.currentPoints : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 14, textAlign: 'right', fontWeight: 600 }}>
                      {m.evidencePoints}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 14, textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {m.lift > 0 ? `${m.lift}x` : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                        background: config.bg,
                        color: config.color,
                      }}>
                        {config.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
