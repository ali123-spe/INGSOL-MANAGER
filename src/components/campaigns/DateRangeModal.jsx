// src/components/campaigns/DateRangeModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Calendar, Palette } from 'lucide-react';

const COLOR_OPTIONS = [
  { label: 'INGSOL Blue',  value: '#024791' },
  { label: 'Navy',         value: '#1e293b' },
  { label: 'Teal',         value: '#0d9488' },
  { label: 'Amber',        value: '#d97706' },
  { label: 'Red',          value: '#dc2626' },
  { label: 'Violet',       value: '#7c3aed' },
  { label: 'Slate',        value: '#64748b' },
  { label: 'Emerald',      value: '#059669' },
];

export default function DateRangeModal({ range, onClose, onSave }) {
  const isEdit = !!range;

  const [name, setName]               = useState(range?.name || '');
  const [startDate, setStartDate]     = useState(range?.start_date || '');
  const [endDate, setEndDate]         = useState(range?.end_date || '');
  const [description, setDescription] = useState(range?.description || '');
  const [color, setColor]             = useState(range?.color || '#024791');
  const [errors, setErrors]           = useState({});
  const [isSaving, setIsSaving]       = useState(false);

  // Trap keyboard Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const validate = () => {
    const errs = {};
    if (!name.trim())      errs.name      = 'Range name is required.';
    if (!startDate)        errs.startDate = 'Start date is required.';
    if (!endDate)          errs.endDate   = 'End date is required.';
    if (startDate && endDate && endDate < startDate)
      errs.endDate = 'End date cannot be before start date.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || isSaving) return;
    setIsSaving(true);
    try {
      await onSave({ name: name.trim(), start_date: startDate, end_date: endDate, description: description.trim(), color });
      onClose();
    } catch (err) {
      setErrors({ submit: err.message || 'Failed to save. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container physical-sheet-modal"
        style={{ maxWidth: 520 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-staple-accent" />

        <div className="modal-header paper-sheet-header">
          <div className="modal-header-text">
            <span className="sheet-kicker">DATE RANGE</span>
            <h2 className="modal-title">{isEdit ? 'Edit Campaign' : 'Create Date Range'}</h2>
          </div>
          <button className="modal-close tactile-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body paper-sheet-body">
            <div className="form-grid">

              {/* Name */}
              <div className="form-group full-width">
                <label>Range Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`input-field-tactile ${errors.name ? 'error' : ''}`}
                  placeholder="e.g. Industrial Automation Campaign"
                  autoFocus
                />
                {errors.name && <div className="error-message">{errors.name}</div>}
              </div>

              {/* Start Date */}
              <div className="form-group">
                <label>Start Date *</label>
                <div className="input-with-icon">
                  <Calendar size={15} className="input-prefix-icon" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={`input-field-tactile ${errors.startDate ? 'error' : ''}`}
                  />
                </div>
                {errors.startDate && <div className="error-message">{errors.startDate}</div>}
              </div>

              {/* End Date */}
              <div className="form-group">
                <label>End Date *</label>
                <div className="input-with-icon">
                  <Calendar size={15} className="input-prefix-icon" />
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={`input-field-tactile ${errors.endDate ? 'error' : ''}`}
                  />
                </div>
                {errors.endDate && <div className="error-message">{errors.endDate}</div>}
              </div>

              {/* Description */}
              <div className="form-group full-width">
                <label>Description <span style={{ fontWeight: 400, color: 'var(--paper-text-muted)' }}>— Optional</span></label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-field-tactile"
                  placeholder="Campaign goals, target audience, notes..."
                  rows={3}
                />
              </div>

              {/* Color picker */}
              <div className="form-group full-width">
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Palette size={14} /> Campaign Color
                </label>
                <div className="color-swatch-row">
                  {COLOR_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      title={opt.label}
                      onClick={() => setColor(opt.value)}
                      className={`color-swatch-btn ${color === opt.value ? 'selected' : ''}`}
                      style={{ '--swatch-color': opt.value }}
                    />
                  ))}
                </div>
                <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--paper-text-muted)' }}>
                  Selected: <strong style={{ color }}>{COLOR_OPTIONS.find(o => o.value === color)?.label}</strong>
                </div>
              </div>

              {errors.submit && (
                <div className="form-group full-width">
                  <div className="error-message" style={{ padding: '8px 12px', background: '#fef2f2', borderRadius: 'var(--radius-sm)', border: '1px solid #fecaca' }}>
                    {errors.submit}
                  </div>
                </div>
              )}

            </div>
          </div>

          <div className="modal-footer paper-sheet-footer">
            <button type="button" className="btn btn-secondary tactile-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary tactile-action-btn"
              disabled={isSaving}
            >
              {isSaving ? 'Saving…' : isEdit ? 'Update Range' : 'Create Range'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
