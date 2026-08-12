// src/components/CarouselViewer.jsx
import React, { useState, useEffect } from 'react';
import { getMediaBlob } from '../services/db';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, X } from 'lucide-react';

// Subcomponent: Loads slide blob asynchronously
export function SlideImage({ mediaId, className, style }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let active = true;
    let objectUrl = null;

    if (mediaId) {
      getMediaBlob(mediaId)
        .then(blob => {
          if (blob && active) {
            objectUrl = URL.createObjectURL(blob);
            setUrl(objectUrl);
          }
        })
        .catch(err => {
          console.error("Error loading slide image blob:", err);
        });
    }

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [mediaId]);

  if (!url) {
    return (
      <div 
        className={className} 
        style={{ 
          ...style, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          backgroundColor: 'var(--bg-tertiary)',
          color: 'var(--text-muted)',
          fontSize: '0.88rem' 
        }}
      >
        Loading slide creative...
      </div>
    );
  }

  return <img src={url} alt="Carousel Slide" className={className} style={style} />;
}

export default function CarouselViewer({ slides = [], onEscapeClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const totalSlides = slides.length;
  const currentSlide = slides[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : totalSlides - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < totalSlides - 1 ? prev + 1 : 0));
  };

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't interfere if user is typing in a form input or textarea
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'Escape') {
        if (isFullscreen) {
          e.preventDefault();
          setIsFullscreen(false);
        } else if (onEscapeClose) {
          e.preventDefault();
          onEscapeClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentIndex, isFullscreen, totalSlides, onEscapeClose]);

  if (totalSlides === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
        No slides in this carousel.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      
      {/* Slide Image Preview Container */}
      <div className="details-preview-panel">
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 10', backgroundColor: 'var(--bg-tertiary)' }}>
          <SlideImage 
            mediaId={currentSlide.mediaId} 
            className="details-preview-media"
            style={{ width: '100%', height: '100%' }}
          />
          
          {/* Fullscreen Button */}
          <button 
            type="button"
            className="btn btn-icon"
            style={{ 
              position: 'absolute', 
              top: 10, 
              right: 10, 
              backgroundColor: 'rgba(15, 23, 42, 0.7)', 
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-sm)'
            }}
            onClick={() => setIsFullscreen(true)}
            title="Open Fullscreen Preview"
          >
            <Maximize2 size={14} />
          </button>
        </div>

        {/* Carousel Slide Navigation Row */}
        <div className="carousel-nav-overlay">
          <button className="btn btn-icon" onClick={handlePrev} title="Previous slide">
            <ChevronLeft size={16} />
          </button>
          <div className="carousel-slide-counter">
            Slide {currentIndex + 1} of {totalSlides}
          </div>
          <button className="btn btn-icon" onClick={handleNext} title="Next slide">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Numeric Thumbnails Row */}
      <div className="carousel-thumbnails-row">
        {slides.map((slide, idx) => {
          const slideNumLabel = String(idx + 1).padStart(2, '0');
          const isActive = idx === currentIndex;
          return (
            <button
              key={slide.id || idx}
              onClick={() => setCurrentIndex(idx)}
              className={`carousel-thumb-nav-btn ${isActive ? 'active' : ''}`}
            >
              {slideNumLabel}
            </button>
          );
        })}
      </div>

      {/* Fullscreen Modal View */}
      {isFullscreen && (
        <div className="fullscreen-viewer">
          <button 
            className="fullscreen-close" 
            onClick={() => setIsFullscreen(false)}
            title="Close fullscreen (Esc)"
          >
            <X size={20} />
          </button>

          <SlideImage 
            mediaId={currentSlide.mediaId} 
            className="fullscreen-media"
          />

          <div className="fullscreen-nav-bar">
            <button 
              className="btn btn-icon" 
              style={{ border: 'none', background: 'transparent', color: 'white' }}
              onClick={handlePrev}
            >
              <ChevronLeft size={24} />
            </button>
            <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>
              Slide {currentIndex + 1} of {totalSlides}
            </span>
            <button 
              className="btn btn-icon" 
              style={{ border: 'none', background: 'transparent', color: 'white' }}
              onClick={handleNext}
            >
              <ChevronRight size={24} />
            </button>
            <button 
              className="btn btn-icon" 
              style={{ border: 'none', background: 'transparent', color: 'white', marginLeft: 10 }}
              onClick={() => setIsFullscreen(false)}
              title="Exit Fullscreen"
            >
              <Minimize2 size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
