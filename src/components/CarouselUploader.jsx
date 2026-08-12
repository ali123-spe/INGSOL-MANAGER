// src/components/CarouselUploader.jsx
import React, { useRef, useState, useEffect } from 'react';
import { getMediaBlob } from '../services/db';
import { Upload, X, ArrowLeftRight, FileUp } from 'lucide-react';

function SlideCard({ slide, index, onDragStart, onDragOver, onDrop, onDelete, onReplace }) {
  const [url, setUrl] = useState(slide.imageUrl || null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    let objectUrl = null;

    if (slide.imageUrl) {
      setUrl(slide.imageUrl);
    } else if (slide.mediaId) {
      getMediaBlob(slide.mediaId)
        .then(blob => {
          if (blob && active) {
            objectUrl = URL.createObjectURL(blob);
            setUrl(objectUrl);
          }
        })
        .catch(err => {
          console.error("Error loading slide blob:", err);
        });
    }

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [slide.imageUrl, slide.mediaId]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onReplace(index, file);
    }
  };

  return (
    <div
      className="slide-upload-card"
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e)}
      onDrop={(e) => onDrop(e, index)}
    >
      <div className="slide-badge-number">{index + 1}</div>
      
      {url ? (
        <img src={url} alt={`Slide ${index + 1}`} className="slide-upload-thumb" />
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
          Loading...
        </div>
      )}

      {/* Delete button */}
      <button 
        type="button" 
        className="slide-card-delete" 
        onClick={(e) => {
          e.stopPropagation();
          onDelete(index);
        }}
        title="Delete slide"
      >
        <X size={12} />
      </button>

      {/* Replace slide icon/button */}
      <div 
        style={{
          position: 'absolute',
          bottom: 4,
          right: 4,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          color: 'white',
          padding: '2px 4px',
          borderRadius: '4px',
          fontSize: '0.6rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          fontWeight: 700
        }}
        onClick={(e) => {
          e.stopPropagation();
          fileInputRef.current.click();
        }}
        title="Replace slide image"
      >
        <FileUp size={10} />
        <span>Swap</span>
      </div>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: 'none' }}
      />
    </div>
  );
}

export default function CarouselUploader({ slides, onChange }) {
  const fileInputRef = useRef(null);
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Handle uploading multiple files
  const processFiles = (files) => {
    const validFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    const newSlides = validFiles.map((file, idx) => {
      const id = `slide_new_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`;
      return {
        id,
        file, // Keep the actual File object so we can save it to IndexedDB later
        imageUrl: URL.createObjectURL(file), // Local preview URL
        originalFileName: file.name,
        order: slides.length + idx + 1
      };
    });

    onChange([...slides, ...newSlides]);
  };

  const handleFileSelect = (e) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  // Drag and drop events for file dropzone
  const handleDropzoneDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Slide reordering logic
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleSlideDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const reorderedSlides = [...slides];
    const [draggedItem] = reorderedSlides.splice(draggedIndex, 1);
    reorderedSlides.splice(targetIndex, 0, draggedItem);

    // Re-assign correct orders
    const updatedSlides = reorderedSlides.map((slide, idx) => ({
      ...slide,
      order: idx + 1
    }));

    onChange(updatedSlides);
    setDraggedIndex(null);
  };

  // Delete slide
  const handleDelete = (indexToDelete) => {
    const remainingSlides = slides.filter((_, idx) => idx !== indexToDelete);
    // Re-assign orders
    const updatedSlides = remainingSlides.map((slide, idx) => ({
      ...slide,
      order: idx + 1
    }));
    onChange(updatedSlides);
  };

  // Replace slide image
  const handleReplace = (indexToReplace, file) => {
    const updatedSlides = [...slides];
    
    // Revoke old local object url if it exists
    if (updatedSlides[indexToReplace].imageUrl && updatedSlides[indexToReplace].imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(updatedSlides[indexToReplace].imageUrl);
    }

    updatedSlides[indexToReplace] = {
      ...updatedSlides[indexToReplace],
      file,
      imageUrl: URL.createObjectURL(file),
      originalFileName: file.name,
      // Clear any mediaId references as this is now a new local file upload
      mediaId: undefined
    };
    onChange(updatedSlides);
  };

  const triggerFileSelect = () => {
    fileInputRef.current.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="slides-manager-header">
        <label>Upload Carousel Slides</label>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
          {slides.length} {slides.length === 1 ? 'slide' : 'slides'} uploaded
        </span>
      </div>

      {slides.length > 0 ? (
        <div>
          <div className="slides-grid">
            {slides.map((slide, index) => (
              <SlideCard
                key={slide.id}
                slide={slide}
                index={index}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleSlideDrop}
                onDelete={handleDelete}
                onReplace={handleReplace}
              />
            ))}
            
            <div className="add-slide-placeholder" onClick={triggerFileSelect}>
              <Upload size={18} />
              <span>+ Add slide</span>
            </div>
          </div>
          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ArrowLeftRight size={10} />
            Drag cards to reorder slides. First slide is used as cover.
          </p>
        </div>
      ) : (
        <div 
          className="upload-dropzone" 
          onClick={triggerFileSelect}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDropzoneDrop}
          style={{ padding: '36px 20px' }}
        >
          <Upload className="upload-dropzone-icon" />
          <div className="upload-dropzone-text">Click or drag images to upload slides</div>
          <div className="upload-dropzone-sub">Support PNG, JPG, WebP, SVG (up to 20+ slides)</div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        multiple
        style={{ display: 'none' }}
      />
    </div>
  );
}
