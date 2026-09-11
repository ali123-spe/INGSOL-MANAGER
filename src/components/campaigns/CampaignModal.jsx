// src/components/campaigns/CampaignModal.jsx
// Full campaign creation/edit form with attachments, source URL, notes, tags
import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, Palette, Upload, Trash2, ExternalLink } from 'lucide-react';
import { uploadAttachment, deleteAttachment, getRangeAttachments, getFileCategory } from '../../services/campaigns';
import { detectDesignPlatform } from '../PostModal';

const COLOR_OPTIONS = [
  { label: 'INGSOL Blue', value: '#024791' },
  { label: 'Navy',        value: '#1e293b' },
  { label: 'Teal',        value: '#0d9488' },
  { label: 'Amber',       value: '#d97706' },
  { label: 'Red',         value: '#dc2626' },
  { label: 'Violet',      value: '#7c3aed' },
  { label: 'Slate',       value: '#64748b' },
  { label: 'Emerald',     value: '#059669' },
];

function stripExt(filename) {
  if (!filename) return '';
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.substring(0, lastDot) : filename;
}

function getFileIcon(fileType) {
  const icons = { image: '🖼️', pdf: '📄', doc: '📝', presentation: '📊', spreadsheet: '📈', video: '🎬', other: '📎' };
  return icons[fileType] || icons.other;
}

export default function CampaignModal({ range, onClose, onSave }) {
  const isEdit = !!range;
  const fileInputRef = useRef(null);

  const [name, setName]               = useState(range?.name || '');
  const [startDate, setStartDate]     = useState(range?.start_date || '');
  const [endDate, setEndDate]         = useState(range?.end_date || '');
  const [description, setDescription] = useState(range?.description || '');
  const [color, setColor]             = useState(range?.color || '#024791');
  const [sourceUrl, setSourceUrl]     = useState(range?.source_reference_url || '');
  const [notes, setNotes]             = useState(range?.internal_notes || '');
  const [tagsInput, setTagsInput]     = useState(range?.tags ? range.tags.join(', ') : '');
  const [errors, setErrors]           = useState({});
  const [isSaving, setIsSaving]       = useState(false);

  const [existingAttachments, setExistingAttachments] = useState([]);
  const [uploadQueue, setUploadQueue] = useState([]);

  const designPlatform = detectDesignPlatform(sourceUrl);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (isEdit && range.id) {
      getRangeAttachments(range.id).then(setExistingAttachments).catch(() => {});
    }
  }, [range]);

  const validate = () => {
    const errs = {};
    if (!name.trim())  errs.name      = 'Campaign name is required.';
    if (!startDate)    errs.startDate = 'Start date is required.';
    if (!endDate)      errs.endDate   = 'End date is required.';
    if (startDate && endDate && endDate < startDate)
      errs.endDate = 'End date cannot be before start date.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const newItems = files.map(f => ({ file: f, managerName: stripExt(f.name), progress: 0, error: null }));
    setUploadQueue(prev => [...prev, ...newItems]);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const newItems = files.map(f => ({ file: f, managerName: stripExt(f.name), progress: 0, error: null }));
    setUploadQueue(prev => [...prev, ...newItems]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || isSaving) return;
    setIsSaving(true);
    try {
      const savedRange = await onSave({
        name: name.trim(),
        start_date: startDate,
        end_date: endDate,
        description: description.trim(),
        color,
        source_reference_url: sourceUrl.trim() || null,
        internal_notes: notes.trim() || null,
        tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean)
      });

      // Upload queued files if we have a rangeId
      const rangeId = savedRange?.id || range?.id;
      if (rangeId && uploadQueue.length > 0) {
        for (let i = 0; i < uploadQueue.length; i++) {
          const item = uploadQueue[i];
          try {
            await uploadAttachment(item.file, rangeId, item.managerName, (pct) => {
              setUploadQueue(prev => prev.map((q, qi) => qi === i ? { ...q, progress: pct } : q));
            });
          } catch (err) {
            setUploadQueue(prev => prev.map((q, qi) => qi === i ? { ...q, error: err.message } : q));
          }
        }
      }
      onClose();
    } catch (err) {
      setErrors({ submit: err.message || 'Failed to save. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveExisting = async (att) => {
    try {
      await deleteAttachment(att.id, att.file?.id, att.file?.storage_path);
      setExistingAttachments(prev => prev.filter(a => a.id !== att.id));
    } catch (err) {
      alert('Failed to remove: ' + err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container physical-sheet-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-staple-accent" />

        <div className="modal-header paper-sheet-header">
          <div className="modal-header-text">
            <span className="sheet-kicker">CAMPAIGN</span>
            <h2 className="modal-title">{isEdit ? 'Edit Campaign' : 'Create Campaign'}</h2>
          </div>
          <button className="modal-close tactile-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body paper-sheet-body">
            <div className="form-grid">

              {/* Campaign Name */}
              <div className="form-group full-width">
                <label>Campaign Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`input-field-tactile ${errors.name ? 'error' : ''}`}
                  placeholder="e.g. Industrial Automation Launch"
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
                <label>Description <span style={{ color: 'var(--paper-text-muted)', fontWeight: 500 }}>— Optional</span></label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-field-tactile"
                  placeholder="Campaign goals, target audience, overview..."
                  rows={3}
                />
              </div>

              {/* Attachments */}
              <div className="form-group full-width">
                <label>Attachments <span style={{ color: 'var(--paper-text-muted)', fontWeight: 500 }}>— Optional</span></label>

                {existingAttachments.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                    {existingAttachments.filter(a => a.attachment_type === 'file').map(att => (
                      <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--paper-bg)', border: '1px solid var(--paper-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                        <span>{getFileIcon(att.file?.file_type)}</span>
                        <span style={{ flex: 1, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {att.file?.manager_name || att.file?.original_filename}
                        </span>
                        <button type="button" className="btn btn-danger tactile-btn" style={{ padding: '3px 8px', fontSize: '0.72rem' }} onClick={() => handleRemoveExisting(att)}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {uploadQueue.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                    {uploadQueue.map((item, idx) => (
                      <div key={idx} style={{ padding: '8px 10px', background: 'var(--paper-bg)', border: '1px solid var(--paper-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ flex: 1, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.file.name}</span>
                          <button type="button" className="btn btn-danger tactile-btn" style={{ padding: '2px 7px', fontSize: '0.72rem' }} onClick={() => setUploadQueue(prev => prev.filter((_, i) => i !== idx))}>
                            <Trash2 size={11} />
                          </button>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.7rem', fontWeight: 600, display: 'block', marginBottom: 2 }}>Manager Name</label>
                          <input
                            type="text"
                            value={item.managerName}
                            onChange={(e) => setUploadQueue(prev => prev.map((q, qi) => qi === idx ? { ...q, managerName: e.target.value } : q))}
                            className="input-field-tactile"
                            style={{ padding: '5px 8px', fontSize: '0.8rem' }}
                          />
                        </div>
                        {item.error && <div className="error-message">{item.error}</div>}
                      </div>
                    ))}
                  </div>
                )}

                <div
                  className="upload-dropzone paper-dropzone-tactile"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  style={{ minHeight: 70, padding: '14px' }}
                >
                  <Upload className="upload-dropzone-icon" style={{ width: 20, height: 20 }} />
                  <div className="upload-dropzone-text" style={{ fontSize: '0.82rem' }}>Click or drop files here</div>
                  <div className="upload-dropzone-sub">Images, PDFs, DOC, DOCX, PPT, PPTX, XLS, XLSX, Video</div>
                </div>
                <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,video/*" style={{ display: 'none' }} onChange={handleFileSelect} />
              </div>

              {/* Source / Reference Link */}
              <div className="form-group full-width">
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span>Source / Reference Link</span>
                  {sourceUrl && <span className="badge badge-platform-tactile" style={{ fontSize: '0.65rem' }}>{designPlatform.label}</span>}
                  <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--paper-text-muted)', fontWeight: 500 }}>Optional</span>
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="url"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    className="input-field-tactile"
                    placeholder="https://www.figma.com/design/... or canva.com/design/..."
                    style={{ flex: 1, minWidth: 0 }}
                  />
                  {sourceUrl && (
                    <a href={sourceUrl} target="_blank" rel="noopener noreferrer"
                      className="btn btn-secondary tactile-btn"
                      style={{ padding: '0 12px', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                    >
                      <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              </div>

              {/* Internal Notes */}
              <div className="form-group full-width">
                <label>Internal Team Notes <span style={{ color: 'var(--paper-text-muted)', fontWeight: 500 }}>— Optional</span></label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input-field-tactile"
                  placeholder="Internal instructions, approval notes..."
                  rows={2}
                />
              </div>

              {/* Campaign Color */}
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
                <div style={{ marginTop: 6, fontSize: '0.8rem', color: 'var(--paper-text-muted)' }}>
                  Selected: <strong style={{ color }}>{COLOR_OPTIONS.find(o => o.value === color)?.label}</strong>
                </div>
              </div>

              {/* Tags */}
              <div className="form-group full-width">
                <label>Tags <span style={{ color: 'var(--paper-text-muted)', fontWeight: 500 }}>— Optional, comma separated</span></label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="input-field-tactile"
                  placeholder="Smart Factory, MES, Automation"
                />
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
            <button type="button" className="btn btn-secondary tactile-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary tactile-action-btn" disabled={isSaving}>
              {isSaving ? 'Saving…' : isEdit ? 'Update Campaign' : 'Save Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
