// src/components/CarouselLibraryView.jsx
import React from 'react';
import { PostCardThumbnail, PlatformIcon } from './CalendarView';
import { Sliders } from 'lucide-react';

export default function CarouselLibraryView({ posts, onPostClick }) {
  const carouselPosts = posts.filter(post => post.contentType === 'Carousel');

  return (
    <div className="desk-planner-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 20 }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, borderBottom: '1px solid var(--paper-border)' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 800, color: 'var(--ingsol-dark-navy)' }}>
          Carousel Deck Archives
        </h3>
        <span style={{ fontSize: '0.78rem', color: 'var(--paper-text-muted)', fontWeight: 700 }}>
          {carouselPosts.length} {carouselPosts.length === 1 ? 'deck' : 'decks'} in workspace
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingTop: 16 }}>
        {carouselPosts.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {carouselPosts.map(post => {
              const slideCount = post.carouselSlides?.length || 0;
              return (
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

                  <div className="card-thumbnail-container" style={{ aspectRatio: '16 / 10', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 6, right: 6, zIndex: 2, background: 'rgba(7, 20, 38, 0.85)', color: '#ffffff', fontSize: '0.62rem', padding: '2px 6px', borderRadius: 10, fontWeight: 700 }}>
                      {slideCount} slides
                    </div>
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
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <Sliders className="empty-state-icon" />
            <div className="empty-state-title">No carousels in library</div>
            <div className="empty-state-text">
              Create a new post and choose "Carousel" as the content type to compile decks here.
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
