import React, { useCallback, useRef } from 'react';
import { AnalysisResult } from '../types';

interface RecommendationsScreenProps {
  result: AnalysisResult;
}

function formatCurrency(n: number): string {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
}

export const RecommendationsScreen: React.FC<RecommendationsScreenProps> = ({ result }) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const { recommendations } = result;

  const downloadPDF = useCallback(async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      if (!reportRef.current) return;

      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#0A1628',
        scale: 2,
        logging: false,
        useCORS: true,
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF('p', 'mm', 'a4');

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save('LeadLens-Analysis.pdf');
    } catch (err) {
      console.error('PDF generation error:', err);
    }
  }, []);

  const downloadScoringCSV = useCallback(() => {
    const headers = ['Factor', 'Segment', 'Category', 'Points', 'Lift'];
    const rows = result.scoringCard.map(c =>
      [c.factor, c.segment, c.category, c.points, c.lift].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    downloadFile(csv, 'LeadLens-ScoringModel.csv', 'text/csv');
  }, [result]);

  const downloadFullCSV = useCallback(() => {
    // Export signal strength data
    const headers = ['Factor', 'Segment Value', 'Total Leads', 'Wins', 'Conversion Rate', 'Lift', 'Confidence'];
    const rows = result.signalStrength.map(s =>
      [s.factor, s.segmentValue, s.totalLeads, s.wins, s.conversionRate, s.lift, s.confidence].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    downloadFile(csv, 'LeadLens-FullAnalysis.csv', 'text/csv');
  }, [result]);

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-lg)',
    padding: 20,
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '48px 32px' }}>
      <div ref={reportRef}>
        <h2 style={{ fontSize: 32, marginBottom: 8 }}>What to Do</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 40 }}>
          Executive-ready recommendations based on the full analysis.
        </p>

        {/* Push Harder */}
        <div style={{ marginBottom: 40 }}>
          <h3 style={{ fontSize: 20, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--accent-green)' }}>&#9650;</span> Where to Push Harder
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>
            Top segment x channel combinations by revenue potential
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {recommendations.pushHarder.map((rec, i) => (
              <div key={i} style={{
                ...cardStyle,
                borderTop: '3px solid var(--accent-green)',
              }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
                  {rec.segment}
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> via </span>
                  {rec.channel}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Conversion</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-green)' }}>{rec.conversionRate}%</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Lift</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{rec.lift}x</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Avg Deal</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{formatCurrency(rec.avgDealSize)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Revenue Velocity</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>${rec.revenueVelocity}/day</div>
                  </div>
                </div>
                <div style={{
                  padding: '10px 12px',
                  background: 'var(--accent-green-dim)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12,
                  color: 'var(--accent-green)',
                  fontWeight: 600,
                  textAlign: 'center',
                }}>
                  {formatCurrency(rec.annualRevenuePotential)} annual potential
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 12, lineHeight: 1.6 }}>
                  {rec.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Pull Back */}
        <div style={{ marginBottom: 40 }}>
          <h3 style={{ fontSize: 20, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--accent-red)' }}>&#9660;</span> Where to Pull Back
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>
            Lowest-performing combinations draining budget
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {recommendations.pullBack.map((rec, i) => (
              <div key={i} style={{
                ...cardStyle,
                borderTop: '3px solid var(--accent-red)',
              }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
                  {rec.segment}
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> via </span>
                  {rec.channel}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Conversion</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-red)' }}>{rec.conversionRate}%</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Lift</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{rec.lift}x</div>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {rec.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Actions */}
        <div style={{ marginBottom: 40 }}>
          <h3 style={{ fontSize: 20, marginBottom: 16 }}>Recommended Actions</h3>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: 24,
          }}>
            {recommendations.actions.map((action, i) => (
              <div key={i} style={{
                display: 'flex',
                gap: 16,
                padding: '16px 0',
                borderBottom: i < recommendations.actions.length - 1 ? '1px solid var(--border-color)' : 'none',
                alignItems: 'flex-start',
              }}>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'var(--accent-blue-dim)',
                  color: 'var(--accent-blue)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {i + 1}
                </div>
                <p style={{ fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.7, flex: 1 }}>
                  {action}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Export section */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: 32,
        textAlign: 'center',
      }}>
        <h3 style={{ fontSize: 20, marginBottom: 8 }}>Export Your Analysis</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
          Share these findings with your team
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={downloadPDF}
            style={{
              padding: '14px 28px',
              background: 'var(--gradient-blue)',
              color: 'white',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              fontWeight: 600,
              fontSize: 15,
              boxShadow: '0 4px 20px rgba(30, 144, 255, 0.3)',
            }}
          >
            Download PDF Summary
          </button>
          <button
            onClick={downloadScoringCSV}
            style={{
              padding: '14px 28px',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            Download Scoring Model (CSV)
          </button>
          <button
            onClick={downloadFullCSV}
            style={{
              padding: '14px 28px',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            Download Full Analysis (CSV)
          </button>
        </div>
      </div>
    </div>
  );
};
