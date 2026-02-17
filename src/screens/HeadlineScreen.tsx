import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AnalysisResult } from '../types';

interface HeadlineScreenProps {
  result: AnalysisResult;
}

function formatCurrency(n: number): string {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
}

function AnimatedNumber({ value, prefix = '', suffix = '', duration = 1500 }: { value: number; prefix?: string; suffix?: string; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      start = Math.round(value * eased);
      setDisplay(start);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  const formatted = display >= 1e6
    ? `${(display / 1e6).toFixed(1)}M`
    : display >= 1e3
    ? `${(display / 1e3).toFixed(0)}K`
    : display.toLocaleString();

  return <span>{prefix}{formatted}{suffix}</span>;
}

export const HeadlineScreen: React.FC<HeadlineScreenProps> = ({ result }) => {
  const barData = [
    { name: 'Current', value: result.currentAnnualRevenue, rate: result.currentConversionRate },
    { name: 'Possible', value: result.possibleAnnualRevenue, rate: result.possibleConversionRate },
  ];

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '48px 32px' }}>
      {/* Three big numbers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginBottom: 48 }}>
        {/* Current */}
        <div className="slide-up" style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-xl)',
          padding: '40px 32px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>
            Current Performance
          </div>
          <div style={{ fontSize: 20, color: 'var(--text-secondary)', marginBottom: 4 }}>
            {(result.currentConversionRate * 100).toFixed(1)}% conversion
          </div>
          <div style={{ fontSize: 52, fontWeight: 900, fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)' }}>
            <AnimatedNumber value={result.currentAnnualRevenue} prefix="$" />
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>/year</div>
        </div>

        {/* Possible */}
        <div className="slide-up" style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--accent-blue)',
          borderRadius: 'var(--radius-xl)',
          padding: '40px 32px',
          textAlign: 'center',
          boxShadow: 'var(--shadow-glow)',
          animationDelay: '0.1s',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>
            Possible
          </div>
          <div style={{ fontSize: 20, color: 'var(--text-secondary)', marginBottom: 4 }}>
            {(result.possibleConversionRate * 100).toFixed(1)}% conversion
          </div>
          <div style={{ fontSize: 52, fontWeight: 900, fontFamily: 'Outfit, sans-serif', color: 'var(--accent-blue)' }}>
            <AnimatedNumber value={result.possibleAnnualRevenue} prefix="$" />
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>/year</div>
        </div>

        {/* Gap */}
        <div className="slide-up" style={{
          background: 'linear-gradient(135deg, rgba(30, 144, 255, 0.1), rgba(0, 214, 143, 0.1))',
          border: '1px solid var(--accent-green)',
          borderRadius: 'var(--radius-xl)',
          padding: '40px 32px',
          textAlign: 'center',
          boxShadow: '0 0 60px rgba(0, 214, 143, 0.15)',
          animationDelay: '0.2s',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>
            Revenue Gap
          </div>
          <div style={{ fontSize: 20, color: 'var(--text-secondary)', marginBottom: 4 }}>
            left on the table
          </div>
          <div style={{
            fontSize: 60,
            fontWeight: 900,
            fontFamily: 'Outfit, sans-serif',
            color: 'var(--accent-green)',
            textShadow: '0 0 40px rgba(0, 214, 143, 0.4)',
          }}>
            <AnimatedNumber value={result.revenueGap} prefix="$" />
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>/year</div>
        </div>
      </div>

      {/* Bar comparison */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: 32,
        marginBottom: 32,
      }}>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} layout="vertical" barSize={40}>
              <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} stroke="#5A7099" fontSize={12} />
              <YAxis type="category" dataKey="name" stroke="#5A7099" fontSize={14} width={80} />
              <Tooltip
                formatter={(value: any) => formatCurrency(value)}
                contentStyle={{
                  background: '#131F35',
                  border: '1px solid #1E3050',
                  borderRadius: 8,
                  color: '#fff',
                }}
              />
              <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                <Cell fill="#5A7099" />
                <Cell fill="#1E90FF" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p style={{
          textAlign: 'center',
          color: 'var(--text-secondary)',
          fontSize: 15,
          marginTop: 16,
          lineHeight: 1.6,
        }}>
          Based on {result.totalLeads.toLocaleString()} leads analyzed over {Math.round(
            (new Date(result.dateRange.end).getTime() - new Date(result.dateRange.start).getTime()) / (30.44 * 24 * 60 * 60 * 1000)
          )} months, your scoring model is misallocating pipeline. Here's why.
        </p>
      </div>

      {/* Supporting stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { label: 'Total Leads', value: result.totalLeads.toLocaleString() },
          { label: 'Date Range', value: `${result.dateRange.start} to ${result.dateRange.end}` },
          { label: 'Avg Deal Size', value: formatCurrency(result.avgDealSize) },
          { label: 'Avg Sales Cycle', value: `${Math.round(result.avgSalesCycle)} days` },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
              {stat.label}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
