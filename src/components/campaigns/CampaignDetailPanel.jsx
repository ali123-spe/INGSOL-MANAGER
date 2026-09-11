// src/components/campaigns/CampaignDetailPanel.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Edit2, Trash2, Upload, Plus, Link as LinkIcon,
  Clock, FileText, Layers
} from 'lucide-react';
import AttachmentCard from './AttachmentCard';
import {
  getRangeAttachments, uploadAttachment, deleteAttachment,
  addLink, deleteLink, getRangePosts, addPostRef, removePostRef,
  updateAttachmentManagerName
} from '../../services/campaigns';

function stripExt(filename) {
  if (!filename) return '';
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.substring(0, lastDot) : filename;
}

export default function CampaignDetailPanel({ range, allPosts, onClose, onEdit, onDelete, onCreateContent }) {
  const [activeTab, setActiveTab] = useState('attachments');
  const [attachments, setAttachments] = useState([]);
  const [linkedPostRefs, setLinkedPostRefs] = useState([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);

  // Upload state
  const [uploadQueue, setUploadQueue] = useState([]); // [{ file, managerName, progress, error }]
  const fileInputRef = useRef(null);

  // Add link state
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkName, setLinkName] = useState('');
  const [linkUrl, setLinkUrl]   = useState('');
  const [linkError, setLinkError] = useState('');
  const [isSavingLink, setIsSavingLink] = useState(false);

  // Link post state
  const [showLinkPost, setShowLinkPost] = useState(false);
  const [postSearch, setPostSearch]     = useState('');

  const loadAttachments = useCallback(async () => {
    setIsLoadingAttachments(true);
    try {
      const [atts, posts] = await Promise.all([
        getRangeAttachments(range.id),
        getRangePosts(range.id)
      ]);
      setAttachments(atts);
      setLinkedPostRefs(posts);
    } catch (err) {
      console.error('Failed to load attachments', err);
    } finally {
      setIsLoadingAttachments(false);
    }
  }, [range.id]);

  useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);

  // Keyboard close
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // ── Drag and drop ──────────────────────────────────────────────────────────
  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length) queueUploads(files);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length) queueUploads(files);
    e.target.value = '';
  };

  const queueUploads = (files) => {
    const newQueue = files.map(f => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      file: f,
      managerName: stripExt(f.name),
      progress: 0,
      error: null,
      done: false
    }));
    setUploadQueue(prev => [...prev, ...newQueue]);
    newQueue.forEach(item => startUpload(item));
  };

  const startUpload = async (item) => {
    try {
      // Simulate progress phases
      updateQueueItem(item.id, { progress: 20 });
      const attachment = await uploadAttachment(
        item.file,
        range.id,
        item.managerName,
        (pct) => updateQueueItem(item.id, { progress: pct })
      );
      setAttachments(prev => [...prev, attachment]);
      updateQueueItem(item.id, { progress: 100, done: true });

      // Remove from queue after a short display period
      setTimeout(() => {
        setUploadQueue(prev => prev.filter(q => q.id !== item.id));
      }, 1500);
    } catch (err) {
      updateQueueItem(item.id, { error: err.message || 'Upload failed', progress: 0 });
    }
  };

  const updateQueueItem = (id, patch) => {
    setUploadQueue(prev => prev.map(q => q.id === id ? { ...q, ...patch } : q));
  };

  const updateQueueManagerName = (id, name) => {
    setUploadQueue(prev => prev.map(q => q.id === id ? { ...q, managerName: name } : q));
  };

  // ── Delete attachment ─────────────────────────────────────────────────────
  const handleDeleteAttachment = async (attachment) => {
    if (!window.confirm(`Remove "${attachment.file?.manager_name || attachment.link_name}"?`)) return;
    try {
      if (attachment.attachment_type === 'link') {
        await deleteLink(attachment.id);
      } else {
        await deleteAttachment(attachment.id, attachment.file?.id, attachment.file?.storage_path);
      }
      setAttachments(prev => prev.filter(a => a.id !== attachment.id));
    } catch (err) {
      alert('Failed to remove: ' + err.message);
    }
  };

  // ── Add Link ──────────────────────────────────────────────────────────────
  const handleAddLink = async () => {
    setLinkError('');
    if (!linkName.trim()) { setLinkError('Link name is required.'); return; }
    if (!linkUrl.trim())  { setLinkError('URL is required.'); return; }
    try { new URL(linkUrl.trim()); } catch { setLinkError('Please enter a valid URL.'); return; }

    setIsSavingLink(true);
    try {
      const newAtt = await addLink(range.id, linkName.trim(), linkUrl.trim());
      setAttachments(prev => [...prev, newAtt]);
      setLinkName(''); setLinkUrl(''); setShowLinkForm(false);
    } catch (err) {
      setLinkError(err.message);
    } finally {
      setIsSavingLink(false);
    }
  };

  // ── Link / Unlink post ────────────────────────────────────────────────────
  const linkedPostIds = linkedPostRefs.map(r => r.post_ref_id);
  const availablePosts = allPosts.filter(p =>
    !linkedPostIds.includes(p.id) &&
    (postSearch.trim() === '' || p.title?.toLowerCase().includes(postSearch.toLowerCase()))
  );

  const handleLinkPost = async (post) => {
    try {
      const ref = await addPostRef(range.id, post.id);
      setLinkedPostRefs(prev => [...prev, ref]);
    } catch (err) {
      alert('Failed to link post: ' + err.message);
    }
    setShowLinkPost(false);
    setPostSearch('');
  };

  const handleUnlinkPost = async (postRef) => {
    try {
      await removePostRef(range.id, postRef.post_ref_id);
      setLinkedPostRefs(prev => prev.filter(r => r.id !== postRef.id));
    } catch (err) {
      alert('Failed to unlink: ' + err.message);
    }
  };

  // ── Formatting & Calculations ──────────────────────────────────────────────
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  
  const getDays = (start, end) => {
    if (!start || !end) return 0;
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 3600 * 24)));
  };

  const plannedDuration = getDays(range.start_date, range.end_date);
  const actualStart = range.actual_start_at || range.start_date;
  const actualEnd = range.completed_at || new Date().toISOString();
  const currentDuration = getDays(actualStart, actualEnd);
  const variance = currentDuration - plannedDuration;
  const varianceText = variance > 0 ? `${variance} days over plan` : variance < 0 ? `${Math.abs(variance)} days ahead` : 'On track';

  const totalItems = linkedPostRefs.length;
  const completedItems = linkedPostRefs.filter(ref => {
    const post = allPosts.find(p => p.id === ref.post_ref_id);
    return post && (post.status === 'Completed' || post.status === 'Published');
  }).length;
  const progressPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const fileAttachments = attachments.filter(a => a.attachment_type === 'file');
  const linkAttachments = attachments.filter(a => a.attachment_type === 'link');

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <aside className="campaign-detail-panel">

        {/* Header */}
        <div className="campaign-panel-header" style={{ borderLeft: `5px solid ${range.color || '#024791'}` }}>
          <div style={{ flex: 1 }}>
            <div className="sheet-kicker" style={{ marginBottom: 4 }}>DATE RANGE</div>
            <h2 className="campaign-panel-title">{range.name}</h2>
            <div className="campaign-panel-dates">
              <Clock size={13} style={{ opacity: 0.7 }} />
              {fmtDate(range.start_date)} — {fmtDate(range.end_date)}
              <span className={`status-pill status-${(range.status || 'Planned').toLowerCase().replace(' ', '-')}`} style={{ marginLeft: 8 }}>
                {range.status || 'Planned'}
              </span>
            </div>
            
            {/* Progress & Duration Section */}
            <div style={{ marginTop: 12, padding: 10, background: 'var(--paper-card)', border: '1px solid var(--paper-border)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.75rem', fontWeight: 600 }}>
                <span>Progress: {completedItems} / {totalItems} completed</span>
                <span>{progressPct}%</span>
              </div>
              <div className="upload-progress-bar-track" style={{ height: 6, marginBottom: 12 }}>
                <div className="upload-progress-bar-fill" style={{ width: `${progressPct}%`, backgroundColor: 'var(--ingsol-primary)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.72rem' }}>
                <div>
                  <div style={{ color: 'var(--paper-text-muted)' }}>Planned Duration</div>
                  <div style={{ fontWeight: 600 }}>{plannedDuration} days</div>
                </div>
                <div>
                  <div style={{ color: 'var(--paper-text-muted)' }}>Actual Duration</div>
                  <div style={{ fontWeight: 600 }}>{currentDuration} days ({varianceText})</div>
                </div>
              </div>
            </div>

            {range.description && (
              <p className="campaign-panel-description" style={{ marginTop: 12 }}>{range.description}</p>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
            <button className="modal-close tactile-close-btn" onClick={onClose}><X size={18} /></button>
            <button className="btn btn-secondary tactile-btn" style={{ padding: '5px 10px', fontSize: '0.75rem' }} onClick={() => onEdit(range)}>
              <Edit2 size={12} /> Edit
            </button>
            <button
              className="btn btn-danger tactile-btn"
              style={{ padding: '5px 10px', fontSize: '0.75rem' }}
              onClick={() => {
                if (window.confirm(`Delete "${range.name}"? All attachments will be removed.`)) onDelete(range.id);
              }}
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="campaign-tabs-bar">
          {[
            { id: 'attachments', label: 'Attachments', icon: FileText },
            { id: 'content',     label: 'Content',     icon: Layers },
            { id: 'activity',    label: 'Activity',    icon: Clock },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`campaign-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={14} /> {tab.label}
              </button>
            );
          })}
        </div>

        <div className="campaign-panel-body">

          {/* ═══ ATTACHMENTS TAB ═══════════════════════════════════════════ */}
          {activeTab === 'attachments' && (
            <div className="campaign-tab-content">

              {/* Upload dropzone */}
              <div
                className="campaign-upload-dropzone"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current.click()}
              >
                <Upload size={20} />
                <span>Drop files here or click to browse</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--paper-text-muted)' }}>
                  Images, PDF, DOC/DOCX and more
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />

              {/* Upload queue (progress) */}
              {uploadQueue.length > 0 && (
                <div className="upload-queue">
                  {uploadQueue.map(item => (
                    <div key={item.id} className="upload-queue-item">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div>
                          <input
                            className="input-field-tactile"
                            style={{ padding: '4px 8px', fontSize: '0.78rem', width: '100%' }}
                            value={item.managerName}
                            onChange={(e) => updateQueueManagerName(item.id, e.target.value)}
                            placeholder="Manager Name"
                          />
                          <div style={{ fontSize: '0.68rem', color: 'var(--paper-text-muted)', marginTop: 2 }}>{item.file.name}</div>
                        </div>
                      </div>
                      {item.error ? (
                        <div style={{ fontSize: '0.72rem', color: '#dc2626' }}>{item.error}</div>
                      ) : (
                        <div className="upload-progress-bar-track">
                          <div
                            className={`upload-progress-bar-fill ${item.done ? 'done' : ''}`}
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* File attachments */}
              {isLoadingAttachments ? (
                <div className="empty-state" style={{ padding: 20 }}>Loading…</div>
              ) : (
                <>
                  {fileAttachments.length > 0 && (
                    <div className="attachment-section">
                      <div className="attachment-section-label">Files ({fileAttachments.length})</div>
                      {fileAttachments.map(att => (
                        <AttachmentCard
                          key={att.id}
                          attachment={att}
                          onDelete={() => handleDeleteAttachment(att)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Links */}
                  <div className="attachment-section">
                    <div className="attachment-section-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Links {linkAttachments.length > 0 ? `(${linkAttachments.length})` : ''}</span>
                      <button
                        className="btn btn-secondary tactile-btn"
                        style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                        onClick={() => setShowLinkForm(v => !v)}
                      >
                        <Plus size={12} /> Add Link
                      </button>
                    </div>

                    {showLinkForm && (
                      <div className="link-add-form">
                        <input
                          type="text"
                          className="input-field-tactile"
                          placeholder="Link Name (e.g. Product Website)"
                          value={linkName}
                          onChange={(e) => setLinkName(e.target.value)}
                        />
                        <input
                          type="url"
                          className="input-field-tactile"
                          placeholder="https://example.com"
                          value={linkUrl}
                          onChange={(e) => setLinkUrl(e.target.value)}
                        />
                        {linkError && <div className="error-message">{linkError}</div>}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            className="btn btn-primary tactile-action-btn"
                            style={{ flex: 1, padding: '7px 12px' }}
                            onClick={handleAddLink}
                            disabled={isSavingLink}
                          >
                            {isSavingLink ? 'Saving…' : 'Add Link'}
                          </button>
                          <button
                            className="btn btn-secondary tactile-btn"
                            style={{ padding: '7px 12px' }}
                            onClick={() => { setShowLinkForm(false); setLinkError(''); setLinkName(''); setLinkUrl(''); }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {linkAttachments.map(att => (
                      <AttachmentCard
                        key={att.id}
                        attachment={att}
                        onDelete={() => handleDeleteAttachment(att)}
                      />
                    ))}

                    {fileAttachments.length === 0 && linkAttachments.length === 0 && uploadQueue.length === 0 && (
                      <div className="empty-state" style={{ padding: '24px 0' }}>
                        <LinkIcon className="empty-state-icon" style={{ width: 32, height: 32 }} />
                        <div className="empty-state-title">No attachments yet</div>
                        <div className="empty-state-text">Upload files or add links above.</div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══ CONTENT TAB ═══════════════════════════════════════════════ */}
          {activeTab === 'content' && (
            <div className="campaign-tab-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>Linked Content ({linkedPostRefs.length})</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {onCreateContent && (
                    <button
                      className="btn btn-primary tactile-action-btn"
                      style={{ padding: '5px 12px', fontSize: '0.75rem' }}
                      onClick={() => { onClose(); onCreateContent(range.id); }}
                    >
                      <Plus size={12} /> Create Content
                    </button>
                  )}
                  <button
                    className="btn btn-secondary tactile-btn"
                    style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                    onClick={() => setShowLinkPost(v => !v)}
                  >
                    <Plus size={12} /> Link Existing
                  </button>
                </div>
              </div>

              {showLinkPost && (
                <div style={{ marginBottom: 14, padding: 12, background: 'var(--paper-card)', border: '1px solid var(--paper-border)', borderRadius: 'var(--radius-sm)' }}>
                  <input
                    type="text"
                    className="input-field-tactile"
                    placeholder="Search posts by title…"
                    value={postSearch}
                    onChange={(e) => setPostSearch(e.target.value)}
                    autoFocus
                    style={{ marginBottom: 8 }}
                  />
                  <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {availablePosts.length === 0 ? (
                      <div style={{ fontSize: '0.78rem', color: 'var(--paper-text-muted)', padding: '8px 4px' }}>
                        {postSearch ? 'No matching posts.' : 'All posts are already linked.'}
                      </div>
                    ) : availablePosts.map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleLinkPost(p)}
                        className="btn btn-secondary tactile-btn"
                        style={{ textAlign: 'left', justifyContent: 'flex-start', padding: '7px 10px', fontSize: '0.8rem' }}
                      >
                        <span style={{ fontWeight: 600 }}>{p.title}</span>
                        <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--paper-text-muted)' }}>{p.date}</span>
                      </button>
                    ))}
                  </div>
                  <button className="btn btn-secondary tactile-btn" style={{ marginTop: 8, padding: '5px 10px', fontSize: '0.75rem' }} onClick={() => { setShowLinkPost(false); setPostSearch(''); }}>
                    Close
                  </button>
                </div>
              )}

              {linkedPostRefs.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px 0' }}>
                  <Layers className="empty-state-icon" style={{ width: 32, height: 32 }} />
                  <div className="empty-state-title">No linked posts</div>
                  <div className="empty-state-text">Associate existing content posts with this campaign.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {linkedPostRefs.map(ref => {
                    const post = allPosts.find(p => p.id === ref.post_ref_id);
                    return (
                      <div key={ref.id} className="attachment-card" style={{ cursor: 'default' }}>
                        <div className="attachment-link-icon" style={{ background: '#eff6ff' }}>
                          <Layers size={20} style={{ color: '#2563eb' }} />
                        </div>
                        <div className="attachment-info">
                          <div className="attachment-manager-name">{post?.title || ref.post_ref_id}</div>
                          <div className="attachment-meta">{post?.platform} · {post?.date} · {post?.status}</div>
                        </div>
                        <div className="attachment-actions">
                          <button
                            className="attachment-action-btn attachment-action-delete"
                            title="Unlink"
                            onClick={() => handleUnlinkPost(ref)}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══ ACTIVITY TAB (Prompt 4 placeholder) ══════════════════════ */}
          {activeTab === 'activity' && (
            <div className="campaign-tab-content">
              <div className="empty-state" style={{ padding: '40px 0' }}>
                <Clock className="empty-state-icon" style={{ width: 36, height: 36, opacity: 0.4 }} />
                <div className="empty-state-title">Activity Log</div>
                <div className="empty-state-text">Full activity history is coming in Prompt 4.</div>
              </div>
            </div>
          )}

        </div>
      </aside>
    </>
  );
}
