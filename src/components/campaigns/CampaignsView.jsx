// src/components/campaigns/CampaignsView.jsx
import React from 'react';
import { Plus, FolderOpen, Calendar, ChevronRight, Layers } from 'lucide-react';
import { getUserRanges } from '../../services/campaigns';

function fmtDate(d) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

function daysSpan(start, end) {
  if (!start || !end) return '';
  const diff = Math.round((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));
  return `${diff + 1} day${diff === 0 ? '' : 's'}`;
}

const STATUS_COLORS = {
  'Planned': '#64748b', 'In Progress': '#d97706', 'Completed': '#059669',
  'Overdue': '#dc2626', 'Archived': '#94a3b8'
};

export default function CampaignsView({
  allPosts,
  allContent = [],
  onOpenCampaign,
  onCreateCampaign,
  onEditCampaign,
  onDeleteCampaign,
  // Legacy compat
  dateRanges: externalRanges
}) {
  // Ranges now come from App.jsx via parent context — if passed directly, use them
  // Otherwise prompt user to use the external dateRanges from App state
  // CampaignsView receives dateRanges from App via the parent route render
  // For now we'll use internal Supabase loading as fallback
  const [ranges, setRanges] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const load = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getUserRanges();
      setRanges(data);
    } catch (err) {
      setError(err.message || 'Failed to load campaigns.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  // Refresh after external delete
  React.useEffect(() => {
    if (externalRanges) setRanges(externalRanges);
  }, [externalRanges]);

  return (
    <div className="campaigns-view-container">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="campaigns-view-header">
        <div>
          <h2 className="campaigns-view-title">Campaigns</h2>
          <p className="campaigns-view-subtitle">
            Larger tracked work items with date ranges and multiple deliverables.
          </p>
        </div>
        <button
          className="btn btn-primary tactile-action-btn"
          onClick={onCreateCampaign}
        >
          <Plus size={16} /> Create Campaign
        </button>
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="empty-state">
          <div className="spinner" style={{ width: 28, height: 28, border: '3px solid var(--paper-border)', borderTopColor: 'var(--ingsol-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div className="empty-state-text">Loading campaigns…</div>
        </div>
      ) : error ? (
        <div className="empty-state">
          <div className="empty-state-title" style={{ color: '#dc2626' }}>Error</div>
          <div className="empty-state-text">{error}</div>
          <button className="btn btn-secondary tactile-btn" onClick={load}>Retry</button>
        </div>
      ) : ranges.length === 0 ? (
        <div className="empty-state">
          <Layers className="empty-state-icon" style={{ width: 48, height: 48, opacity: 0.3 }} />
          <div className="empty-state-title">No campaigns yet</div>
          <div className="empty-state-text">
            Create your first campaign to organise work by date range, add deliverables, attachments and reference links.
          </div>
          <button className="btn btn-primary tactile-action-btn" onClick={onCreateCampaign}>
            <Plus size={14} /> Create Campaign
          </button>
        </div>
      ) : (
        <div className="campaigns-grid">
          {ranges.map(range => {
            const statusColor = STATUS_COLORS[range.status] || '#64748b';
            const linkedCount = allContent.length; // simplified — could filter by campaign
            return (
              <button
                key={range.id}
                className="campaign-card"
                onClick={() => onOpenCampaign && onOpenCampaign(range)}
              >
                <div className="campaign-card-accent" style={{ backgroundColor: range.color || '#024791' }} />
                <div className="campaign-card-body">
                  <div className="campaign-card-name">{range.name}</div>
                  <div className="campaign-card-dates">
                    <Calendar size={12} />
                    {fmtDate(range.start_date)} — {fmtDate(range.end_date)}
                    <span className="campaign-card-span-badge">{daysSpan(range.start_date, range.end_date)}</span>
                  </div>
                  {range.description && (
                    <div className="campaign-card-description">{range.description}</div>
                  )}
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center',
                      padding: '2px 8px', borderRadius: 12, fontSize: '0.68rem', fontWeight: 700,
                      backgroundColor: statusColor + '18', color: statusColor, border: `1px solid ${statusColor}30`
                    }}>
                      {range.status || 'Planned'}
                    </span>
                    {range.tags?.length > 0 && (
                      <span style={{ fontSize: '0.68rem', color: 'var(--paper-text-muted)' }}>
                        {range.tags.slice(0, 2).join(', ')}{range.tags.length > 2 ? '…' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight size={16} className="campaign-card-chevron" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
