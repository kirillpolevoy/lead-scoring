import React, { useState } from 'react';
import {
  LineChart, Line, Bar, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { AnalysisResult } from '../types';

interface TrendsScreenProps {
  result: AnalysisResult;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div style={{
      background: '#131F35',
      border: '1px solid #1E3050',
      borderRadius: 8,
      padding: '12px 16px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
    }}>
      <p style={{ color: '#8B9FC0', fontSize: 12, marginBottom: 8 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color, fontSize: 13, fontWeight: 600 }}>
          {p.name}: {typeof p.value === 'number' && p.name.includes('$') ? `$${p.value.toLocaleString()}` : p.value}
          {p.name.includes('Rate') ? '%' : ''}
        </p>
      ))}
    </div>
  );
};

export const TrendsScreen: React.FC<TrendsScreenProps> = ({ result }) => {
  const [activeTab, setActiveTab] = useState<'conversion' | 'velocity' | 'mix'>('conversion');

  // Generate insight
  const trends = result.monthlyTrends;
  const firstThree = trends.slice(0, 3);
  const lastThree = trends.slice(-3);
  const earlyRate = firstThree.reduce((s, t) => s + t.conversionRate, 0) / firstThree.length;
  const lateRate = lastThree.reduce((s, t) => s + t.conversionRate, 0) / lastThree.length;
  const rateChange = Math.round(((lateRate - earlyRate) / earlyRate) * 100);
  const earlyVol = firstThree.reduce((s, t) => s + t.leadVolume, 0) / firstThree.length;
  const lateVol = lastThree.reduce((s, t) => s + t.leadVolume, 0) / lastThree.length;
  const volChange = Math.round(((lateVol - earlyVol) / earlyVol) * 100);

  const channelColors = [
    '#1E90FF', '#00D68F', '#FFB800', '#FF4C6A', '#A855F7',
    '#FF6B35', '#06B6D4', '#EC4899', '#84CC16', '#F97316'
  ];

  const channelKeys = Object.keys(result.channelMixTrend[0] || {}).filter(k => k !== 'month');

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

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '48px 32px' }}>
      <h2 style={{ fontSize: 32, marginBottom: 8 }}>What's Happening Over Time</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 32 }}>
        Trend analysis reveals whether your pipeline quality is improving or decaying.
      </p>

      {/* Insight callout */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 144, 255, 0.08), rgba(255, 76, 106, 0.08))',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        marginBottom: 32,
        borderLeft: '4px solid var(--accent-blue)',
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-blue)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
          Key Insight
        </div>
        <p style={{ fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.7 }}>
          {rateChange < 0
            ? `Your conversion rate has declined ${Math.abs(rateChange)}% over the analysis period${volChange > 0 ? ` while lead volume increased ${volChange}%` : ''}. This suggests you're scaling channels that generate volume but not quality.`
            : `Your conversion rate has improved ${rateChange}% over the analysis period. ${volChange > 0 ? `Lead volume also increased ${volChange}%, indicating healthy growth.` : 'However, lead volume has decreased.'}`
          }
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button onClick={() => setActiveTab('conversion')} style={tabStyle(activeTab === 'conversion')}>
          Conversion Rate Trend
        </button>
        <button onClick={() => setActiveTab('velocity')} style={tabStyle(activeTab === 'velocity')}>
          Revenue Velocity
        </button>
        <button onClick={() => setActiveTab('mix')} style={tabStyle(activeTab === 'mix')}>
          Channel Mix Shift
        </button>
      </div>

      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: 32,
      }}>
        {activeTab === 'conversion' && (
          <div>
            <h3 style={{ fontSize: 18, marginBottom: 24 }}>Monthly Conversion Rate &amp; Lead Volume</h3>
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E3050" />
                  <XAxis dataKey="month" stroke="#5A7099" fontSize={12} />
                  <YAxis yAxisId="left" stroke="#1E90FF" fontSize={12} tickFormatter={v => `${v}%`} />
                  <YAxis yAxisId="right" orientation="right" stroke="#5A7099" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar yAxisId="right" dataKey="leadVolume" fill="rgba(30,144,255,0.15)" name="Lead Volume" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="left" type="monotone" dataKey="conversionRate" stroke="#1E90FF" strokeWidth={3} dot={{ r: 5, fill: '#1E90FF' }} name="Conversion Rate" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'velocity' && (
          <div>
            <h3 style={{ fontSize: 18, marginBottom: 24 }}>Revenue Velocity (Avg Deal Size / Days to Close)</h3>
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E3050" />
                  <XAxis dataKey="month" stroke="#5A7099" fontSize={12} />
                  <YAxis yAxisId="left" stroke="#00D68F" fontSize={12} tickFormatter={v => `$${v}`} />
                  <YAxis yAxisId="right" orientation="right" stroke="#FFB800" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="revenueVelocity" stroke="#00D68F" strokeWidth={3} dot={{ r: 5, fill: '#00D68F' }} name="Revenue Velocity ($/day)" />
                  <Line yAxisId="right" type="monotone" dataKey="avgDaysToClose" stroke="#FFB800" strokeWidth={2} dot={{ r: 4, fill: '#FFB800' }} name="Avg Days to Close" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'mix' && (
          <div>
            <h3 style={{ fontSize: 18, marginBottom: 24 }}>Lead Source Mix Over Time</h3>
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={result.channelMixTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E3050" />
                  <XAxis dataKey="month" stroke="#5A7099" fontSize={12} />
                  <YAxis stroke="#5A7099" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  {channelKeys.map((key, i) => (
                    <Area
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stackId="1"
                      fill={channelColors[i % channelColors.length]}
                      stroke={channelColors[i % channelColors.length]}
                      fillOpacity={0.6}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
