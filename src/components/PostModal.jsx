// src/components/PostModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import CarouselUploader from './CarouselUploader';
import { getMediaBlob } from '../services/db';
import { X, Upload, FileCheck, Trash2, ExternalLink } from 'lucide-react';

/**
 * Detect which design platform a URL belongs to.
 * Returns { label, color } for the URL field badge.
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
  // Generic design URL — replaces old figmaUrl; read both for backward compat
  const [designUrl, setDesignUrl] = useState('');
  const [publishedUrl, setPublishedUrl] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  
  // File upload states (Single Post, Video, or PDF)
  const [singleFile, setSingleFile] = useState(null);
  const [singleFilePreview, setSingleFilePreview] = useState(null);
  const [singleFileType, setSingleFileType] = useState(null); // 'image' | 'video' | 'pdf'
  const [existingMediaId, setExistingMediaId] = useState(null);
  const [existingMimeType, setExistingMimeType] = useState(null);

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
      // Backward compat: read designUrl OR legacy figmaUrl
      setDesignUrl(post.designUrl || post.figmaUrl || '');
      setPublishedUrl(post.publishedUrl || '');
      setTagsInput(post.tags ? post.tags.join(', ') : '');
      setExistingMediaId(post.mediaId || null);
      setExistingMimeType(post.mediaMimeType || null);

      if (post.contentType === 'Carousel') {
        setCarouselSlides(post.carouselSlides || []);
      } else if (post.mediaId) {
        // Load existing media preview
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
      setCarouselSlides([]);
    }

    return () => {
      // Clean up object URLs to prevent leaks
      if (singleFilePreview && singleFilePreview.startsWith('blob:')) {
        URL.revokeObjectURL(singleFilePreview);
      }
    };
  }, [post, datePreset]);

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

  // Form validations
  const validateForm = () => {
    const newErrors = {};

    if (!title.trim()) {
      newErrors.title = 'Post Title is required';
    }

    if (!date) {
      newErrors.date = 'Publish Date is required';
    }

    // Design URL: validate it's a real URL if provided (any platform allowed)
    if (designUrl.trim()) {
      try {
        new URL(designUrl);
      } catch (err) {
        newErrors.designUrl = 'Please enter a valid URL (e.g. https://www.figma.com/design/... or canva.com/design/...)';
      }
    }

    // Published URL validation
    if (publishedUrl.trim()) {
      try {
        new URL(publishedUrl);
      } catch (err) {
        newErrors.publishedUrl = 'Please enter a valid published post URL';
      }
    }

    // Media validation (unless text-only or draft)
    if (contentType !== 'Text') {
      if (contentType === 'Carousel') {
        if (carouselSlides.length === 0) {
          newErrors.media = 'At least 1 slide is required for carousel posts';
        }
      } else {
        if (!singleFile && !existingMediaId) {
          newErrors.media = `${contentType} creative asset is required`;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Helper: determine file category from MIME type
  const getFileType = (file) => {
    if (file.type === 'application/pdf') return 'pdf';
    if (file.type.startsWith('video/')) return 'video';
    return 'image';
  };

  // Helper: derive accept string for the file input
  const getAcceptString = () => {
    if (contentType === 'Video' || contentType === 'Reel') return 'video/*';
    return 'image/*,application/pdf';
  };

  // Render the appropriate preview for the uploaded file
  const renderFilePreview = () => {
    if (!singleFilePreview) return null;
    if (singleFileType === 'pdf' || existingMimeType === 'application/pdf') {
      return (
        <embed
          src={singleFilePreview}
          type="application/pdf"
          style={{ width: '100%', height: '320px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}
        />
      );
    }
    if (singleFileType === 'video' || contentType === 'Video' || contentType === 'Reel') {
      return <video src={singleFilePreview} className="uploaded-preview-image" controls />;
    }
    return <img src={singleFilePreview} alt="Preview" className="uploaded-preview-image" />;
  };

  // Helper: convert a FileList/array into carousel slides and switch mode
  const loadFilesAsCarousel = (fileList) => {
    const imageFiles = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    // Build slide objects (same shape CarouselUploader uses)
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

  // Handle single media file selection — supports multi-select (auto-promotes to Carousel)
  const handleSingleFileSelect = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length > 1) {
      // Multiple images selected → auto-promote to Carousel
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
    // Reset input so same file can be re-selected
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
  const handleSave = () => {
    if (!validateForm()) return;

    // Build the post object
    const postData = {
      id: isEditMode ? post.id : `post_${Date.now()}`,
      title,
      date,
      platform,
      contentType,
      status,
      caption,
      notes,
      designUrl: designUrl.trim(),   // new canonical field
      figmaUrl: designUrl.trim(),    // backward compat for existing code that reads figmaUrl
      publishedUrl,
      tags: tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
      createdAt: isEditMode ? post.createdAt : new Date().toISOString()
    };

    const filesMap = {};

    if (contentType === 'Carousel') {
      // Map slides to file storage
      const slidesMetadata = carouselSlides.map((slide, idx) => {
        const mediaId = slide.mediaId || `media_slide_${Date.now()}_${idx}`;
        
        // If there is a new file uploaded, save it to IndexedDB
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
      // Set the cover slide's mediaId as the post's main mediaId for thumbnails
      postData.mediaId = slidesMetadata[0]?.mediaId || null;
    } else if (contentType !== 'Text') {
      const mediaId = existingMediaId || `media_single_${Date.now()}`;
      postData.mediaId = mediaId;
      postData.carouselSlides = [];
      // Store MIME type so the drawer can render PDF/video correctly
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{isEditMode ? 'Edit Social Post' : 'Create Social Post'}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-grid">
            
            {/* Title */}
            <div className="form-group full-width">
              <label>Post Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`input-field ${errors.title ? 'error' : ''}`}
                placeholder="What Smart Factory Actually Means..."
              />
              {errors.title && <div className="error-message">{errors.title}</div>}
            </div>

            {/* Date */}
            <div className="form-group">
              <label>Publish Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-field"
              />
              {errors.date && <div className="error-message">{errors.date}</div>}
            </div>

            {/* Status */}
            <div className="form-group">
              <label>Post Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="input-field"
              >
                <option value="Draft">🟡 Draft</option>
                <option value="Ready">🔵 Ready</option>
                <option value="Scheduled">🔵 Scheduled</option>
                <option value="Published">🟢 Published</option>
                <option value="Archived">⚪ Archived</option>
              </select>
            </div>

            {/* Platform */}
            <div className="form-group">
              <label>Social Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="input-field"
              >
                <option value="LinkedIn">LinkedIn</option>
                <option value="Instagram">Instagram</option>
                <option value="Facebook">Facebook</option>
                <option value="X">X (Twitter)</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Content Type */}
            <div className="form-group">
              <label>Content Type</label>
              <select
                value={contentType}
                onChange={(e) => {
                  setContentType(e.target.value);
                  setErrors({ ...errors, media: null }); // Clear media errors
                }}
                className="input-field"
              >
                <option value="Single Image">Single Image</option>
                <option value="Carousel">Carousel (PDF/Slides)</option>
                <option value="Video">Video</option>
                <option value="Reel">Reel</option>
                <option value="Story">Story</option>
                <option value="Text">Text-Only</option>
              </select>
            </div>

            {/* Creative Upload (Conditional on Content Type) */}
            {contentType !== 'Text' && (
              <div className="form-group full-width" style={{ marginTop: '4px' }}>
                {contentType === 'Carousel' ? (
                  <CarouselUploader 
                    slides={carouselSlides} 
                    onChange={setCarouselSlides} 
                  />
                ) : (
                  <div>
                    <label>Upload Creative ({contentType}) *</label>
                    {singleFilePreview ? (
                      <div className="uploaded-preview-container">
                        {renderFilePreview()}
                        <div className="uploaded-preview-actions">
                          <button
                            type="button"
                            className="btn btn-danger"
                            style={{ padding: '6px' }}
                            onClick={removeSingleFile}
                            title="Remove file"
                          >
                            <Trash2 size={14} /> Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="upload-dropzone"
                        onClick={() => fileInputRef.current.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleSingleFileDrop}
                      >
                        <Upload className="upload-dropzone-icon" />
                        <div className="upload-dropzone-text">
                          {contentType === 'Video' || contentType === 'Reel'
                            ? 'Click or drag your video here'
                            : 'Click or drag images / PDF here'}
                        </div>
                        <div className="upload-dropzone-sub">
                          {contentType === 'Video' || contentType === 'Reel'
                            ? 'Supports MP4, MOV, WebM'
                            : 'Supports PNG, JPG, WebP, PDF · Select multiple images to auto-create a Carousel'}
                        </div>
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

            {/* Design / Source URL — accepts Figma, Canva, or any URL */}
            <div className="form-group full-width" style={{ marginTop: '4px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Design / Source URL
                {designUrl && (
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '1px 7px',
                    borderRadius: 10,
                    backgroundColor: designPlatform.color + '22',
                    color: designPlatform.color,
                    border: `1px solid ${designPlatform.color}44`
                  }}>
                    {designPlatform.label}
                  </span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  Optional
                </span>
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="url"
                  value={designUrl}
                  onChange={(e) => setDesignUrl(e.target.value)}
                  className={`input-field ${errors.designUrl ? 'error' : ''}`}
                  placeholder="https://www.figma.com/design/... or canva.com/design/..."
                  style={{ flex: 1 }}
                />
                {designUrl && !errors.designUrl && (
                  <a
                    href={designUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn"
                    title={`Open in ${designPlatform.label}`}
                    style={{ padding: '0 12px', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, textDecoration: 'none' }}
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
              {errors.designUrl && <div className="error-message">{errors.designUrl}</div>}
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 3 }}>
                Figma, Canva, Adobe Express, Google Drive, or any website URL
              </div>
            </div>

            {/* Published URL */}
            <div className="form-group full-width">
              <label>Published Post URL (Optional)</label>
              <input
                type="url"
                value={publishedUrl}
                onChange={(e) => setPublishedUrl(e.target.value)}
                className={`input-field ${errors.publishedUrl ? 'error' : ''}`}
                placeholder="https://www.linkedin.com/feed/update/..."
              />
              {errors.publishedUrl && <div className="error-message">{errors.publishedUrl}</div>}
            </div>

            {/* Caption */}
            <div className="form-group full-width">
              <label>Caption / Post Text</label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="input-field"
                placeholder="Type your social media caption here..."
                rows="4"
              />
            </div>

            {/* Internal Notes */}
            <div className="form-group full-width">
              <label>Internal Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input-field"
                placeholder="Add private team notes, approval tasks..."
                rows="2"
              />
            </div>

            {/* Tags */}
            <div className="form-group full-width">
              <label>Tags (Comma separated)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="input-field"
                placeholder="Smart Factory, MES, Industry 4.0"
              />
            </div>

          </div>
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>
            <FileCheck size={16} /> Save Post
          </button>
        </div>
      </div>
    </div>
  );
}
