
// src/components/PostDetailsDrawer.jsx
import React, { useState, useEffect, useRef } from 'react';
import { getMediaBlob } from '../services/db';
import { PlatformIcon } from './CalendarView';
import { detectDesignPlatform } from './PostModal';
import { SlideImage } from './CarouselViewer';
import {
  X,
  ExternalLink,
  Edit3,
  Copy,
  Trash2,
  Check,
  AlertTriangle,
  Monitor,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
} from 'lucide-react';

/* ─── Inline Carousel Viewer (premium rebuild) ─────────────────────────── */
function PremiumCarouselViewer({ slides = [], onEscapeClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const filmRef = useRef(null);
  const total = slides.length;

  const prev = () => setCurrentIndex(i => (i > 0 ? i - 1 : total - 1));
  const next = () => setCurrentIndex(i => (i < total - 1 ? i + 1 : 0));

  /* scroll the filmstrip to keep active thumb visible */
  useEffect(() => {
    if (!filmRef.current) return;
    const thumb = filmRef.current.querySelector(`[data-idx="${currentIndex}"]`);
    if (thumb) thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [currentIndex]);

  /* keyboard nav */
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      else if (e.key === 'Escape') {
        if (isFullscreen) { e.preventDefault(); setIsFullscreen(false); }
        else if (onEscapeClose) { e.preventDefault(); onEscapeClose(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentIndex, isFullscreen, total, onEscapeClose]);

  if (total === 0) return (
    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--paper-text-muted)', fontSize: '0.85rem' }}>
      No slides in this carousel.
    </div>
  );

  const currentSlide = slides[currentIndex];

  return (
    <div className="pv-carousel-root">
      {/* ── Main Slide Stage ── */}
      <div className="pv-slide-stage">
        <SlideImage
          mediaId={currentSlide.mediaId}
          className="pv-slide-img"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />

        {/* Arrow overlays */}
        <button className="pv-arrow pv-arrow-left" onClick={prev} title="Previous slide">
          <ChevronLeft size={20} />
        </button>
        <button className="pv-arrow pv-arrow-right" onClick={next} title="Next slide">
          <ChevronRight size={20} />
        </button>

        {/* Fullscreen trigger */}
        <button
          className="pv-fullscreen-btn"
          onClick={() => setIsFullscreen(true)}
          title="View fullscreen"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {/* ── Counter + dot nav ── */}
      <div className="pv-counter-row">
        <button className="pv-ctrl-btn" onClick={prev}><ChevronLeft size={16} /></button>
        <span className="pv-counter">{currentIndex + 1} / {total}</span>
        <button className="pv-ctrl-btn" onClick={next}><ChevronRight size={16} /></button>
      </div>

      {/* ── Filmstrip ── */}
      <div className="pv-filmstrip" ref={filmRef}>
        {slides.map((slide, idx) => (
          <button
            key={slide.id || idx}
            data-idx={idx}
            className={`pv-film-thumb ${idx === currentIndex ? 'active' : ''}`}
            onClick={() => setCurrentIndex(idx)}
            title={`Slide ${idx + 1}`}
          >
            <SlideImage
              mediaId={slide.mediaId}
              className="pv-film-img"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <span className="pv-film-num">{idx + 1}</span>
          </button>
        ))}
      </div>

      {/* ── Fullscreen overlay ── */}
      {isFullscreen && (
        <div className="pv-fullscreen-overlay">
          <SlideImage
            mediaId={currentSlide.mediaId}
            className="pv-fs-img"
          />
          <div className="pv-fs-bar">
            <button className="pv-fs-ctrl" onClick={prev}><ChevronLeft size={28} /></button>
            <span className="pv-fs-count">{currentIndex + 1} / {total}</span>
            <button className="pv-fs-ctrl" onClick={next}><ChevronRight size={28} /></button>
            <button className="pv-fs-close" onClick={() => setIsFullscreen(false)} title="Exit fullscreen (Esc)">
              <Minimize2 size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Status dot colour map ─────────────────────────────────────────────── */
const STATUS_COLORS = {
  draft: { dot: '#eab308', bg: '#fef9c3', text: '#854d0e' },
  ready: { dot: '#0C86D4', bg: '#e0f2fe', text: '#024791' },
  scheduled: { dot: '#024791', bg: '#dbeafe', text: '#024791' },
  published: { dot: '#16a34a', bg: '#dcfce7', text: '#15803d' },
  archived: { dot: '#64748b', bg: '#f1f5f9', text: '#475569' },
};

/* ─── Main Drawer ───────────────────────────────────────────────────────── */
export default function PostDetailsDrawer({
  post,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
  onStatusChange,
}) {
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [singleMediaUrl, setSingleMediaUrl] = useState(null);
  const [singleMimeType, setSingleMimeType] = useState(null);
  const [showIframeModal, setShowIframeModal] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  /* load blob media */
  useEffect(() => {
    let active = true;
    let url = null;

    if (post && post.contentType !== 'Carousel' && post.contentType !== 'Text') {
      if (post.mediaId) {
        getMediaBlob(post.mediaId)
          .then(blob => {
            if (blob && active) {
              url = URL.createObjectURL(blob);
              setSingleMediaUrl(url);
              setSingleMimeType(post.mediaMimeType || blob.type || null);
            }
          })
          .catch(err => console.error('Drawer media load error:', err));
      } else if (post.linkPreviewImage) {
        setSingleMediaUrl(post.linkPreviewImage);
        setSingleMimeType('image/generic');
      } else {
        setSingleMediaUrl(null);
        setSingleMimeType(null);
      }
    } else {
      setSingleMediaUrl(null);
      setSingleMimeType(null);
    }

    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [post]);

  if (!post) return null;

  const designUrl = post.designUrl || post.figmaUrl || '';
  const designPlatform = detectDesignPlatform(designUrl);
  const statusKey = post.status.toLowerCase();
  const sc = STATUS_COLORS[statusKey] || STATUS_COLORS.draft;

  /* caption expand/collapse */
  const CAPTION_LIMIT = 200;
  const captionIsTruncatable = (post.caption || '').length > CAPTION_LIMIT;
  const visibleCaption = captionExpanded || !captionIsTruncatable
    ? post.caption
    : post.caption?.slice(0, CAPTION_LIMIT) + '…';

  const handleCopy = () => {
    if (post.caption) {
      navigator.clipboard.writeText(post.caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  /* date formatting */
  const formattedDate = post.date
    ? new Date(post.date + 'T00:00:00').toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    : '—';

  const shortDate = post.date
    ? new Date(post.date + 'T00:00:00').toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    : '—';

  /* rendered creative */
  const renderCreative = () => {
    if (post.contentType === 'Carousel') {
      return <PremiumCarouselViewer slides={post.carouselSlides || []} onEscapeClose={onClose} />;
    }
    if (post.contentType === 'Text') {
      return (
        <div className="pv-text-only-badge">
          <span>✦ Text-Only Post</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--paper-text-muted)', marginTop: 4, display: 'block' }}>No visual asset attached</span>
        </div>
      );
    }
    return (
      <div className="pv-single-media-frame">
        {singleMediaUrl ? (
          singleMimeType === 'application/pdf' ? (
            <embed src={singleMediaUrl} type="application/pdf" className="pv-single-embed" />
          ) : singleMimeType?.startsWith('video/') || post.contentType === 'Video' || post.contentType === 'Reel' ? (
            <video src={singleMediaUrl} className="pv-single-video" controls />
          ) : (
            <img src={singleMediaUrl} alt={post.title} className="pv-single-img" />
          )
        ) : (
          <div className="pv-media-loading">
            {post.mediaId ? 'Loading creative…' : 'No creative asset attached'}
          </div>
        )}
      </div>
    );
  };

  const statusOptions = ['Draft', 'Ready', 'Scheduled', 'Published', 'Archived'];

  return (
    <>
      {/* ════════════════════════════════════════════
          DRAWER PANEL
      ════════════════════════════════════════════ */}
      <div className="pv-drawer">

        {/* ── Sticky Header ── */}
        <div className="pv-header">
          <button className="pv-back-btn" onClick={onClose} title="Close">
            <ArrowLeft size={16} />
            <span>Post Details</span>
          </button>
          <div className="pv-header-actions">
            <button
              className="pv-hdr-icon-btn"
              onClick={() => onEdit(post)}
              title="Edit post"
            >
              <Edit3 size={15} />
            </button>
            <button
              className="pv-hdr-icon-btn danger"
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete post"
            >
              <Trash2 size={15} />
            </button>
            <button className="pv-close-btn" onClick={onClose} title="Close">
              <X size={17} />
            </button>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="pv-scroll-body">

          {/* ── Eyebrow: Platform · Status ── */}
          <div className="pv-eyebrow">
            <div className="pv-platform-badge">
              <PlatformIcon platform={post.platform} size={13} />
              <span>{post.platform}</span>
            </div>
            <span className="pv-eyebrow-sep">·</span>
            {/* Clickable status pill */}
            <div className="pv-status-wrapper" style={{ position: 'relative' }}>
              <button
                className="pv-status-pill"
                style={{ background: sc.bg, color: sc.text, borderColor: sc.dot }}
                onClick={() => setStatusMenuOpen(v => !v)}
              >
                <span className="pv-status-dot" style={{ background: sc.dot }} />
                {post.status}
                <ChevronDown size={11} style={{ marginLeft: 3 }} />
              </button>
              {statusMenuOpen && (
                <div className="pv-status-menu">
                  {statusOptions.map(s => {
                    const k = s.toLowerCase();
                    const c = STATUS_COLORS[k] || STATUS_COLORS.draft;
                    return (
                      <button
                        key={s}
                        className="pv-status-opt"
                        style={{ color: c.text }}
                        onClick={() => {
                          onStatusChange(post.id, s);
                          setStatusMenuOpen(false);
                        }}
                      >
                        <span className="pv-status-dot" style={{ background: c.dot }} />
                        {s}
                        {post.status === s && <Check size={12} style={{ marginLeft: 'auto' }} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Title ── */}
          <h2 className="pv-title">{post.title}</h2>

          {/* ── Creative ── */}
          <section className="pv-section pv-section-creative">
            {renderCreative()}
          </section>

          {/* ── Actions Row ── */}
          <section className="pv-section pv-actions-row">
            {designUrl ? (
              <a
                href={designUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="pv-action-primary"
                title={`Edit in ${designPlatform.label}`}
              >
                Edit in {designPlatform.label} <ExternalLink size={13} />
              </a>
            ) : (
              <span className="pv-action-primary disabled">No design file</span>
            )}

            {designUrl && (
              <button
                className="pv-action-secondary"
                onClick={() => setShowIframeModal(true)}
                title="Preview inside app"
              >
                <Monitor size={13} /> Preview
              </button>
            )}

            {post.publishedUrl && (
              <a
                href={post.publishedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="pv-action-secondary"
                title="View live post"
              >
                Open URL <ExternalLink size={13} />
              </a>
            )}

            <button
              className="pv-action-secondary"
              onClick={() => onDuplicate(post)}
              title="Duplicate this post"
            >
              Duplicate
            </button>
          </section>

          {/* ── Divider ── */}
          <div className="pv-divider" />

          {/* ── Details Grid ── */}
          <section className="pv-section">
            <p className="pv-section-label">DETAILS</p>
            <div className="pv-detail-grid">
              <div className="pv-detail-card">
                <span className="pv-detail-card-label">SCHEDULED</span>
                <span className="pv-detail-card-value">{shortDate}</span>
              </div>
              <div className="pv-detail-card">
                <span className="pv-detail-card-label">FORMAT</span>
                <span className="pv-detail-card-value">{post.contentType}</span>
              </div>
              {post.contentType === 'Carousel' && (
                <div className="pv-detail-card">
                  <span className="pv-detail-card-label">SLIDES</span>
                  <span className="pv-detail-card-value">{post.carouselSlides?.length || 0} pages</span>
                </div>
              )}
              <div className="pv-detail-card">
                <span className="pv-detail-card-label">PLATFORM</span>
                <span className="pv-detail-card-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <PlatformIcon platform={post.platform} size={13} />
                  {post.platform}
                </span>
              </div>
            </div>

            {/* Full date separately */}
            <p className="pv-full-date">{formattedDate}</p>
          </section>

          {/* ── Source ── */}
          {designUrl && (
            <>
              <div className="pv-divider" />
              <section className="pv-section">
                <p className="pv-section-label">SOURCE</p>
                <div className="pv-source-row">
                  <span className="pv-source-name">{designPlatform.label}</span>
                  <a
                    href={designUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pv-source-link"
                  >
                    Edit in {designPlatform.label} <ExternalLink size={12} />
                  </a>
                </div>
                <p className="pv-source-url">{designUrl}</p>
              </section>
            </>
          )}

          {/* ── Caption ── */}
          {post.caption && (
            <>
              <div className="pv-divider" />
              <section className="pv-section">
                <div className="pv-caption-header">
                  <p className="pv-section-label">CAPTION / COPY</p>
                  <button className="pv-copy-btn" onClick={handleCopy} title="Copy caption">
                    {copied
                      ? <Check size={13} style={{ color: 'var(--color-published)' }} />
                      : <Copy size={13} />}
                  </button>
                </div>
                <div className="pv-caption-body">
                  <p className="pv-caption-text">{visibleCaption}</p>
                  {captionIsTruncatable && (
                    <button
                      className="pv-show-more-btn"
                      onClick={() => setCaptionExpanded(v => !v)}
                    >
                      {captionExpanded ? (
                        <><ChevronUp size={13} /> Show less</>
                      ) : (
                        <><ChevronDown size={13} /> Show more</>
                      )}
                    </button>
                  )}
                </div>
              </section>
            </>
          )}

          {/* ── Notes ── */}
          {post.notes && (
            <>
              <div className="pv-divider" />
              <section className="pv-section">
                <p className="pv-section-label">INTERNAL NOTES</p>
                <div className="pv-notes-box">{post.notes}</div>
              </section>
            </>
          )}

          {/* ── Published info ── */}
          {post.publishedUrl && (
            <>
              <div className="pv-divider" />
              <section className="pv-section">
                <p className="pv-section-label">PUBLISHED</p>
                <div className="pv-published-row">
                  <PlatformIcon platform={post.platform} size={15} />
                  <span className="pv-published-platform">{post.platform}</span>
                </div>
                <a
                  href={post.publishedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pv-action-primary"
                  style={{ marginTop: 10, display: 'inline-flex', width: 'auto' }}
                >
                  View on {post.platform} <ExternalLink size={13} />
                </a>
              </section>
            </>
          )}

          {/* ── Tags ── */}
          {post.tags && post.tags.length > 0 && (
            <>
              <div className="pv-divider" />
              <section className="pv-section">
                <p className="pv-section-label">CAMPAIGN TAGS</p>
                <div className="pv-tags-row">
                  {post.tags.map((tag, idx) => (
                    <span key={idx} className="pv-tag">#{tag}</span>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* ── Activity ── */}
          <div className="pv-divider" />
          <section className="pv-section" style={{ paddingBottom: 32 }}>
            <p className="pv-section-label">ACTIVITY</p>
            <div className="pv-activity">
              {post.status === 'Published' && (
                <div className="pv-activity-item">
                  <span className="pv-act-dot published" />
                  <div>
                    <span className="pv-act-label">Published</span>
                    <span className="pv-act-date">{shortDate}</span>
                  </div>
                </div>
              )}
              {(post.status === 'Scheduled' || post.status === 'Published') && (
                <div className="pv-activity-item">
                  <span className="pv-act-dot scheduled" />
                  <div>
                    <span className="pv-act-label">Scheduled</span>
                    <span className="pv-act-date">{shortDate}</span>
                  </div>
                </div>
              )}
              <div className="pv-activity-item">
                <span className="pv-act-dot draft" />
                <div>
                  <span className="pv-act-label">Created</span>
                  <span className="pv-act-date">
                    {post.createdAt
                      ? new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                      : shortDate}
                  </span>
                </div>
              </div>
            </div>
          </section>

        </div>
        {/* end scroll body */}
      </div>
      {/* end drawer */}

      {/* ════════════════════════════════════════════
          DELETE CONFIRM MODAL
      ════════════════════════════════════════════ */}
      {showDeleteConfirm && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-container physical-sheet-modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#dc2626' }}>
                <AlertTriangle size={18} /> Delete this post?
              </h2>
              <button className="modal-close tactile-close-btn" onClick={() => setShowDeleteConfirm(false)}>
                <X size={17} />
              </button>
            </div>
            <div className="modal-body" style={{ fontSize: '0.88rem', color: 'var(--paper-text-muted)', lineHeight: 1.55, padding: '16px 24px' }}>
              This will permanently remove <strong>"{post.title}"</strong> and all pinned creative assets from your workspace.
            </div>
            <div className="modal-footer" style={{ borderTop: 'none', padding: '12px 24px 24px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary tactile-btn" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="btn btn-danger tactile-btn" onClick={() => { onDelete(post.id); setShowDeleteConfirm(false); onClose(); }}>Delete Permanently</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          IN-APP IFRAME PREVIEW
      ════════════════════════════════════════════ */}
      {showIframeModal && designUrl && (
        <div
          className="modal-overlay"
          style={{ zIndex: 1200, padding: 0 }}
          onClick={() => setShowIframeModal(false)}
        >
          <div
            className="physical-sheet-modal"
            style={{ width: '96vw', height: '94vh', display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--paper-border)', flexShrink: 0, background: 'var(--paper-bg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="badge badge-platform-tactile">{designPlatform.label}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--paper-text-muted)', fontWeight: 600, maxWidth: '60vw', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{designUrl}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <a href={designUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary tactile-btn" style={{ display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', fontSize: '0.78rem' }}>
                  <ExternalLink size={12} /> Open in {designPlatform.label}
                </a>
                <button className="modal-close tactile-close-btn" onClick={() => setShowIframeModal(false)}><X size={17} /></button>
              </div>
            </div>
            <iframe src={designUrl} title={`${designPlatform.label} — ${post.title}`} style={{ flex: 1, border: 'none', width: '100%' }} allow="fullscreen" />
          </div>
        </div>
      )}
    </>
  );
}
