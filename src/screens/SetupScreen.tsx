import React, { useCallback, useState, useRef } from 'react';
import Papa from 'papaparse';
import { Lead, BusinessParams, ScoringWeight } from '../types';
import { generateDummyData, getDefaultColumnMapping } from '../utils/dummyData';

interface SetupScreenProps {
  onRunAnalysis: (leads: Lead[], params: BusinessParams) => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ onRunAnalysis }) => {
  const [rawData, setRawData] = useState<Record<string, string>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [avgDealSize, setAvgDealSize] = useState<string>('');
  const [monthlyVolume, setMonthlyVolume] = useState<string>('');
  const [hasWeights, setHasWeights] = useState(true);
  const [weights, setWeights] = useState<ScoringWeight[]>([
    { factor: 'Webinar Attendance', points: 15 },
    { factor: 'Content Downloads', points: 12 },
    { factor: 'Demo Request', points: 25 },
    { factor: 'Pricing Page Views', points: 10 },
    { factor: 'Case Study Views', points: 5 },
    { factor: 'Email Engagement', points: 8 },
  ]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processCSV = useCallback((text: string, name: string) => {
    const result = Papa.parse(text, { header: true, skipEmptyLines: true });
    if (result.data && result.data.length > 0) {
      const data = result.data as Record<string, string>[];
      setRawData(data);
      setColumns(result.meta.fields || []);
      setFileName(name);

      // Auto-detect column mapping
      const fields = result.meta.fields || [];
      const autoMap: Record<string, string> = {};
      const lower = fields.map(f => f.toLowerCase());

      const mappingHints: Record<string, string[]> = {
        outcome: ['outcome', 'result', 'status', 'won', 'converted'],
        leadCreatedDate: ['leadcreateddate', 'created', 'lead_date', 'create_date', 'date_created'],
        outcomeDate: ['outcomedate', 'close_date', 'closed', 'outcome_date', 'date_closed'],
        dealSize: ['dealsize', 'deal_size', 'value', 'amount', 'revenue', 'deal_value'],
        segment: ['segment', 'industry', 'vertical', 'category'],
        subVertical: ['subvertical', 'sub_vertical', 'subcategory', 'sub_category', 'specialty'],
        leadSource: ['leadsource', 'lead_source', 'source', 'channel', 'attribution'],
        geography: ['geography', 'geo', 'state', 'region', 'location'],
        companySize: ['employeecount', 'employee_count', 'employees', 'company_size', 'size'],
      };

      Object.entries(mappingHints).forEach(([key, hints]) => {
        const idx = lower.findIndex(l => hints.some(h => l.replace(/[_\s]/g, '').includes(h.replace(/[_\s]/g, ''))));
        if (idx >= 0) autoMap[key] = fields[idx];
      });

      setMapping(autoMap);

      // Auto-fill monthly volume
      const dateCol = autoMap.leadCreatedDate;
      if (dateCol) {
        const dates = data.map(r => r[dateCol]).filter(Boolean);
        if (dates.length > 0) {
          const sorted = dates.sort();
          const start = new Date(sorted[0]);
          const end = new Date(sorted[sorted.length - 1]);
          const months = Math.max(1, (end.getTime() - start.getTime()) / (30.44 * 24 * 60 * 60 * 1000));
          setMonthlyVolume(String(Math.round(data.length / months)));
        }
      }

      // Auto-fill avg deal size
      const dealCol = autoMap.dealSize;
      if (dealCol) {
        const values = data.map(r => parseFloat(r[dealCol])).filter(v => !isNaN(v) && v > 0);
        if (values.length > 0) {
          setAvgDealSize(String(Math.round(values.reduce((a, b) => a + b, 0) / values.length)));
        }
      }
    }
  }, []);

  const handleFileUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      processCSV(text, file.name);
    };
    reader.readAsText(file);
  }, [processCSV]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const loadSampleData = useCallback(() => {
    const leads = generateDummyData(2000);
    const defaultMapping = getDefaultColumnMapping();
    const cols = Object.keys(leads[0]);
    const data = leads.map(l => {
      const row: Record<string, string> = {};
      cols.forEach(c => {
        const val = l[c];
        row[c] = typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val);
      });
      return row;
    });
    setRawData(data);
    setColumns(cols);
    setFileName('sample_leads_2000.csv');
    setMapping(defaultMapping);
    setAvgDealSize('8500');
    setMonthlyVolume('167');
  }, []);

  const handleRunAnalysis = () => {
    // Convert raw data back to Lead objects using mapping
    const leads: Lead[] = rawData.map((row, i) => ({
      id: row.id || `LEAD-${i}`,
      leadCreatedDate: row[mapping.leadCreatedDate] || '',
      outcomeDate: row[mapping.outcomeDate] || '',
      outcome: (row[mapping.outcome] as 'Won' | 'Lost' | 'Disqualified') || 'Lost',
      segment: row[mapping.segment] || 'Unknown',
      subVertical: row[mapping.subVertical] || 'Unknown',
      leadSource: row[mapping.leadSource] || 'Unknown',
      geography: row[mapping.geography] || 'Unknown',
      dealSize: parseFloat(row[mapping.dealSize]) || parseFloat(avgDealSize) || 0,
      companyRevenue: row[mapping.companySize] || row.companyRevenue || 'Unknown',
      employeeCount: row[mapping.companySize] || row.employeeCount || 'Unknown',
      locations: row.locations || '1',
      pricingPageViews: parseInt(row.pricingPageViews) || 0,
      caseStudyPageViews: parseInt(row.caseStudyPageViews) || 0,
      demoRequest: row.demoRequest === 'Yes' || row.demoRequest === 'true',
      chatEngaged: row.chatEngaged === 'Yes' || row.chatEngaged === 'true',
      contentDownloads: parseInt(row.contentDownloads) || 0,
      webinarAttended: row.webinarAttended === 'Yes' || row.webinarAttended === 'true',
      emailClicks: parseInt(row.emailClicks) || 0,
      returnVisits: parseInt(row.returnVisits) || 0,
    }));

    const params: BusinessParams = {
      avgDealSize: parseFloat(avgDealSize) || 8500,
      monthlyLeadVolume: parseInt(monthlyVolume) || Math.round(leads.length / 12),
      currentWeights: hasWeights ? weights : [],
      hasCurrentWeights: hasWeights,
    };

    onRunAnalysis(leads, params);
  };

  const canRun = rawData.length > 0 && mapping.outcome && mapping.leadCreatedDate && mapping.outcomeDate && mapping.segment && mapping.leadSource;

  const addWeight = () => setWeights([...weights, { factor: '', points: 10 }]);
  const removeWeight = (i: number) => setWeights(weights.filter((_, idx) => idx !== i));
  const updateWeight = (i: number, field: 'factor' | 'points', value: string | number) => {
    const updated = [...weights];
    if (field === 'factor') updated[i].factor = value as string;
    else updated[i].points = value as number;
    setWeights(updated);
  };

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontSize: 14,
  };

  const inputStyle: React.CSSProperties = {
    ...selectStyle,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: 6,
    display: 'block',
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '48px 32px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h1 style={{
          fontSize: 48,
          fontWeight: 900,
          letterSpacing: '-1px',
          marginBottom: 12,
          background: 'linear-gradient(135deg, #FFFFFF 0%, #8B9FC0 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          LeadLens
        </h1>
        <p style={{ fontSize: 18, color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto' }}>
          Evidence-based lead scoring audit. Upload your CRM data and discover where you're leaving revenue on the table.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>
        {/* Left: CSV Upload */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: 28,
        }}>
          <h3 style={{ fontSize: 18, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--accent-blue)' }}>01</span> Data Source
          </h3>

          {/* Drop zone */}
          {rawData.length === 0 ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragging ? 'var(--accent-blue)' : 'var(--border-light)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '48px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                background: isDragging ? 'var(--accent-blue-dim)' : 'var(--bg-input)',
                transition: 'all 0.2s ease',
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>&#8593;</div>
              <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Drop your CSV here</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>or click to browse</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              />
            </div>
          ) : (
            <div style={{ marginBottom: 16 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'var(--accent-blue-dim)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 16,
              }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-blue)' }}>
                  {fileName} ({rawData.length.toLocaleString()} rows)
                </span>
                <button
                  onClick={() => { setRawData([]); setColumns([]); setFileName(''); setMapping({}); }}
                  style={{ background: 'none', color: 'var(--text-muted)', fontSize: 13, padding: '2px 8px' }}
                >
                  Remove
                </button>
              </div>

              {/* Preview table */}
              <div style={{ overflowX: 'auto', marginBottom: 20, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      {columns.slice(0, 8).map(col => (
                        <th key={col} style={{
                          padding: '8px 10px',
                          textAlign: 'left',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-secondary)',
                          fontWeight: 600,
                          borderBottom: '1px solid var(--border-color)',
                          whiteSpace: 'nowrap',
                        }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rawData.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        {columns.slice(0, 8).map(col => (
                          <td key={col} style={{
                            padding: '6px 10px',
                            borderBottom: '1px solid var(--border-color)',
                            color: 'var(--text-secondary)',
                            whiteSpace: 'nowrap',
                          }}>
                            {row[col]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Column mapping */}
              <h4 style={{ fontSize: 14, marginBottom: 12, color: 'var(--text-secondary)' }}>Column Mapping</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { key: 'outcome', label: 'Outcome *', hint: 'Won/Lost/Disqualified' },
                  { key: 'leadCreatedDate', label: 'Lead Created Date *' },
                  { key: 'outcomeDate', label: 'Outcome Date *' },
                  { key: 'dealSize', label: 'Deal Size' },
                  { key: 'segment', label: 'Segment *', hint: 'e.g., Home Services, Legal' },
                  { key: 'subVertical', label: 'Sub-Vertical' },
                  { key: 'leadSource', label: 'Lead Source *' },
                  { key: 'geography', label: 'Geography' },
                  { key: 'companySize', label: 'Company Size' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label style={labelStyle}>{label}</label>
                    <select
                      value={mapping[key] || ''}
                      onChange={(e) => setMapping({ ...mapping, [key]: e.target.value })}
                      style={selectStyle}
                    >
                      <option value="">— Select —</option>
                      {columns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sample data button */}
          <button
            onClick={loadSampleData}
            style={{
              width: '100%',
              padding: '12px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--accent-blue)',
              fontWeight: 600,
              fontSize: 14,
              marginTop: rawData.length === 0 ? 0 : 8,
            }}
          >
            Load Sample Data (2,000 leads)
          </button>
        </div>

        {/* Right: Business Parameters */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: 28,
        }}>
          <h3 style={{ fontSize: 18, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--accent-blue)' }}>02</span> Business Parameters
          </h3>

          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={labelStyle}>Average Deal Size ($)</label>
              <input
                type="number"
                value={avgDealSize}
                onChange={(e) => setAvgDealSize(e.target.value)}
                placeholder="e.g., 8500"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Monthly Lead Volume</label>
              <input
                type="number"
                value={monthlyVolume}
                onChange={(e) => setMonthlyVolume(e.target.value)}
                placeholder="Auto-calculated from date range"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Current scoring weights */}
          <div style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h4 style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Current Scoring Weights</h4>
              <button
                onClick={() => setHasWeights(!hasWeights)}
                style={{
                  padding: '4px 12px',
                  background: hasWeights ? 'var(--accent-blue-dim)' : 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: hasWeights ? 'var(--accent-blue)' : 'var(--text-muted)',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {hasWeights ? 'Has Weights' : 'Skip Weights'}
              </button>
            </div>

            {hasWeights && (
              <div>
                {weights.map((w, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input
                      value={w.factor}
                      onChange={(e) => updateWeight(i, 'factor', e.target.value)}
                      placeholder="Factor name"
                      style={{ ...inputStyle, flex: 2 }}
                    />
                    <input
                      type="number"
                      value={w.points}
                      onChange={(e) => updateWeight(i, 'points', parseInt(e.target.value) || 0)}
                      placeholder="Points"
                      style={{ ...inputStyle, flex: 0.5, textAlign: 'center' }}
                    />
                    <button
                      onClick={() => removeWeight(i)}
                      style={{
                        background: 'var(--accent-red-dim)',
                        color: 'var(--accent-red)',
                        borderRadius: 'var(--radius-sm)',
                        width: 36,
                        fontSize: 16,
                        border: 'none',
                      }}
                    >
                      &times;
                    </button>
                  </div>
                ))}
                <button
                  onClick={addWeight}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'var(--bg-input)',
                    border: '1px dashed var(--border-light)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-muted)',
                    fontSize: 13,
                  }}
                >
                  + Add Weight
                </button>
              </div>
            )}
          </div>

          {/* Run Analysis button */}
          <button
            onClick={handleRunAnalysis}
            disabled={!canRun}
            style={{
              width: '100%',
              marginTop: 32,
              padding: '16px',
              background: canRun ? 'var(--gradient-blue)' : 'var(--bg-input)',
              color: canRun ? 'white' : 'var(--text-muted)',
              fontSize: 16,
              fontWeight: 700,
              borderRadius: 'var(--radius-md)',
              border: 'none',
              boxShadow: canRun ? '0 4px 20px rgba(30, 144, 255, 0.4)' : 'none',
              cursor: canRun ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
            }}
          >
            Run Analysis
          </button>
        </div>
      </div>
    </div>
  );
};
