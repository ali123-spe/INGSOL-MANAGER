// src/components/PostModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import CarouselUploader from './CarouselUploader';
import { getMediaBlob } from '../services/db';
import { 
  X, 
  Upload, 
  Trash2, 
  ExternalLink,
  Calendar,
  Sparkles,
  Link as LinkIcon
} from 'lucide-react';

/**
 * Detect which design platform a URL belongs to.
 */
export function detectDesignPlatform(url) {
  if (!url) return { label: 'Design / Source URL', color: '#64748b' };
  const u = url.toLowerCase();
  if (u.includes('figma.com'))        return { label: 'Figma',          color: '#a259ff' };
  if (u.includes('canva.com'))        return { label: 'Canva',          color: '#00c4cc' };
  if (u.includes('adobe.com') || u.includes('express.adobe'))
                                      return { label: 'Adobe Express',   color: '#ff0000' };
  if (u.includes('penpot.app'))       return { label: 'Penpot',         color: '#7238dc' };
  if (u.includes('sketch.com'))       return { label: 'Sketch',         color: '#f7b500' };
  if (u.includes('notion.so'))        return { label: 'Notion',         color: '#000000' };
  if (u.includes('drive.google.com') || u.includes('docs.google.com'))
                                      return { label: 'Google Drive',    color: '#4285f4' };
  return { label: 'External URL', color: '#64748b' };
}

export default function PostModal({ post, datePreset, onClose, onSave }) {
  const isEditMode = !!post;
  const fileInputRef = useRef(null);

  // Form states
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [platform, setPlatform] = useState('LinkedIn');
  const [contentType, setContentType] = useState('Single Image');
  const [status, setStatus] = useState('Draft');
  const [caption, setCaption] = useState('');
  const [notes, setNotes] = useState('');
  const [designUrl, setDesignUrl] = useState('');
  const [publishedUrl, setPublishedUrl] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  
  // File upload states (Single Post, Video, or PDF)
  const [singleFile, setSingleFile] = useState(null);
  const [singleFilePreview, setSingleFilePreview] = useState(null);
  const [singleFileType, setSingleFileType] = useState(null);
  const [existingMediaId, setExistingMediaId] = useState(null);
  const [existingMimeType, setExistingMimeType] = useState(null);

  // Link Preview states & cache
  const [linkPreviewImage, setLinkPreviewImage] = useState('');
  const [linkPreviewMetadata, setLinkPreviewMetadata] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const previewCache = useRef({});

  // Carousel slides state
  const [carouselSlides, setCarouselSlides] = useState([]);

  // Error states
  const [errors, setErrors] = useState({});

  // Detect design platform from URL (reactive)
  const designPlatform = detectDesignPlatform(designUrl);

  // Load existing post details or date preset
  useEffect(() => {
    if (isEditMode) {
      setTitle(post.title || '');
      setDate(post.date || '');
      setPlatform(post.platform || 'LinkedIn');
      setContentType(post.contentType || 'Single Image');
      setStatus(post.status || 'Draft');
      setCaption(post.caption || '');
      setNotes(post.notes || '');
      setDesignUrl(post.designUrl || post.figmaUrl || '');
      setPublishedUrl(post.publishedUrl || '');
      setTagsInput(post.tags ? post.tags.join(', ') : '');
      setExistingMediaId(post.mediaId || null);
      setExistingMimeType(post.mediaMimeType || null);
      setLinkPreviewImage(post.linkPreviewImage || '');

      if (post.contentType === 'Carousel') {
        setCarouselSlides(post.carouselSlides || []);
      } else if (post.mediaId) {
        getMediaBlob(post.mediaId).then(blob => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            setSingleFilePreview(url);
            const mime = post.mediaMimeType || blob.type || '';
            if (mime === 'application/pdf') setSingleFileType('pdf');
            else if (mime.startsWith('video/')) setSingleFileType('video');
            else setSingleFileType('image');
          }
        });
      }
    } else {
      setDate(datePreset || '');
      setTitle('');
      setPlatform('LinkedIn');
      setContentType('Single Image');
      setStatus('Draft');
      setCaption('');
      setNotes('');
      setDesignUrl('');
      setPublishedUrl('');
      setTagsInput('');
      setSingleFile(null);
      setSingleFilePreview(null);
      setSingleFileType(null);
      setExistingMediaId(null);
      setExistingMimeType(null);
      setLinkPreviewImage('');
      setLinkPreviewMetadata(null);
      setCarouselSlides([]);
    }

    return () => {
      if (singleFilePreview && singleFilePreview.startsWith('blob:')) {
        URL.revokeObjectURL(singleFilePreview);
      }
    };
  }, [post, datePreset]);

  // Effect to automatically detect URL, debounce request, and fetch link preview
  useEffect(() => {
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    let match = urlRegex.exec(caption);
    if (!match && designUrl) {
      urlRegex.lastIndex = 0;
      match = urlRegex.exec(designUrl);
    }
    const detectedUrl = match ? match[1] : '';

    if (!detectedUrl) {
      setLinkPreviewImage('');
      setLinkPreviewMetadata(null);
      return;
    }

    if (previewCache.current[detectedUrl]) {
      const cached = previewCache.current[detectedUrl];
      setLinkPreviewImage(cached.image || '');
      setLinkPreviewMetadata(cached);
      return;
    }

    setIsLoadingPreview(true);
    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(`/api/link-preview?url=${encodeURIComponent(detectedUrl)}`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.image) {
            previewCache.current[detectedUrl] = data;
            setLinkPreviewImage(data.image);
            setLinkPreviewMetadata(data);
          } else {
            setLinkPreviewImage('');
            setLinkPreviewMetadata(null);
          }
        }
      } catch (err) {
        console.error("Error fetching link preview:", err);
      } finally {
        setIsLoadingPreview(false);
      }
    }, 800);

    return () => {
      clearTimeout(timeoutId);
      setIsLoadingPreview(false);
    };
  }, [caption, designUrl]);

  // Clean up carousel slide previews on unmount
  useEffect(() => {
    return () => {
      carouselSlides.forEach(slide => {
        if (slide.imageUrl && slide.imageUrl.startsWith('blob:')) {
          URL.revokeObjectURL(slide.imageUrl);
        }
      });
    };
  }, [carouselSlides]);

  const ensureAbsoluteUrl = (url) => {
    if (!url) return '';
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    return `https://${trimmed}`;
  };

  // Form validations
  const validateForm = () => {
    const newErrors = {};

    if (!title.trim()) {
      newErrors.title = 'Post Title is required';
    }

    if (!date) {
      newErrors.date = 'Publish Date is required';
    }

    const formattedDesign = ensureAbsoluteUrl(designUrl);
    if (formattedDesign) {
      try {
        new URL(formattedDesign);
      } catch {
        newErrors.designUrl = 'Please enter a valid URL';
      }
    }

    const formattedPublished = ensureAbsoluteUrl(publishedUrl);
    if (formattedPublished) {
      try {
        new URL(formattedPublished);
      } catch {
        newErrors.publishedUrl = 'Please enter a valid URL';
      }
    }

    // Media validation (unless text-only or draft)
    if (contentType !== 'Text') {
      if (contentType === 'Carousel') {
        if (carouselSlides.length === 0) {
          newErrors.media = 'At least 1 slide is required for carousel posts';
        }
      } else {
        if (!singleFile && !existingMediaId && !linkPreviewImage) {
          newErrors.media = `${contentType} creative asset or link preview is required`;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getFileType = (file) => {
    if (file.type === 'application/pdf') return 'pdf';
    if (file.type.startsWith('video/')) return 'video';
    return 'image';
  };

  const getAcceptString = () => {
    if (contentType === 'Video' || contentType === 'Reel') return 'video/*';
    return 'image/*,application/pdf';
  };

  const renderFilePreview = () => {
    if (!singleFilePreview) return null;
    if (singleFileType === 'pdf' || existingMimeType === 'application/pdf') {
      return (
        <embed
          src={singleFilePreview}
          type="application/pdf"
          style={{ width: '100%', height: '300px', borderRadius: 'var(--radius-sm)' }}
        />
      );
    }
    if (singleFileType === 'video' || contentType === 'Video' || contentType === 'Reel') {
      return <video src={singleFilePreview} className="uploaded-preview-image" controls />;
    }
    return <img src={singleFilePreview} alt="Preview" className="uploaded-preview-image" />;
  };

  const loadFilesAsCarousel = (fileList) => {
    const imageFiles = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    const newSlides = imageFiles.map((file, idx) => ({
      id: `slide_new_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
      file,
      imageUrl: URL.createObjectURL(file),
      originalFileName: file.name,
      order: idx + 1
    }));

    setContentType('Carousel');
    setCarouselSlides(newSlides);
    if (singleFilePreview && singleFilePreview.startsWith('blob:')) {
      URL.revokeObjectURL(singleFilePreview);
    }
    setSingleFile(null);
    setSingleFilePreview(null);
    setSingleFileType(null);
    setExistingMediaId(null);
    setExistingMimeType(null);
    setErrors(prev => ({ ...prev, media: null }));
  };

  const handleSingleFileSelect = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length > 1) {
      loadFilesAsCarousel(files);
    } else {
      const file = files[0];
      const fType = getFileType(file);
      setSingleFile(file);
      setSingleFileType(fType);
      if (singleFilePreview && singleFilePreview.startsWith('blob:')) {
        URL.revokeObjectURL(singleFilePreview);
      }
      setSingleFilePreview(URL.createObjectURL(file));
      setExistingMediaId(null);
      setExistingMimeType(null);
    }
    e.target.value = '';
  };

  const handleSingleFileDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    const videoFiles = Array.from(files).filter(f => f.type.startsWith('video/'));
    const pdfFiles = Array.from(files).filter(f => f.type === 'application/pdf');

    if (imageFiles.length > 1) {
      loadFilesAsCarousel(imageFiles);
    } else {
      const file = imageFiles[0] || videoFiles[0] || pdfFiles[0] || files[0];
      if (!file) return;
      const fType = getFileType(file);
      setSingleFile(file);
      setSingleFileType(fType);
      if (singleFilePreview && singleFilePreview.startsWith('blob:')) {
        URL.revokeObjectURL(singleFilePreview);
      }
      setSingleFilePreview(URL.createObjectURL(file));
      setExistingMediaId(null);
      setExistingMimeType(null);
    }
  };

  const removeSingleFile = () => {
    setSingleFile(null);
    if (singleFilePreview && singleFilePreview.startsWith('blob:')) {
      URL.revokeObjectURL(singleFilePreview);
    }
    setSingleFilePreview(null);
    setSingleFileType(null);
    setExistingMediaId(null);
    setExistingMimeType(null);
  };

  // Submit Handler
  const handleSave = (forcedStatus) => {
    if (!validateForm()) return;

    const finalDesignUrl = ensureAbsoluteUrl(designUrl);
    const finalPublishedUrl = ensureAbsoluteUrl(publishedUrl);
    const finalStatus = forcedStatus || status;

    const postData = {
      id: isEditMode ? post.id : `post_${Date.now()}`,
      title,
      date,
      platform,
      contentType,
      status: finalStatus,
      caption,
      notes,
      designUrl: finalDesignUrl,
      figmaUrl: finalDesignUrl,
      publishedUrl: finalPublishedUrl,
      tags: tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
      createdAt: isEditMode ? post.createdAt : new Date().toISOString(),
      linkPreviewImage: linkPreviewImage
    };

    const filesMap = {};

    if (contentType === 'Carousel') {
      const slidesMetadata = carouselSlides.map((slide, idx) => {
        const mediaId = slide.mediaId || `media_slide_${Date.now()}_${idx}`;
        if (slide.file) {
          filesMap[mediaId] = slide.file;
        }

        return {
          id: slide.id,
          order: idx + 1,
          mediaId,
          originalFileName: slide.originalFileName
        };
      });

      postData.carouselSlides = slidesMetadata;
      postData.mediaId = slidesMetadata[0]?.mediaId || null;
    } else if (contentType !== 'Text') {
      const mediaId = existingMediaId || `media_single_${Date.now()}`;
      postData.mediaId = singleFile ? mediaId : (existingMediaId || null);
      postData.carouselSlides = [];
      postData.mediaMimeType = singleFile ? singleFile.type : (existingMimeType || null);

      if (singleFile) {
        filesMap[mediaId] = singleFile;
      }
    } else {
      postData.mediaId = null;
      postData.carouselSlides = [];
    }

    onSave(postData, filesMap);
  };

  const platformsList = [
    { id: 'LinkedIn', label: 'LinkedIn', color: '#024791' },
    { id: 'Instagram', label: 'Instagram', color: '#e1306c' },
    { id: 'Facebook', label: 'Facebook', color: '#1877f2' },
    { id: 'X', label: 'X (Twitter)', color: '#111827' },
    { id: 'Other', label: 'Other', color: '#545454' }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container physical-sheet-modal" onClick={(e) => e.stopPropagation()}>
        
        {/* Metal eyelet/staple accent */}
        <div className="sheet-staple-accent"></div>

        <div className="modal-header paper-sheet-header">
          <div className="modal-header-text">
            <span className="sheet-kicker">CONTENT MANIFEST</span>
            <h2 className="modal-title">{isEditMode ? 'Edit Social Post' : 'Create Social Post'}</h2>
          </div>
          <button className="modal-close tactile-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body paper-sheet-body">
          <div className="form-grid">
            
            {/* Title */}
            <div className="form-group full-width">
              <label>Post Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`input-field-tactile ${errors.title ? 'error' : ''}`}
                placeholder="e.g. Industry 4.0 Predictive Maintenance Case Study"
              />
              {errors.title && <div className="error-message">{errors.title}</div>}
            </div>

            {/* Platform Selector Pills */}
            <div className="form-group full-width">
              <label>Target Social Network</label>
              <div className="platform-pills-row">
                {platformsList.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlatform(p.id)}
                    className={`platform-pill-btn ${platform === p.id ? 'active' : ''}`}
                  >
                    <span className="pill-dot" style={{ backgroundColor: p.color }}></span>
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div className="form-group">
              <label>Publish Date *</label>
              <div className="input-with-icon">
                <Calendar size={15} className="input-prefix-icon" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input-field-tactile"
                />
              </div>
              {errors.date && <div className="error-message">{errors.date}</div>}
            </div>

            {/* Format / Content Type */}
            <div className="form-group">
              <label>Content Format</label>
              <select
                value={contentType}
                onChange={(e) => {
                  setContentType(e.target.value);
                  setErrors({ ...errors, media: null });
                }}
                className="filter-select-tactile"
              >
                <option value="Single Image">Single Image</option>
                <option value="Carousel">Carousel (PDF/Slides)</option>
                <option value="Video">Video</option>
                <option value="Reel">Reel</option>
                <option value="Story">Story</option>
                <option value="Text">Text-Only</option>
              </select>
            </div>

            {/* Caption (URL Detection active here) */}
            <div className="form-group full-width">
              <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Caption & Body Copy</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--ingsol-secondary)', fontWeight: 600 }}>
                  <Sparkles size={11} style={{ display: 'inline', marginRight: 3 }} />
                  Paste any URL to auto-extract preview image
                </span>
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="input-field-tactile"
                placeholder="Write your caption here or paste any article URL (e.g. https://example.com/smart-factory)..."
                rows="4"
              />
            </div>

            {/* Automatic Link Preview Card (If extracted) */}
            {linkPreviewImage && !singleFilePreview && (
              <div className="form-group full-width">
                <div className="link-preview-detected-card">
                  <div className="detected-badge">
                    <LinkIcon size={12} /> Auto-Fetched Link Preview
                  </div>
                  <div className="detected-content">
                    <img src={linkPreviewImage} alt="Link Preview" className="detected-img" />
                    <div className="detected-meta">
                      <div className="detected-title">
                        {linkPreviewMetadata?.title || title || 'Web Preview Document'}
                      </div>
                      <div className="detected-desc">
                        {linkPreviewMetadata?.description || 'Image will be pinned onto your desk calendar.'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Creative Upload (Single / Carousel) */}
            {contentType !== 'Text' && (
              <div className="form-group full-width" style={{ marginTop: '2px' }}>
                {contentType === 'Carousel' ? (
                  <CarouselUploader 
                    slides={carouselSlides} 
                    onChange={setCarouselSlides} 
                  />
                ) : (
                  <div>
                    <label>Creative Visual Asset ({contentType})</label>
                    {singleFilePreview ? (
                      <div className="uploaded-preview-container paper-inset-frame">
                        {renderFilePreview()}
                        <div className="uploaded-preview-actions">
                          <button
                            type="button"
                            className="btn btn-danger tactile-btn"
                            style={{ padding: '6px 12px' }}
                            onClick={removeSingleFile}
                            title="Remove file"
                          >
                            <Trash2 size={13} /> Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="upload-dropzone paper-dropzone-tactile"
                        onClick={() => fileInputRef.current.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleSingleFileDrop}
                      >
                        {isLoadingPreview ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                            <div className="spinner" style={{ width: 24, height: 24, border: '3px solid var(--paper-border)', borderTopColor: 'var(--ingsol-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                            <span style={{ fontSize: '0.82rem', color: 'var(--paper-text-muted)', fontWeight: 600 }}>Extracting web link preview...</span>
                          </div>
                        ) : (
                          <>
                            <Upload className="upload-dropzone-icon" />
                            <div className="upload-dropzone-text">
                              {contentType === 'Video' || contentType === 'Reel'
                                ? 'Click or drop video asset here'
                                : 'Click or drop manual image / PDF here'}
                            </div>
                            <div className="upload-dropzone-sub">
                              {contentType === 'Video' || contentType === 'Reel'
                                ? 'Supports MP4, MOV, WebM'
                                : 'Supports PNG, JPG, WebP, PDF · Overrides automatic URL preview'}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleSingleFileSelect}
                      accept={getAcceptString()}
                      multiple={contentType !== 'Video' && contentType !== 'Reel'}
                      style={{ display: 'none' }}
                    />
                  </div>
                )}
                {errors.media && <div className="error-message">{errors.media}</div>}
              </div>
            )}

            {/* Design / Source URL */}
            <div className="form-group full-width">
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Source / Design File</span>
                {designUrl && (
                  <span className="badge badge-platform-tactile" style={{ fontSize: '0.65rem' }}>
                    {designPlatform.label}
                  </span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--paper-text-muted)', fontWeight: 500 }}>
                  Optional
                </span>
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="url"
                  value={designUrl}
                  onChange={(e) => setDesignUrl(e.target.value)}
                  className={`input-field-tactile ${errors.designUrl ? 'error' : ''}`}
                  placeholder="https://www.figma.com/design/... or canva.com/design/..."
                  style={{ flex: 1 }}
                />
                {designUrl && !errors.designUrl && (
                  <a
                    href={designUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary tactile-btn"
                    title={`Open in ${designPlatform.label}`}
                    style={{ padding: '0 12px', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, textDecoration: 'none' }}
                  >
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>
              {errors.designUrl && <div className="error-message">{errors.designUrl}</div>}
            </div>

            {/* Internal Notes */}
            <div className="form-group full-width">
              <label>Internal Team Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input-field-tactile"
                placeholder="Review approvals, campaign targets, production instructions..."
                rows="2"
              />
            </div>

            {/* Tags */}
            <div className="form-group full-width">
              <label>Campaign Tags (Comma separated)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="input-field-tactile"
                placeholder="Smart Factory, MES, Automation, Industry 4.0"
              />
            </div>

          </div>
        </div>

        {/* Modal Footer with Tactile Action Buttons */}
        <div className="modal-footer paper-sheet-footer">
          <button className="btn btn-secondary tactile-btn" onClick={onClose}>
            Cancel
          </button>
          
          <div style={{ display: 'flex', gap: 10 }}>
            <button 
              className="btn btn-secondary tactile-btn" 
              onClick={() => handleSave('Draft')}
            >
              Save Draft
            </button>
            <button 
              className="btn btn-primary tactile-action-btn" 
              onClick={() => handleSave(status === 'Draft' ? 'Scheduled' : status)}
            >
              {isEditMode ? 'Update Post' : 'Schedule Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
