// src/components/campaigns/CampaignsView.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, FolderOpen, Calendar, ChevronRight } from 'lucide-react';
import DateRangeModal from './DateRangeModal';
import CampaignDetailPanel from './CampaignDetailPanel';
import {
  getUserRanges,
  createDateRange,
  updateDateRange,
  deleteDateRange
} from '../../services/campaigns';

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

export default function CampaignsView({ allPosts, onCreateContent }) {
  const [ranges, setRanges]               = useState([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [error, setError]                 = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRange, setEditingRange]   = useState(null);
  const [selectedRange, setSelectedRange] = useState(null);

  const load = useCallback(async () => {
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

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (formData) => {
    const newRange = await createDateRange(formData);
    setRanges(prev => [...prev, newRange].sort((a, b) => a.start_date.localeCompare(b.start_date)));
  };

  const handleUpdate = async (formData) => {
    const updated = await updateDateRange(editingRange.id, formData);
    setRanges(prev => prev.map(r => r.id === updated.id ? updated : r));
    if (selectedRange?.id === updated.id) setSelectedRange(updated);
    setEditingRange(null);
  };

  const handleDelete = async (id) => {
    await deleteDateRange(id);
    setRanges(prev => prev.filter(r => r.id !== id));
    if (selectedRange?.id === id) setSelectedRange(null);
  };

  return (
    <div className="campaigns-view-container">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="campaigns-view-header">
        <div>
          <h2 className="campaigns-view-title">Campaigns & Date Ranges</h2>
          <p className="campaigns-view-subtitle">
            Organise your content by campaign period. Attach files, links, and posts to each range.
          </p>
        </div>
        <button
          className="btn btn-primary tactile-action-btn"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus size={16} /> Create Date Range
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
          <FolderOpen className="empty-state-icon" style={{ width: 48, height: 48, opacity: 0.3 }} />
          <div className="empty-state-title">No campaigns yet</div>
          <div className="empty-state-text">
            Create your first date range to organise campaign assets, files, and scheduled posts.
          </div>
          <button className="btn btn-primary tactile-action-btn" onClick={() => setShowCreateModal(true)}>
            <Plus size={14} /> Create Date Range
          </button>
        </div>
      ) : (
        <div className="campaigns-grid">
          {ranges.map(range => (
            <button
              key={range.id}
              className="campaign-card"
              onClick={() => setSelectedRange(range)}
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
              </div>
              <ChevronRight size={16} className="campaign-card-chevron" />
            </button>
          ))}
        </div>
      )}

      {/* ── Create Modal ────────────────────────────────────────────────── */}
      {showCreateModal && (
        <DateRangeModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreate}
        />
      )}

      {/* ── Edit Modal ──────────────────────────────────────────────────── */}
      {editingRange && (
        <DateRangeModal
          range={editingRange}
          onClose={() => setEditingRange(null)}
          onSave={handleUpdate}
        />
      )}

      {/* ── Detail Panel ────────────────────────────────────────────────── */}
      {selectedRange && (
        <CampaignDetailPanel
          range={selectedRange}
          allPosts={allPosts}
          onClose={() => setSelectedRange(null)}
          onEdit={(r) => { setEditingRange(r); setSelectedRange(null); }}
          onDelete={async (id) => { await handleDelete(id); setSelectedRange(null); }}
          onCreateContent={onCreateContent}
        />
      )}
    </div>
  );
}
