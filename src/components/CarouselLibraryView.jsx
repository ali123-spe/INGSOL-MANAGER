// src/components/CarouselLibraryView.jsx
import React from 'react';
import { PostCardThumbnail, PlatformIcon } from './CalendarView';
import { Sliders, FolderClosed } from 'lucide-react';

export default function CarouselLibraryView({ posts, onPostClick }) {
  const carouselPosts = posts.filter(post => post.contentType === 'Carousel');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>
      
      <div className="filters-bar" style={{ padding: '0 0 12px 0', borderBottom: '1px solid var(--border-light)', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
          {carouselPosts.length} {carouselPosts.length === 1 ? 'carousel' : 'carousels'} in library
        </span>
      </div>

      <div className="content-viewport" style={{ padding: 0 }}>
        {carouselPosts.length > 0 ? (
          <div className="carousel-library-grid">
            {carouselPosts.map(post => {
              const slideCount = post.carouselSlides?.length || 0;
              return (
                <div 
                  key={post.id} 
                  className="carousel-lib-card"
                  onClick={() => onPostClick(post)}
                >
                  <span className="carousel-lib-slides-count">{slideCount} slides</span>
                  <div className="media-lib-thumb-box" style={{ aspectRatio: '16 / 10' }}>
                    <PostCardThumbnail mediaId={post.mediaId} title={post.title} contentType={post.contentType} />
                  </div>
                  <div className="media-lib-info" style={{ padding: '12px' }}>
                    <div className="media-lib-title" style={{ fontSize: '0.85rem', fontWeight: 800 }} title={post.title}>
                      {post.title}
                    </div>
                    <div className="media-lib-meta" style={{ marginTop: 6 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <PlatformIcon platform={post.platform} size={10} />
                        {post.platform}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <span className={`card-status-dot status-${post.status.toLowerCase()}`}></span>
                        {post.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <Sliders className="empty-state-icon" />
            <div className="empty-state-title">No carousels in library</div>
            <div className="empty-state-text">
              Create a new post and choose "Carousel" as the content type to see it compiled here.
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
