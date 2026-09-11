// src/components/campaigns/CampaignDetailPage.jsx
// Full Campaign Detail / Work Tracker page — opened when clicking a campaign bar in the calendar
import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Edit2, Trash2, Upload, Plus, Link as LinkIcon,
  Clock, ChevronLeft, ExternalLink, Layers, FileText, Tag, AlignLeft
} from 'lucide-react';
import {
  getRangeAttachments, uploadAttachment, deleteAttachment,
  addLink, deleteLink, updateAttachmentManagerName
} from '../../services/campaigns';
import {
  getCampaignContent, linkContentToCampaign, unlinkContentFromCampaign, getFileIcon
} from '../../services/content';

function fmtDate(d) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysBetween(start, end) {
  if (!start || !end) return 0;
  return Math.max(0, Math.round((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1);
}

function StatusPill({ status }) {
  const statusColors = {
    'Planned': '#64748b', 'In Progress': '#d97706', 'Completed': '#059669',
    'Overdue': '#dc2626', 'Archived': '#94a3b8'
  };
  const col = statusColors[status] || '#64748b';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700,
      backgroundColor: col + '18', color: col, border: `1px solid ${col}40`
    }}>
      {status || 'Planned'}
    </span>
  );
}

function stripExt(filename) {
  if (!filename) return '';
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.substring(0, lastDot) : filename;
}

export default function CampaignDetailPage({ range: initialRange, allContent = [], onClose, onEdit, onDelete }) {
  const [range, setRange] = useState(initialRange);
  const [activeTab, setActiveTab] = useState('overview');
  const [attachments, setAttachments] = useState([]);
  const [campaignContent, setCampaignContent] = useState([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  // Upload state
  const [uploadQueue, setUploadQueue] = useState([]);
  const fileInputRef = React.useRef(null);

  // Add link state
  const [showAddLink, setShowAddLink] = useState(false);
  const [linkName, setLinkName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  const loadAttachments = useCallback(async () => {
    if (!range?.id) return;
    setIsLoadingAttachments(true);
    try {
      const data = await getRangeAttachments(range.id);
      setAttachments(data);
    } catch (err) {
      console.error('Failed to load attachments:', err);
    } finally {
      setIsLoadingAttachments(false);
    }
  }, [range?.id]);

  const loadContent = useCallback(async () => {
    if (!range?.id) return;
    setIsLoadingContent(true);
    try {
      const data = await getCampaignContent(range.id);
      setCampaignContent(data);
    } catch (err) {
      console.error('Failed to load campaign content:', err);
    } finally {
      setIsLoadingContent(false);
    }
  }, [range?.id]);

  useEffect(() => {
    setRange(initialRange);
  }, [initialRange]);

  useEffect(() => {
    loadAttachments();
    loadContent();
  }, [loadAttachments, loadContent]);

  // File upload
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const newItems = files.map(f => ({ file: f, managerName: stripExt(f.name), progress: 0, error: null }));
    setUploadQueue(prev => [...prev, ...newItems]);
    e.target.value = '';
  };

  const handleUpload = async () => {
    if (!uploadQueue.length) return;
    for (let i = 0; i < uploadQueue.length; i++) {
      const item = uploadQueue[i];
      try {
        await uploadAttachment(item.file, range.id, item.managerName, (pct) => {
          setUploadQueue(prev => prev.map((q, qi) => qi === i ? { ...q, progress: pct } : q));
        });
      } catch (err) {
        setUploadQueue(prev => prev.map((q, qi) => qi === i ? { ...q, error: err.message } : q));
      }
    }
    setUploadQueue([]);
    loadAttachments();
  };

  const handleDeleteAttachment = async (att) => {
    if (!confirm(`Remove "${att.file?.manager_name || att.link_name}"?`)) return;
    try {
      await deleteAttachment(att.id, att.file?.id, att.file?.storage_path);
      setAttachments(prev => prev.filter(a => a.id !== att.id));
    } catch (err) {
      alert('Failed to remove: ' + err.message);
    }
  };

  const handleAddLink = async (e) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;
    try {
      await addLink(range.id, linkName.trim() || linkUrl.trim(), linkUrl.trim());
      setLinkName(''); setLinkUrl(''); setShowAddLink(false);
      loadAttachments();
    } catch (err) {
      alert('Failed to add link: ' + err.message);
    }
  };

  const handleUnlinkContent = async (campaignId, contentId) => {
    try {
      await unlinkContentFromCampaign(campaignId, contentId);
      setCampaignContent(prev => prev.filter(c => c.content_id !== contentId));
    } catch (err) {
      alert('Failed to unlink: ' + err.message);
    }
  };

  const duration = daysBetween(range.start_date, range.end_date);
  const fileAttachments = attachments.filter(a => a.attachment_type === 'file');
  const linkAttachments = attachments.filter(a => a.attachment_type === 'link');

  // Timeline calculation
  const totalDays = duration || 1;
  const rangeStart = new Date(range.start_date + 'T00:00:00');
  const getBarStyle = (itemStart, itemEnd) => {
    const s = new Date((itemStart || range.start_date) + 'T00:00:00');
    const e = new Date((itemEnd || range.end_date) + 'T00:00:00');
    const left = Math.max(0, (s - rangeStart) / (totalDays * 86400000)) * 100;
    const width = Math.max(3, ((e - s) / (totalDays * 86400000)) * 100);
    return { left: `${left}%`, width: `${Math.min(width, 100 - left)}%` };
  };

  const tabs = ['overview', 'content', 'attachments', 'activity'];
  const tabLabels = { overview: 'Overview', content: `Content (${campaignContent.length})`, attachments: `Attachments (${fileAttachments.length})`, activity: 'Activity' };

  return (
    <div className="campaign-detail-page-overlay" onClick={onClose}>
      <div className="campaign-detail-page" onClick={(e) => e.stopPropagation()}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="cdp-header" style={{ borderLeft: `4px solid ${range.color || 'var(--ingsol-primary)'}` }}>
          <button className="cdp-back-btn" onClick={onClose} title="Close">
            <ChevronLeft size={18} />
          </button>

          <div className="cdp-header-info">
            <div className="cdp-kicker">CAMPAIGN</div>
            <h1 className="cdp-title">{range.name}</h1>
            <div className="cdp-meta">
              <Clock size={13} />
              <span>{fmtDate(range.start_date)} → {fmtDate(range.end_date)}</span>
              <span className="cdp-meta-sep">·</span>
              <span>{duration} day{duration !== 1 ? 's' : ''}</span>
              <span className="cdp-meta-sep">·</span>
              <StatusPill status={range.status} />
            </div>
          </div>

          <div className="cdp-header-actions">
            <button
              className="btn btn-secondary tactile-btn"
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              onClick={() => onEdit(range)}
            >
              <Edit2 size={13} /> Edit
            </button>
            <button
              className="btn btn-danger tactile-btn"
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              onClick={() => { if (confirm(`Delete "${range.name}"?`)) onDelete(range.id); }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* ── Tab Bar ────────────────────────────────────────────────────── */}
        <div className="cdp-tabs">
          {tabs.map(tab => (
            <button
              key={tab}
              className={`cdp-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>

        {/* ── Tab Content ────────────────────────────────────────────────── */}
        <div className="cdp-body">

          {/* ══ OVERVIEW ══════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div className="cdp-tab-pane">
              <div className="cdp-overview-grid">

                {/* Details card */}
                <div className="cdp-card">
                  <div className="cdp-card-title">Campaign Details</div>
                  <dl className="cdp-details-list">
                    <div className="cdp-dl-row"><dt>Start Date</dt><dd>{fmtDate(range.start_date)}</dd></div>
                    <div className="cdp-dl-row"><dt>End Date</dt><dd>{fmtDate(range.end_date)}</dd></div>
                    <div className="cdp-dl-row"><dt>Duration</dt><dd>{duration} days</dd></div>
                    <div className="cdp-dl-row">
                      <dt>Color</dt>
                      <dd style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 3, backgroundColor: range.color || '#024791', flexShrink: 0 }} />
                        {range.color || '#024791'}
                      </dd>
                    </div>
                    {range.tags?.length > 0 && (
                      <div className="cdp-dl-row">
                        <dt>Tags</dt>
                        <dd style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {range.tags.map(t => (
                            <span key={t} style={{ padding: '2px 8px', background: 'var(--paper-bg)', border: '1px solid var(--paper-border)', borderRadius: 12, fontSize: '0.72rem' }}>{t}</span>
                          ))}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Progress card */}
                <div className="cdp-card">
                  <div className="cdp-card-title">Campaign Progress</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--ingsol-primary)', lineHeight: 1.1, marginBottom: 4 }}>
                    {campaignContent.length} <span style={{ fontSize: '1rem', color: 'var(--paper-text-muted)', fontWeight: 600 }}>items</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--paper-text-muted)', marginBottom: 12 }}>
                    Linked content deliverables
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.78rem' }}>
                    <div style={{ padding: '8px 10px', background: 'var(--paper-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--paper-border)' }}>
                      <div style={{ color: 'var(--paper-text-muted)', fontSize: '0.7rem', fontWeight: 600 }}>Attachments</div>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>{fileAttachments.length}</div>
                    </div>
                    <div style={{ padding: '8px 10px', background: 'var(--paper-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--paper-border)' }}>
                      <div style={{ color: 'var(--paper-text-muted)', fontSize: '0.7rem', fontWeight: 600 }}>Links</div>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>{linkAttachments.length}</div>
                    </div>
                  </div>
                </div>

                {/* Description / Notes */}
                {(range.description || range.source_reference_url || range.internal_notes) && (
                  <div className="cdp-card" style={{ gridColumn: '1 / -1' }}>
                    {range.description && (
                      <div style={{ marginBottom: range.source_reference_url || range.internal_notes ? 16 : 0 }}>
                        <div className="cdp-card-title" style={{ marginBottom: 6 }}>Description</div>
                        <p style={{ fontSize: '0.84rem', color: 'var(--paper-text)', lineHeight: 1.6 }}>{range.description}</p>
                      </div>
                    )}
                    {range.source_reference_url && (
                      <div style={{ marginBottom: range.internal_notes ? 16 : 0 }}>
                        <div className="cdp-card-title" style={{ marginBottom: 6 }}>Source / Reference</div>
                        <a href={range.source_reference_url} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.84rem', color: 'var(--ingsol-primary)', textDecoration: 'none', fontWeight: 600 }}>
                          <ExternalLink size={13} />
                          {range.source_reference_url.length > 60 ? range.source_reference_url.substring(0, 60) + '…' : range.source_reference_url}
                        </a>
                      </div>
                    )}
                    {range.internal_notes && (
                      <div>
                        <div className="cdp-card-title" style={{ marginBottom: 6 }}>Internal Notes</div>
                        <p style={{ fontSize: '0.84rem', color: 'var(--paper-text)', lineHeight: 1.6, fontStyle: 'italic' }}>{range.internal_notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Timeline */}
                <div className="cdp-card" style={{ gridColumn: '1 / -1' }}>
                  <div className="cdp-card-title">Campaign Timeline</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--paper-text-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>{fmtDate(range.start_date)}</span>
                    <span>{fmtDate(range.end_date)}</span>
                  </div>
                  {/* Campaign bar */}
                  <div style={{ position: 'relative', height: 20, marginBottom: 8 }}>
                    <div style={{
                      position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
                      background: (range.color || '#024791') + '22',
                      borderRadius: 4, border: `1px solid ${range.color || '#024791'}44`
                    }} />
                    <div style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0,
                      background: range.color || '#024791',
                      borderRadius: 4, minWidth: 4,
                      width: '100%', opacity: 0.85
                    }} />
                  </div>

                  {/* Content item bars */}
                  {campaignContent.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                      {campaignContent.map(cc => {
                        const item = cc.content;
                        if (!item) return null;
                        const barStyle = getBarStyle(item.start_date, item.end_date);
                        return (
                          <div key={cc.id} style={{ position: 'relative', height: 16 }}>
                            <div style={{ position: 'absolute', left: 0, right: 0, top: 4, bottom: 4, background: 'var(--paper-line)', borderRadius: 2 }} />
                            <div style={{
                              position: 'absolute', top: 0, bottom: 0,
                              background: '#024791',
                              opacity: 0.6,
                              borderRadius: 3,
                              ...barStyle
                            }}
                              title={item.title}
                            />
                            <div style={{
                              position: 'absolute', left: barStyle.left,
                              top: '50%', transform: 'translateY(-50%)',
                              paddingLeft: 4,
                              fontSize: '0.65rem', fontWeight: 600, color: 'var(--paper-text)',
                              whiteSpace: 'nowrap', overflow: 'hidden',
                              maxWidth: '60%'
                            }}>{item.title}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {campaignContent.length === 0 && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--paper-text-muted)', marginTop: 8 }}>
                      No content linked yet. Add content items in the Content tab.
                    </p>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* ══ CONTENT ═══════════════════════════════════════════════════ */}
          {activeTab === 'content' && (
            <div className="cdp-tab-pane">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Linked Content ({campaignContent.length})</span>
                <div style={{ display: 'flex', gap: 8 }}>
                </div>
              </div>

              {isLoadingContent ? (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--paper-text-muted)' }}>Loading…</div>
              ) : campaignContent.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--paper-text-muted)', border: '1px dashed var(--paper-border)', borderRadius: 'var(--radius-sm)' }}>
                  <FileText size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>No content linked</div>
                  <div style={{ fontSize: '0.8rem' }}>Create new content items and they can be linked to this campaign from the Campaigns view.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {campaignContent.map(cc => {
                    const item = cc.content;
                    if (!item) return null;
                    return (
                      <div key={cc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--paper-card)', border: '1px solid var(--paper-border)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--paper-text-muted)', marginTop: 2, display: 'flex', gap: 8 }}>
                            <span>{item.content_type}</span>
                            {item.start_date && <span>· {fmtDate(item.start_date)} → {fmtDate(item.end_date)}</span>}
                            <span className={`status-pill status-${(item.status || 'draft').toLowerCase()}`} style={{ padding: '1px 6px', fontSize: '0.68rem' }}>{item.status}</span>
                          </div>
                        </div>
                        <button
                          className="btn btn-danger tactile-btn"
                          style={{ padding: '4px 9px', fontSize: '0.72rem', flexShrink: 0 }}
                          onClick={() => handleUnlinkContent(range.id, item.id)}
                          title="Unlink from campaign"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Link existing content from all available content */}
              {allContent.filter(c => !campaignContent.some(cc => cc.content_id === c.id)).length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.84rem', marginBottom: 8 }}>Link Existing Content</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {allContent
                      .filter(c => !campaignContent.some(cc => cc.content_id === c.id))
                      .slice(0, 10)
                      .map(c => (
                        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--paper-bg)', border: '1px dashed var(--paper-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                          onClick={async () => {
                            try {
                              await linkContentToCampaign(range.id, c.id);
                              await loadContent();
                            } catch (err) { alert(err.message); }
                          }}
                        >
                          <Plus size={12} style={{ color: 'var(--ingsol-primary)', flexShrink: 0 }} />
                          <span style={{ fontSize: '0.84rem', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--paper-text-muted)' }}>{c.content_type}</span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ ATTACHMENTS ═══════════════════════════════════════════════ */}
          {activeTab === 'attachments' && (
            <div className="cdp-tab-pane">
              {/* File attachments */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Files ({fileAttachments.length})</span>
                  <button className="btn btn-secondary tactile-btn" style={{ padding: '5px 10px', fontSize: '0.75rem' }} onClick={() => fileInputRef.current?.click()}>
                    <Upload size={12} /> Upload
                  </button>
                  <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,video/*" style={{ display: 'none' }} onChange={handleFileSelect} />
                </div>

                {uploadQueue.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                    {uploadQueue.map((item, idx) => (
                      <div key={idx} style={{ padding: '8px 10px', background: 'var(--paper-bg)', border: '1px solid var(--paper-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontWeight: 600 }}>{item.file.name}</span>
                          <button className="btn btn-danger tactile-btn" style={{ padding: '2px 7px' }} onClick={() => setUploadQueue(p => p.filter((_, i) => i !== idx))}><Trash2 size={11} /></button>
                        </div>
                        <input type="text" value={item.managerName} onChange={(e) => setUploadQueue(p => p.map((q, qi) => qi === idx ? { ...q, managerName: e.target.value } : q))} className="input-field-tactile" style={{ padding: '4px 8px', fontSize: '0.8rem' }} />
                        {item.error && <div className="error-message">{item.error}</div>}
                      </div>
                    ))}
                    <button className="btn btn-primary tactile-action-btn" style={{ alignSelf: 'flex-end', padding: '6px 14px', fontSize: '0.8rem' }} onClick={handleUpload}>
                      <Upload size={12} /> Upload {uploadQueue.length} file{uploadQueue.length > 1 ? 's' : ''}
                    </button>
                  </div>
                )}

                {isLoadingAttachments ? (
                  <div style={{ textAlign: 'center', padding: 16, color: 'var(--paper-text-muted)', fontSize: '0.84rem' }}>Loading…</div>
                ) : fileAttachments.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--paper-text-muted)', border: '1px dashed var(--paper-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.84rem' }}>
                    No files attached. Click Upload to add files.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {fileAttachments.map(att => (
                      <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--paper-card)', border: '1px solid var(--paper-border)', borderRadius: 'var(--radius-sm)' }}>
                        <span style={{ fontSize: '1.1rem' }}>{getFileIcon(att.file?.file_type)}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.84rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.file?.manager_name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--paper-text-muted)' }}>{att.file?.original_filename}</div>
                        </div>
                        <button className="btn btn-danger tactile-btn" style={{ padding: '4px 9px', fontSize: '0.72rem' }} onClick={() => handleDeleteAttachment(att)}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Links section */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Links ({linkAttachments.length})</span>
                  <button className="btn btn-secondary tactile-btn" style={{ padding: '5px 10px', fontSize: '0.75rem' }} onClick={() => setShowAddLink(v => !v)}>
                    <Plus size={12} /> Add Link
                  </button>
                </div>

                {showAddLink && (
                  <form onSubmit={handleAddLink} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12, padding: '10px 12px', background: 'var(--paper-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--paper-border)' }}>
                    <input type="text" value={linkName} onChange={(e) => setLinkName(e.target.value)} className="input-field-tactile" placeholder="Link name (optional)" style={{ padding: '6px 10px', fontSize: '0.84rem' }} />
                    <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="input-field-tactile" placeholder="https://..." required style={{ padding: '6px 10px', fontSize: '0.84rem' }} />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="submit" className="btn btn-primary tactile-action-btn" style={{ padding: '5px 12px', fontSize: '0.8rem' }}>Add</button>
                      <button type="button" className="btn btn-secondary tactile-btn" style={{ padding: '5px 12px', fontSize: '0.8rem' }} onClick={() => setShowAddLink(false)}>Cancel</button>
                    </div>
                  </form>
                )}

                {linkAttachments.length === 0 && !showAddLink ? (
                  <div style={{ textAlign: 'center', padding: 16, color: 'var(--paper-text-muted)', border: '1px dashed var(--paper-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.84rem' }}>
                    No links added.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {linkAttachments.map(att => (
                      <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--paper-card)', border: '1px solid var(--paper-border)', borderRadius: 'var(--radius-sm)' }}>
                        <LinkIcon size={14} style={{ color: 'var(--ingsol-primary)', flexShrink: 0 }} />
                        <a href={att.link_url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, fontSize: '0.84rem', fontWeight: 600, color: 'var(--ingsol-primary)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {att.link_name || att.link_url}
                        </a>
                        <button className="btn btn-danger tactile-btn" style={{ padding: '4px 9px', fontSize: '0.72rem' }} onClick={() => handleDeleteAttachment(att)}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ ACTIVITY ══════════════════════════════════════════════════ */}
          {activeTab === 'activity' && (
            <div className="cdp-tab-pane">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 10, padding: '10px 14px', background: 'var(--paper-card)', border: '1px solid var(--paper-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.84rem', alignItems: 'flex-start' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--ingsol-primary)', marginTop: 5, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700 }}>Campaign created</div>
                    <div style={{ color: 'var(--paper-text-muted)', fontSize: '0.75rem' }}>{new Date(range.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  </div>
                </div>
                {fileAttachments.map(att => (
                  <div key={att.id} style={{ display: 'flex', gap: 10, padding: '10px 14px', background: 'var(--paper-card)', border: '1px solid var(--paper-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.84rem', alignItems: 'flex-start' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#d97706', marginTop: 5, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 700 }}>File attached: {att.file?.manager_name}</div>
                      <div style={{ color: 'var(--paper-text-muted)', fontSize: '0.75rem' }}>{new Date(att.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    </div>
                  </div>
                ))}
                {campaignContent.map(cc => cc.content && (
                  <div key={cc.id} style={{ display: 'flex', gap: 10, padding: '10px 14px', background: 'var(--paper-card)', border: '1px solid var(--paper-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.84rem', alignItems: 'flex-start' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#059669', marginTop: 5, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 700 }}>Content added: {cc.content.title}</div>
                      <div style={{ color: 'var(--paper-text-muted)', fontSize: '0.75rem' }}>{new Date(cc.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
