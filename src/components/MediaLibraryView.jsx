// src/components/MediaLibraryView.jsx
import React, { useState } from 'react';
import { PostCardThumbnail, PlatformIcon } from './CalendarView';
import { Image, Video, Sliders, FolderOpen } from 'lucide-react';

export default function MediaLibraryView({ posts, onPostClick }) {
  const [filterType, setFilterType] = useState('all'); // all | images | videos | carousels

  // Filter posts that have media or auto link preview
  const mediaPosts = posts.filter(post => {
    if (post.contentType === 'Text') return false;
    if (!post.mediaId && !post.linkPreviewImage) return false;
    
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
    return `planner-tab-btn ${filterType === type ? 'active' : ''}`;
  };

  return (
    <div className="desk-planner-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 20 }}>
      
      {/* Sub Bar with Media Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, borderBottom: '1px solid var(--paper-border)' }}>
        <div className="planner-view-switch">
          <button className={getTabClass('all')} onClick={() => setFilterType('all')}>All Assets</button>
          <button className={getTabClass('images')} onClick={() => setFilterType('images')}>
            <Image size={12} style={{ marginRight: 4, display: 'inline' }} /> Images
          </button>
          <button className={getTabClass('videos')} onClick={() => setFilterType('videos')}>
            <Video size={12} style={{ marginRight: 4, display: 'inline' }} /> Videos
          </button>
          <button className={getTabClass('carousels')} onClick={() => setFilterType('carousels')}>
            <Sliders size={12} style={{ marginRight: 4, display: 'inline' }} /> Carousel Slides
          </button>
        </div>
        
        <span style={{ fontSize: '0.78rem', color: 'var(--paper-text-muted)', fontWeight: 700 }}>
          {mediaPosts.length} creative {mediaPosts.length === 1 ? 'asset' : 'assets'} archived
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingTop: 16 }}>
        {mediaPosts.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {mediaPosts.map(post => (
              <div 
                key={post.id} 
                className="post-card pinned-paper-card"
                onClick={() => onPostClick(post)}
                style={{ padding: '8px' }}
              >
                <div className="card-metal-pin">
                  <div className="pin-head"></div>
                  <div className="pin-shine"></div>
                  <div className="pin-shadow"></div>
                </div>
                <div className="card-thumbnail-container" style={{ aspectRatio: '16/10' }}>
                  <PostCardThumbnail mediaId={post.mediaId} linkPreviewImage={post.linkPreviewImage} title={post.title} contentType={post.contentType} />
                </div>
                <div className="card-info" style={{ marginTop: 8 }}>
                  <div className="card-title" title={post.title}>{post.title}</div>
                  <div className="card-meta">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <PlatformIcon platform={post.platform} size={11} />
                      {post.platform}
                    </span>
                    <span className={`status-pill status-${post.status.toLowerCase()}`}>
                      {post.status}
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
                ? 'Try uploading or scheduling your first post containing an image or link.' 
                : `There are no media assets matching the filter "${filterType}".`}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
