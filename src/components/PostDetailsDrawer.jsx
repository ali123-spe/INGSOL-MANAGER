// src/components/PostDetailsDrawer.jsx
import React, { useState, useEffect } from 'react';
import CarouselViewer from './CarouselViewer';
import { getMediaBlob } from '../services/db';
import { PlatformIcon } from './CalendarView';
import { detectDesignPlatform } from './PostModal';
import { 
  X, 
  ExternalLink, 
  Edit3, 
  Copy, 
  Trash2, 
  Check, 
  AlertTriangle,
  Monitor
} from 'lucide-react';

export default function PostDetailsDrawer({ 
  post, 
  onClose, 
  onEdit, 
  onDuplicate, 
  onDelete, 
  onStatusChange 
}) {
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [singleMediaUrl, setSingleMediaUrl] = useState(null);
  const [singleMimeType, setSingleMimeType] = useState(null);
  // iframe viewer for Design URL
  const [showIframeModal, setShowIframeModal] = useState(false);

  // Load single media blob if applicable
  useEffect(() => {
    let active = true;
    let url = null;

    if (post && post.contentType !== 'Carousel' && post.contentType !== 'Text' && post.mediaId) {
      getMediaBlob(post.mediaId)
        .then(blob => {
          if (blob && active) {
            url = URL.createObjectURL(blob);
            setSingleMediaUrl(url);
            setSingleMimeType(post.mediaMimeType || blob.type || null);
          }
        })
        .catch(err => {
          console.error("Error loading drawer media:", err);
        });
    } else {
      setSingleMediaUrl(null);
      setSingleMimeType(null);
    }

    return () => {
      active = false;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [post]);

  if (!post) return null;

  // Canonical design URL — read new field or fall back to legacy figmaUrl
  const designUrl = post.designUrl || post.figmaUrl || '';
  const designPlatform = detectDesignPlatform(designUrl);

  const handleCopyCaption = () => {
    if (post.caption) {
      navigator.clipboard.writeText(post.caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEditClick = () => {
    onEdit(post);
  };

  const handleDuplicateClick = () => {
    onDuplicate(post);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    onDelete(post.id);
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleDesignRedirect = () => {
    if (designUrl) {
      window.open(designUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handlePublishedRedirect = () => {
    if (post.publishedUrl) {
      window.open(post.publishedUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <>
      <div className="drawer-container">
        
        {/* Drawer Header */}
        <div className="drawer-header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Post Details
            </span>
            <div className="details-badge-row">
              <span className={`badge badge-platform`}>
                <PlatformIcon platform={post.platform} size={10} />
                <span style={{ marginLeft: 4 }}>{post.platform}</span>
              </span>
              <span className={`badge`} style={{ 
                backgroundColor: `var(--bg-${post.status.toLowerCase()})`,
                color: `var(--color-${post.status.toLowerCase()})`,
                border: `1px solid var(--border-${post.status.toLowerCase()})`
              }}>
                <span className={`card-status-dot status-${post.status.toLowerCase()}`} style={{ margin: 0, marginRight: 6 }}></span>
                {post.status}
              </span>
            </div>
          </div>
          
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="drawer-body">
          
          {/* Post Title */}
          <h2 className="details-title">{post.title}</h2>

          {/* Visual Creative Content Preview */}
          {post.contentType === 'Carousel' ? (
            <div>
              <div className="details-section-header">Carousel slides ({post.carouselSlides?.length || 0})</div>
              <CarouselViewer slides={post.carouselSlides} onEscapeClose={onClose} />
            </div>
          ) : post.contentType === 'Text' ? (
            <div style={{ padding: '24px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>
              Text-Only Post (No visual assets required)
            </div>
          ) : (
            <div>
              <div className="details-section-header">Creative Asset</div>
              <div className="details-preview-panel">
                {singleMediaUrl ? (
                  singleMimeType === 'application/pdf' ? (
                    <embed
                      src={singleMediaUrl}
                      type="application/pdf"
                      style={{ width: '100%', height: '400px', borderRadius: 'var(--radius-sm)' }}
                    />
                  ) : singleMimeType?.startsWith('video/') || post.contentType === 'Video' || post.contentType === 'Reel' ? (
                    <video src={singleMediaUrl} className="details-preview-media" controls />
                  ) : (
                    <img src={singleMediaUrl} alt={post.title} className="details-preview-media" />
                  )
                ) : (
                  <div style={{ width: '100%', aspectRatio: '16 / 10', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                    Loading creative asset...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions / External Links */}
          <div className="details-links-row">
            <a 
              className={`btn btn-primary btn-link-action`}
              href={designUrl || undefined}
              target="_blank"
              rel="noopener noreferrer"
              style={{ 
                opacity: designUrl ? 1 : 0.4, 
                pointerEvents: designUrl ? 'auto' : 'none', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: 6,
                textDecoration: 'none'
              }}
              title={designUrl ? `Open the editable file in ${designPlatform.label}` : 'No design URL stored'}
            >
              {designUrl && (
                <span style={{
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: 6,
                  backgroundColor: 'rgba(255,255,255,0.2)'
                }}>
                  {designPlatform.label}
                </span>
              )}
              Edit in {designUrl ? designPlatform.label : 'Design Tool'} <ExternalLink size={14} />
            </a>

            {designUrl && (
              <button
                className="btn btn-link-action"
                onClick={() => setShowIframeModal(true)}
                title={`Open ${designPlatform.label} inside this app`}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Monitor size={14} /> Open in App
              </button>
            )}

            <a 
              className={`btn btn-link-action`}
              href={post.publishedUrl || undefined}
              target="_blank"
              rel="noopener noreferrer"
              style={{ 
                opacity: post.publishedUrl ? 1 : 0.4, 
                pointerEvents: post.publishedUrl ? 'auto' : 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                textDecoration: 'none'
              }}
              title={post.publishedUrl ? "View the published social post" : "No published URL stored"}
            >
              View Published <ExternalLink size={14} />
            </a>
          </div>

          <div className="details-divider"></div>

          {/* Post Metadata Table */}
          <div className="details-meta-table">
            <div className="details-meta-label">Date</div>
            <div className="details-meta-value">
              {new Date(post.date).toLocaleDateString(undefined, { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>

            <div className="details-meta-label">Format</div>
            <div className="details-meta-value">{post.contentType}</div>

            {post.contentType === 'Carousel' && (
              <>
                <div className="details-meta-label">Slides</div>
                <div className="details-meta-value">{post.carouselSlides?.length || 0} pages</div>
              </>
            )}

            <div className="details-meta-label">Status</div>
            <div className="details-meta-value">
              <select 
                value={post.status} 
                onChange={(e) => onStatusChange(post.id, e.target.value)}
                style={{
                  padding: '2px 8px',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-primary)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="Draft">Draft</option>
                <option value="Ready">Ready</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Published">Published</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Optional Caption */}
          {post.caption && (
            <div>
              <div className="details-section-header">Caption</div>
              <div className="details-caption-box">
                {post.caption}
                <button 
                  className="copy-caption-btn" 
                  onClick={handleCopyCaption}
                  title="Copy caption to clipboard"
                >
                  {copied ? <Check size={14} style={{ color: 'var(--color-published)' }} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          )}

          {/* Internal Notes */}
          {post.notes && (
            <div>
              <div className="details-section-header">Internal Notes</div>
              <div className="details-notes-box">
                {post.notes}
              </div>
            </div>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div>
              <div className="details-section-header">Tags</div>
              <div className="details-tags">
                {post.tags.map((tag, idx) => (
                  <span key={idx} className="tag-badge">#{tag}</span>
                ))}
              </div>
            </div>
          )}

          <div className="details-divider" style={{ marginTop: '10px' }}></div>

          {/* Primary Operations Footers */}
          <div className="details-footer-actions">
            <button className="btn" onClick={handleEditClick}>
              <Edit3 size={14} /> Edit
            </button>
            <button className="btn" onClick={handleDuplicateClick}>
              Duplicate
            </button>
            <button className="btn btn-danger" onClick={handleDeleteClick}>
              <Trash2 size={14} /> Delete
            </button>
          </div>

        </div>
      </div>

      {/* Delete Confirmation Modal Overlay */}
      {showDeleteConfirm && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-container" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444' }}>
                <AlertTriangle size={18} /> Delete this post?
              </h2>
              <button className="modal-close" onClick={() => setShowDeleteConfirm(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              This will permanently remove the post "<strong>{post.title}</strong>" and its uploaded media slides from your storage. This action cannot be undone.
            </div>
            <div className="modal-footer" style={{ backgroundColor: 'var(--bg-primary)', borderTop: 'none', padding: '12px 24px 20px' }}>
              <button className="btn" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDelete}>Delete Permanently</button>
            </div>
          </div>
        </div>
      )}

      {/* In-App iframe viewer for Design URL */}
      {showIframeModal && designUrl && (
        <div
          className="modal-overlay"
          style={{ zIndex: 1200, padding: 0 }}
          onClick={() => setShowIframeModal(false)}
        >
          <div
            style={{
              width: '96vw',
              height: '94vh',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-light)',
              boxShadow: '0 25px 80px rgba(0,0,0,0.6)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal top bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
              borderBottom: '1px solid var(--border-light)',
              flexShrink: 0,
              backgroundColor: 'var(--bg-secondary)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 8,
                  backgroundColor: designPlatform.color + '22',
                  color: designPlatform.color,
                  border: `1px solid ${designPlatform.color}44`
                }}>
                  {designPlatform.label}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, maxWidth: '60vw', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {designUrl}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <a
                  href={designUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', fontSize: '0.78rem' }}
                >
                  <ExternalLink size={12} /> Open in {designPlatform.label}
                </a>
                <button className="modal-close" onClick={() => setShowIframeModal(false)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* iframe */}
            <iframe
              src={designUrl}
              title={`${designPlatform.label} \u2014 ${post.title}`}
              style={{ flex: 1, border: 'none', width: '100%' }}
              allow="fullscreen"
            />
          </div>
        </div>
      )}
    </>
  );
}
