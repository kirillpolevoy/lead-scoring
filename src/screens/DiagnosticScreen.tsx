import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { AnalysisResult, SignalStrengthEntry, HeatmapCell } from '../types';

interface DiagnosticScreenProps {
  result: AnalysisResult;
}

type SortKey = 'lift' | 'conversionRate' | 'totalLeads' | 'wins' | 'factor';
type SortDir = 'asc' | 'desc';

const HeatmapView: React.FC<{ data: HeatmapCell[]; mode: 'conversion' | 'velocity' }> = ({ data, mode }) => {
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);
  const rows = useMemo(() => Array.from(new Set(data.map(d => d.row))).sort(), [data]);
  const cols = useMemo(() => Array.from(new Set(data.map(d => d.col))).sort(), [data]);

  const getCell = (row: string, col: string) => data.find(d => d.row === row && d.col === col);

  const maxVal = Math.max(...data.map(d => mode === 'conversion' ? d.conversionRate : d.revenueVelocity));

  const getCellColor = (cell: HeatmapCell | undefined) => {
    if (!cell) return 'var(--bg-input)';
    const val = mode === 'conversion' ? cell.conversionRate : cell.revenueVelocity;
    const intensity = val / maxVal;
    if (intensity > 0.7) return 'rgba(30, 144, 255, 0.6)';
    if (intensity > 0.4) return 'rgba(30, 144, 255, 0.3)';
    if (intensity > 0.15) return 'rgba(30, 144, 255, 0.15)';
    return 'rgba(255, 76, 106, 0.15)';
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 800 }}>
          <thead>
            <tr>
              <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}></th>
              {cols.map(col => (
                <th key={col} style={{
                  padding: '10px 8px',
                  textAlign: 'center',
                  color: 'var(--text-secondary)',
                  fontSize: 11,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  maxWidth: 100,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row}>
                <td style={{
                  padding: '8px 12px',
                  color: 'var(--text-secondary)',
                  fontSize: 13,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}>
                  {row}
                </td>
                {cols.map(col => {
                  const cell = getCell(row, col);
                  return (
                    <td
                      key={col}
                      onMouseEnter={() => setHoveredCell(cell || null)}
                      onMouseLeave={() => setHoveredCell(null)}
                      style={{
                        padding: '6px 4px',
                        textAlign: 'center',
                        cursor: cell ? 'pointer' : 'default',
                      }}
                    >
                      <div style={{
                        background: getCellColor(cell),
                        borderRadius: 6,
                        padding: '8px 4px',
                        minHeight: 48,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                        border: hoveredCell === cell && cell ? '1px solid var(--accent-blue)' : '1px solid transparent',
                      }}>
                        {cell ? (
                          <>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                              {mode === 'conversion' ? `${cell.conversionRate}%` : `$${cell.revenueVelocity}`}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                              n={cell.leadCount}
                            </div>
                          </>
                        ) : (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail popup */}
      {hoveredCell && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: 'var(--bg-card)',
          border: '1px solid var(--accent-blue)',
          borderRadius: 'var(--radius-md)',
          padding: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          zIndex: 50,
          minWidth: 220,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{hoveredCell.row} + {hoveredCell.col}</div>
          <div style={{ display: 'grid', gap: 4, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Conversion</span>
              <span style={{ fontWeight: 600 }}>{hoveredCell.conversionRate}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Lead Count</span>
              <span style={{ fontWeight: 600 }}>{hoveredCell.leadCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Avg Deal Size</span>
              <span style={{ fontWeight: 600 }}>${hoveredCell.avgDealSize.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Sales Cycle</span>
              <span style={{ fontWeight: 600 }}>{hoveredCell.avgSalesCycle} days</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Revenue Velocity</span>
              <span style={{ fontWeight: 600 }}>${hoveredCell.revenueVelocity}/day</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const DiagnosticScreen: React.FC<DiagnosticScreenProps> = ({ result }) => {
  const [activeTab, setActiveTab] = useState<'signals' | 'heatmap' | 'velocity'>('signals');
  const [sortKey, setSortKey] = useState<SortKey>('lift');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterFactor, setFilterFactor] = useState<string>('all');

  const factors = useMemo(() => Array.from(new Set(result.signalStrength.map(s => s.factor))), [result]);

  const sortedSignals = useMemo(() => {
    let filtered = filterFactor === 'all'
      ? result.signalStrength
      : result.signalStrength.filter(s => s.factor === filterFactor);

    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
      }
      return sortDir === 'desc'
        ? String(bVal).localeCompare(String(aVal))
        : String(aVal).localeCompare(String(bVal));
    });
  }, [result.signalStrength, sortKey, sortDir, filterFactor]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  // Bar chart data for lift
  const liftChartData = sortedSignals
    .filter(s => s.confidence !== 'Low')
    .slice(0, 20)
    .map(s => ({
      name: `${s.factor}: ${s.segmentValue}`,
      lift: s.lift,
      isPositive: s.lift >= 1,
    }));

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '10px 20px',
    background: active ? 'var(--accent-blue-dim)' : 'transparent',
    color: active ? 'var(--accent-blue)' : 'var(--text-secondary)',
    fontWeight: active ? 600 : 500,
    fontSize: 14,
    border: active ? '1px solid rgba(30,144,255,0.3)' : '1px solid transparent',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
  });

  const thStyle: React.CSSProperties = {
    padding: '10px 12px',
    textAlign: 'left',
    color: 'var(--text-muted)',
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottom: '1px solid var(--border-color)',
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '48px 32px' }}>
      <h2 style={{ fontSize: 32, marginBottom: 8 }}>Why the Gap Exists</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 32 }}>
        The diagnostic layer: signal strength, segment cross-tabs, and revenue velocity.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button onClick={() => setActiveTab('signals')} style={tabStyle(activeTab === 'signals')}>
          Signal Strength
        </button>
        <button onClick={() => setActiveTab('heatmap')} style={tabStyle(activeTab === 'heatmap')}>
          Segment x Channel
        </button>
        <button onClick={() => setActiveTab('velocity')} style={tabStyle(activeTab === 'velocity')}>
          Revenue Velocity
        </button>
      </div>

      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: 24,
      }}>
        {activeTab === 'signals' && (
          <div>
            {/* Filter + chart */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
              <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>Filter:</label>
              <select
                value={filterFactor}
                onChange={(e) => setFilterFactor(e.target.value)}
                style={{
                  padding: '6px 12px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                }}
              >
                <option value="all">All Factors</option>
                {factors.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            {/* Lift bar chart */}
            <div style={{ height: 380, marginBottom: 24 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={liftChartData} layout="vertical" margin={{ left: 180 }}>
                  <XAxis type="number" stroke="#5A7099" fontSize={12} domain={[0, 'auto']} />
                  <YAxis type="category" dataKey="name" stroke="#5A7099" fontSize={11} width={180} tick={{ fill: '#8B9FC0' }} />
                  <Tooltip
                    contentStyle={{ background: '#131F35', border: '1px solid #1E3050', borderRadius: 8, color: '#fff' }}
                    formatter={(value: any) => [`${value}x lift`, 'Lift']}
                  />
                  <ReferenceLine x={1} stroke="#5A7099" strokeDasharray="3 3" label={{ value: 'Baseline', fill: '#5A7099', fontSize: 11 }} />
                  <Bar dataKey="lift" radius={[0, 4, 4, 0]} barSize={16}>
                    {liftChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.lift >= 1.5 ? '#00D68F' : entry.lift >= 0.8 ? '#5A7099' : '#FF4C6A'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)' }}>
                    <th onClick={() => handleSort('factor')} style={thStyle}>Factor</th>
                    <th style={{ ...thStyle, cursor: 'default' }}>Segment</th>
                    <th onClick={() => handleSort('totalLeads')} style={{ ...thStyle, textAlign: 'right' }}>Leads</th>
                    <th onClick={() => handleSort('wins')} style={{ ...thStyle, textAlign: 'right' }}>Wins</th>
                    <th onClick={() => handleSort('conversionRate')} style={{ ...thStyle, textAlign: 'right' }}>Conv Rate</th>
                    <th onClick={() => handleSort('lift')} style={{ ...thStyle, textAlign: 'right' }}>Lift</th>
                    <th style={{ ...thStyle, textAlign: 'center', cursor: 'default' }}>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSignals.map((sig, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600 }}>{sig.factor}</td>
                      <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>{sig.segmentValue}</td>
                      <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right', color: 'var(--text-secondary)' }}>{sig.totalLeads}</td>
                      <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right', color: 'var(--text-secondary)' }}>{sig.wins}</td>
                      <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right', fontWeight: 600 }}>{sig.conversionRate}%</td>
                      <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: 700,
                          background: sig.lift >= 1.5 ? 'var(--accent-green-dim)' : sig.lift >= 0.8 ? 'rgba(90,112,153,0.2)' : 'var(--accent-red-dim)',
                          color: sig.lift >= 1.5 ? 'var(--accent-green)' : sig.lift >= 0.8 ? 'var(--text-secondary)' : 'var(--accent-red)',
                        }}>
                          {sig.lift}x
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 600,
                          background: sig.confidence === 'High' ? 'var(--accent-green-dim)' : sig.confidence === 'Medium' ? 'var(--accent-yellow-dim)' : 'var(--accent-red-dim)',
                          color: sig.confidence === 'High' ? 'var(--accent-green)' : sig.confidence === 'Medium' ? 'var(--accent-yellow)' : 'var(--accent-red)',
                        }}>
                          {sig.confidence}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'heatmap' && (
          <div>
            <h3 style={{ fontSize: 18, marginBottom: 8 }}>Segment x Channel Conversion Heatmap</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Hover over cells for detailed metrics. Darker blue = higher conversion rate.
            </p>
            <HeatmapView data={result.segmentChannelHeatmap} mode="conversion" />
          </div>
        )}

        {activeTab === 'velocity' && (
          <div>
            <h3 style={{ fontSize: 18, marginBottom: 8 }}>Revenue Velocity Heatmap ($/day)</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Revenue velocity = deal size / days to close. Reframes value when factoring time.
            </p>
            <HeatmapView data={result.revenueVelocityHeatmap} mode="velocity" />
          </div>
        )}
      </div>
    </div>
  );
};
