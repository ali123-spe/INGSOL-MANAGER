// src/components/MediaLibraryView.jsx
import React, { useState } from 'react';
import { PostCardThumbnail, PlatformIcon } from './CalendarView';
import { Image, Video, Sliders, FolderOpen } from 'lucide-react';

export default function MediaLibraryView({ posts, onPostClick }) {
  const [filterType, setFilterType] = useState('all'); // all | images | videos | carousels

  // Filter posts that have media
  const mediaPosts = posts.filter(post => {
    if (post.contentType === 'Text') return false;
    if (!post.mediaId) return false;
    
    if (filterType === 'images') {
      return post.contentType === 'Single Image' || post.contentType === 'Story';
    }
    if (filterType === 'videos') {
      return post.contentType === 'Video' || post.contentType === 'Reel';
    }
    if (filterType === 'carousels') {
      return post.contentType === 'Carousel';
    }
    return true;
  });

  const getTabClass = (type) => {
    return `tab-btn ${filterType === type ? 'active' : ''}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>
      
      {/* Sub Bar with Media Filters */}
      <div className="filters-bar" style={{ padding: '0 0 12px 0', borderBottom: '1px solid var(--border-light)' }}>
        <div className="view-tabs">
          <button className={getTabClass('all')} onClick={() => setFilterType('all')}>All Assets</button>
          <button className={getTabClass('images')} onClick={() => setFilterType('images')}>
            <Image size={12} style={{ marginRight: 4 }} /> Images
          </button>
          <button className={getTabClass('videos')} onClick={() => setFilterType('videos')}>
            <Video size={12} style={{ marginRight: 4 }} /> Videos
          </button>
          <button className={getTabClass('carousels')} onClick={() => setFilterType('carousels')}>
            <Sliders size={12} style={{ marginRight: 4 }} /> Carousel Slides
          </button>
        </div>
        
        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
          {mediaPosts.length} media {mediaPosts.length === 1 ? 'item' : 'items'} found
        </span>
      </div>

      <div className="content-viewport" style={{ padding: 0 }}>
        {mediaPosts.length > 0 ? (
          <div className="media-library-grid">
            {mediaPosts.map(post => (
              <div 
                key={post.id} 
                className="media-lib-card"
                onClick={() => onPostClick(post)}
              >
                <div className="media-lib-thumb-box">
                  <PostCardThumbnail mediaId={post.mediaId} title={post.title} contentType={post.contentType} />
                </div>
                <div className="media-lib-info">
                  <div className="media-lib-title" title={post.title}>{post.title}</div>
                  <div className="media-lib-meta">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <PlatformIcon platform={post.platform} size={10} />
                      {post.platform}
                    </span>
                    <span>
                      {new Date(post.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <FolderOpen className="empty-state-icon" />
            <div className="empty-state-title">No assets found</div>
            <div className="empty-state-text">
              {filterType === 'all' 
                ? 'Try uploading your first post containing an image, carousel, or video.' 
                : `There are no media assets matching the filter "${filterType}".`}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
