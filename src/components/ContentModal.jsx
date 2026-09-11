// src/components/ContentModal.jsx
// V1.5 Content creation/edit form — tracked work item with start+end dates and multi-file attachments
import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Trash2, ExternalLink, Calendar, Link as LinkIcon } from 'lucide-react';
import { createContent, updateContent, uploadContentAttachment, deleteContentAttachment, getContentAttachments, getFileIcon } from '../services/content';
import { detectDesignPlatform } from './PostModal';

function stripExt(filename) {
  if (!filename) return '';
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.substring(0, lastDot) : filename;
}

const CONTENT_TYPES = ['Image', 'Carousel', 'Video', 'Reel', 'Story', 'File', 'Text', 'Link / Article', 'Other'];
const CHANNELS = [
  { id: 'LinkedIn', color: '#024791' }, { id: 'Instagram', color: '#e1306c' },
  { id: 'Facebook', color: '#1877f2' }, { id: 'X / Twitter', color: '#111827' },
  { id: 'Website', color: '#059669' }, { id: 'Email', color: '#d97706' },
  { id: 'Internal', color: '#4f46e5' }, { id: 'Other', color: '#545454' }
];

export default function ContentModal({ content, datePreset, onClose, onSave }) {
  const isEdit = !!content?.id;
  const fileInputRef = useRef(null);

  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [contentType, setContentType] = useState('Other');
  const [channel, setChannel] = useState('');
  const [description, setDescription] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [status, setStatus] = useState('Draft');
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Attachments
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [uploadQueue, setUploadQueue] = useState([]); // { file, managerName, progress, error }
  const [savedContentId, setSavedContentId] = useState(null);

  const designPlatform = detectDesignPlatform(sourceUrl);

  useEffect(() => {
    if (isEdit) {
      setTitle(content.title || '');
      setStartDate(content.start_date || '');
      setEndDate(content.end_date || '');
      setContentType(content.content_type || 'Other');
      setChannel(content.distribution_channel || '');
      setDescription(content.description || '');
      setSourceUrl(content.source_reference_url || '');
      setNotes(content.internal_notes || '');
      setTagsInput(content.tags ? content.tags.join(', ') : '');
      setStatus(content.status || 'Draft');
      setSavedContentId(content.id);
      getContentAttachments(content.id).then(setExistingAttachments).catch(() => {});
    } else {
      setStartDate(datePreset || '');
      setSavedContentId(null);
    }
  }, [content, datePreset]);

  const validate = () => {
    const errs = {};
    if (!title.trim()) errs.title = 'Title is required.';
    if (startDate && endDate && endDate < startDate) errs.endDate = 'End date cannot be before start date.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
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

  const removeFromQueue = (idx) => setUploadQueue(prev => prev.filter((_, i) => i !== idx));

  const handleRemoveExisting = async (att) => {
    try {
      await deleteContentAttachment(att.id, att.file?.id, att.file?.storage_path);
      setExistingAttachments(prev => prev.filter(a => a.id !== att.id));
    } catch (err) {
      alert('Failed to remove attachment: ' + err.message);
    }
  };

  const handleSave = async () => {
    if (!validate() || isSaving) return;
    setIsSaving(true);
    try {
      const payload = {
        title: title.trim(),
        content_type: contentType,
        start_date: startDate || null,
        end_date: endDate || null,
        status,
        distribution_channel: channel || null,
        description: description.trim() || null,
        source_reference_url: sourceUrl.trim() || null,
        internal_notes: notes.trim() || null,
        tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean)
      };

      let contentId = savedContentId;
      let savedItem;
      if (isEdit && contentId) {
        savedItem = await updateContent(contentId, payload);
      } else {
        savedItem = await createContent(payload);
        contentId = savedItem.id;
        setSavedContentId(contentId);
      }

      // Upload queued attachments
      for (let i = 0; i < uploadQueue.length; i++) {
        const item = uploadQueue[i];
        try {
          await uploadContentAttachment(item.file, contentId, item.managerName, (pct) => {
            setUploadQueue(prev => prev.map((q, qi) => qi === i ? { ...q, progress: pct } : q));
          });
        } catch (err) {
          setUploadQueue(prev => prev.map((q, qi) => qi === i ? { ...q, error: err.message } : q));
        }
      }

      onSave(savedItem);
      onClose();
    } catch (err) {
      setErrors({ submit: err.message || 'Failed to save. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container physical-sheet-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-staple-accent" />

        <div className="modal-header paper-sheet-header">
          <div className="modal-header-text">
            <span className="sheet-kicker">CONTENT MANIFEST</span>
            <h2 className="modal-title">{isEdit ? 'Edit Content' : 'Create Content'}</h2>
          </div>
          <button className="modal-close tactile-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body paper-sheet-body">
          <div className="form-grid">

            {/* Title */}
            <div className="form-group full-width">
              <label>Content Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`input-field-tactile ${errors.title ? 'error' : ''}`}
                placeholder="e.g. Industrial Automation Product Video"
                autoFocus
              />
              {errors.title && <div className="error-message">{errors.title}</div>}
            </div>

            {/* Start Date */}
            <div className="form-group">
              <label>Start Date</label>
              <div className="input-with-icon">
                <Calendar size={15} className="input-prefix-icon" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input-field-tactile"
                />
              </div>
            </div>

            {/* End Date */}
            <div className="form-group">
              <label>End Date</label>
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

            {/* Content Type */}
            <div className="form-group">
              <label>Content Type</label>
              <select value={contentType} onChange={(e) => setContentType(e.target.value)} className="filter-select-tactile">
                {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Status */}
            <div className="form-group">
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="filter-select-tactile">
                <option value="Draft">Draft</option>
                <option value="In Progress">In Progress</option>
                <option value="Ready">Ready</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Published">Published / Completed</option>
                <option value="Archived">Archived</option>
              </select>
            </div>

            {/* Attachments */}
            <div className="form-group full-width">
              <label>Attachments <span style={{ color: 'var(--paper-text-muted)', fontWeight: 500 }}>— Optional</span></label>

              {/* Existing attachments */}
              {existingAttachments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                  {existingAttachments.map(att => (
                    <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--paper-bg)', border: '1px solid var(--paper-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                      <span>{getFileIcon(att.file?.file_type)}</span>
                      <span style={{ flex: 1, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {att.file?.manager_name || att.file?.original_filename || att.link_name}
                      </span>
                      <button className="btn btn-danger tactile-btn" style={{ padding: '3px 8px', fontSize: '0.72rem' }} onClick={() => handleRemoveExisting(att)}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload queue */}
              {uploadQueue.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                  {uploadQueue.map((item, idx) => (
                    <div key={idx} style={{ padding: '8px 10px', background: 'var(--paper-bg)', border: '1px solid var(--paper-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ flex: 1, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.file.name}</span>
                        <button className="btn btn-danger tactile-btn" style={{ padding: '2px 7px', fontSize: '0.72rem' }} onClick={() => removeFromQueue(idx)}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                      <div style={{ marginBottom: 4 }}>
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

              {/* Drop zone */}
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
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,video/*"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
            </div>

            {/* Distribution / Channel */}
            <div className="form-group full-width">
              <label>Distribution / Channel <span style={{ color: 'var(--paper-text-muted)', fontWeight: 500 }}>— Optional</span></label>
              <div className="platform-pills-row">
                {CHANNELS.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setChannel(channel === c.id ? '' : c.id)}
                    className={`platform-pill-btn ${channel === c.id ? 'active' : ''}`}
                  >
                    <span className="pill-dot" style={{ backgroundColor: c.color }} />
                    <span>{c.id}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="form-group full-width">
              <label>Description / Content <span style={{ color: 'var(--paper-text-muted)', fontWeight: 500 }}>— Optional</span></label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field-tactile"
                placeholder="Write captions, article content, instructions, work details..."
                rows={4}
              />
            </div>

            {/* Source / Reference Link */}
            <div className="form-group full-width">
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span>Source / Reference Link</span>
                {sourceUrl && (
                  <span className="badge badge-platform-tactile" style={{ fontSize: '0.65rem' }}>
                    {designPlatform.label}
                  </span>
                )}
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
                placeholder="Review approvals, production instructions, internal notes..."
                rows={2}
              />
            </div>

            {/* Tags */}
            <div className="form-group full-width">
              <label>Tags <span style={{ color: 'var(--paper-text-muted)', fontWeight: 500 }}>— Optional, comma separated</span></label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="input-field-tactile"
                placeholder="Smart Factory, MES, Automation, Industry 4.0"
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
          <button className="btn btn-secondary tactile-btn" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary tactile-action-btn"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving…' : (isEdit ? 'Update Content' : 'Save to Manager')}
          </button>
        </div>
      </div>
    </div>
  );
}
