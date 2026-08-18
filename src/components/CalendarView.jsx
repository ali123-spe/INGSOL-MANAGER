// src/components/CalendarView.jsx
import React, { useState, useEffect } from 'react';
import { getMediaBlob } from '../services/db';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar,
  Facebook,
  Instagram,
  Linkedin,
  Globe
} from 'lucide-react';

/**
 * Normalize a Date object OR a date string to 'YYYY-MM-DD' using LOCAL time.
 */
export function normalizeDate(input) {
  if (!input) return '';
  let d;
  if (input instanceof Date) {
    d = input;
  } else {
    const parts = String(input).split('-');
    if (parts.length === 3) {
      d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    } else {
      d = new Date(input);
    }
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Deterministic subtle card tilt for realistic physical memo aesthetic (±0.8deg)
 */
function getCardRotation(id) {
  if (!id) return 0;
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Tight rotations — just enough for physical feel, small enough to stay readable
  const rotations = [-0.5, 0.4, -0.3, 0.5, -0.4, 0.3];
  return rotations[Math.abs(hash) % rotations.length];
}

// Subcomponent: Loads blob media from IndexedDB and displays it
export function PostCardThumbnail({ mediaId, linkPreviewImage, title, contentType }) {
  const [imgUrl, setImgUrl] = useState(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    let url = null;
    setHasError(false);

    if (mediaId) {
      getMediaBlob(mediaId)
        .then(blob => {
          if (blob && active) {
            url = URL.createObjectURL(blob);
            setImgUrl(url);
          }
        })
        .catch(err => {
          console.error("Error loading thumbnail blob:", err);
        });
    } else if (linkPreviewImage) {
      setImgUrl(linkPreviewImage);
    } else {
      setImgUrl(null);
    }

    return () => {
      active = false;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [mediaId, linkPreviewImage]);

  if (imgUrl && !hasError) {
    return (
      <img
        src={imgUrl}
        alt={title}
        className="card-thumbnail"
        loading="lazy"
        onError={() => setHasError(true)}
      />
    );
  }

  // Deliberate no-media placeholder
  return (
    <div className="card-no-media-placeholder">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.35 }}>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="m3 9 5-5 4 4 3-3 6 6" />
        <circle cx="8.5" cy="8.5" r="1.5" />
      </svg>
      <span>{contentType === 'Text' ? 'Text only' : 'No preview'}</span>
    </div>
  );
}

// Helper for platform icons
export function PlatformIcon({ platform, size = 11 }) {
  const p = (platform || '').toLowerCase();
  if (p === 'linkedin') return <Linkedin size={size} style={{ color: '#024791' }} />;
  if (p === 'instagram') return <Instagram size={size} style={{ color: '#e1306c' }} />;
  if (p === 'facebook') return <Facebook size={size} style={{ color: '#1877f2' }} />;
  if (p === 'x' || p === 'twitter') return <span style={{ fontWeight: 'bold', fontSize: size, color: '#111827' }}>𝕏</span>;
  return <Globe size={size} style={{ color: '#64748b' }} />;
}

export default function CalendarView({
  posts,
  currentDate,
  setCurrentDate,
  onPostClick,
  onAddPostClick,
  onUpdatePostDate
}) {
  const [calendarViewMode, setCalendarViewMode] = useState('month'); // month | week | day
  const [dragOverDate, setDragOverDate] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrev = () => {
    let nextDate;
    if (calendarViewMode === 'month') {
      nextDate = new Date(year, month - 1, 1);
    } else if (calendarViewMode === 'week') {
      nextDate = new Date(currentDate.setDate(currentDate.getDate() - 7));
    } else {
      nextDate = new Date(currentDate.setDate(currentDate.getDate() - 1));
    }
    setCurrentDate(new Date(nextDate));
  };

  const handleNext = () => {
    let nextDate;
    if (calendarViewMode === 'month') {
      nextDate = new Date(year, month + 1, 1);
    } else if (calendarViewMode === 'week') {
      nextDate = new Date(currentDate.setDate(currentDate.getDate() + 7));
    } else {
      nextDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
    }
    setCurrentDate(new Date(nextDate));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  // DRAG AND DROP HANDLERS
  const handleDragStart = (e, postId) => {
    e.dataTransfer.setData('text/plain', postId);
    e.currentTarget.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDragEnter = (e, dateStr) => {
    e.preventDefault();
    setDragOverDate(dateStr);
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  const handleDrop = (e, dateStr) => {
    e.preventDefault();
    setDragOverDate(null);
    const postId = e.dataTransfer.getData('text/plain');
    if (postId && dateStr) {
      onUpdatePostDate(postId, dateStr);
    }
  };

  // MONTH VIEW LOGIC
  const renderMonthView = () => {
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells = [];

    // Prev month padding cells
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, daysInPrevMonth - i);
      cells.push({ date: prevDate, isCurrentMonth: false });
    }

    // Current month cells
    for (let i = 1; i <= daysInMonth; i++) {
      const currDate = new Date(year, month, i);
      cells.push({ date: currDate, isCurrentMonth: true });
    }

    // Next month padding cells to complete grid row
    const totalCells = Math.ceil(cells.length / 7) * 7;
    const remaining = totalCells - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      cells.push({ date: nextDate, isCurrentMonth: false });
    }

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="calendar-wrapper desk-planner-page">
        <div className="calendar-grid-header">
          {weekdays.map(d => (
            <div key={d} className="weekday-label">{d}</div>
          ))}
        </div>
        <div className="calendar-grid-body" style={{ gridTemplateRows: `repeat(${totalCells / 7}, 1fr)` }}>
          {cells.map(({ date, isCurrentMonth }, idx) => {
            const dateStr = normalizeDate(date);
            const isToday = normalizeDate(new Date()) === dateStr;
            const dayPosts = posts.filter(p => normalizeDate(p.date) === dateStr);
            const isDragOver = dragOverDate === dateStr;

            return (
              <div
                key={idx}
                className={`calendar-cell ${isCurrentMonth ? '' : 'outside'} ${isToday ? 'today-cell' : ''} ${isDragOver ? 'drag-over' : ''}`}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, dateStr)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, dateStr)}
              >
                <div className="calendar-cell-header">
                  <div className={`date-number ${isToday ? 'today-marker' : ''}`}>
                    {date.getDate()}
                  </div>
                  <button 
                    className="cell-add-btn" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddPostClick(dateStr);
                    }}
                    title="Pin new post on this date"
                  >
                    <Plus size={11} />
                  </button>
                </div>

                {/* Pinned Card Stack */}
                <div className="card-stack-container">
                  {dayPosts.slice(0, 2).map(post => {
                    const rot = getCardRotation(post.id);
                    return (
                      <div
                        key={post.id}
                        className="post-card pinned-paper-card"
                        draggable
                        onDragStart={(e) => handleDragStart(e, post.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => onPostClick(post)}
                        style={{ transform: `rotate(${rot}deg)` }}
                      >
                        {/* Metal Pushpin — overlaps top edge */}
                        <div className="card-metal-pin" aria-hidden="true">
                          <div className="pin-head" />
                          <div className="pin-shine" />
                        </div>

                        {/* Image strip */}
                        <div className="card-thumbnail-container">
                          <PostCardThumbnail
                            mediaId={post.mediaId}
                            linkPreviewImage={post.linkPreviewImage}
                            title={post.title}
                            contentType={post.contentType}
                          />
                        </div>

                        {/* Info strip */}
                        <div className="card-info">
                          <div className="card-top-meta">
                            <span className="card-platform-name">
                              <PlatformIcon platform={post.platform} size={10} />
                              <span>{post.platform}</span>
                            </span>
                            <span className={`card-status-chip status-${post.status.toLowerCase()}`}>
                              {post.status}
                            </span>
                          </div>
                          <div className="card-title">
                            {post.title}
                          </div>
                          {post.contentType === 'Carousel' && (
                            <div className="card-slide-count">{post.carouselSlides?.length || 0} slides</div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {dayPosts.length > 2 && (
                    <div 
                      className="cell-plus-more"
                      onClick={() => {
                        setCurrentDate(date);
                        setCalendarViewMode('day');
                      }}
                    >
                      + {dayPosts.length - 2} more pinned
                    </div>
                  )}
                  
                  {dayPosts.length === 0 && (
                    <div 
                      className="cell-empty-hitbox" 
                      onClick={() => onAddPostClick(dateStr)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // WEEK VIEW LOGIC
  const renderWeekView = () => {
    const currentDay = currentDate.getDay();
    const sunday = new Date(currentDate);
    sunday.setDate(currentDate.getDate() - currentDay);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(sunday);
      day.setDate(sunday.getDate() + i);
      weekDays.push(day);
    }

    const weekdaysNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return (
      <div className="calendar-wrapper desk-planner-page">
        <div className="week-grid-body">
          {weekDays.map((day, idx) => {
            const dateStr = normalizeDate(day);
            const dayPosts = posts.filter(p => normalizeDate(p.date) === dateStr);
            const isToday = normalizeDate(new Date()) === dateStr;
            const isDragOver = dragOverDate === dateStr;

            return (
              <div 
                key={idx} 
                className={`week-cell ${isToday ? 'today-cell' : ''} ${isDragOver ? 'drag-over' : ''}`}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, dateStr)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, dateStr)}
              >
                <div className="week-cell-title">
                  <span>{weekdaysNames[idx]}</span>
                  <span className={`date-number-inline ${isToday ? 'today-marker' : ''}`}>
                    {day.getDate()} {monthNames[day.getMonth()]}
                  </span>
                </div>
                
                <button 
                  className="btn btn-secondary tactile-btn" 
                  style={{ width: '100%', padding: '6px', fontSize: '0.76rem', marginBottom: 8 }}
                  onClick={() => onAddPostClick(dateStr)}
                >
                  <Plus size={13} /> Pin Post
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflowY: 'auto' }}>
                  {dayPosts.map(post => (
                    <div
                      key={post.id}
                      className="post-card pinned-paper-card"
                      draggable
                      onDragStart={(e) => handleDragStart(e, post.id)}
                      onDragEnd={handleDragEnd}
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
                      <div className="card-info" style={{ marginTop: '6px', gap: '4px' }}>
                        <div className="card-title" style={{ fontSize: '0.82rem', webkitLineClamp: 3 }}>{post.title}</div>
                        <div className="card-meta" style={{ fontSize: '0.7rem' }}>
                          <div className="card-platform">
                            <PlatformIcon platform={post.platform} />
                            <span>
                              {post.platform} 
                              {post.contentType === 'Carousel' ? ` · ${post.carouselSlides?.length || 0} slides` : ` · ${post.contentType}`}
                            </span>
                          </div>
                          <span className={`status-pill status-${post.status.toLowerCase()}`}>
                            {post.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {dayPosts.length === 0 && (
                    <div className="empty-day-placeholder">
                      No pinned posts
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // DAY VIEW LOGIC
  const renderDayView = () => {
    const dateStr = normalizeDate(currentDate);
    const dayPosts = posts.filter(p => normalizeDate(p.date) === dateStr);
    const weekdaysNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return (
      <div className="calendar-wrapper desk-planner-page">
        <div className="day-grid-body">
          <div className="day-cell">
            <div className="day-cell-title" style={{ fontSize: '1.1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="day-name">{weekdaysNames[currentDate.getDay()]},</span>
                <span style={{ fontWeight: 800, color: 'var(--ingsol-primary)' }}>
                  {monthNames[currentDate.getMonth()]} {currentDate.getDate()}, {currentDate.getFullYear()}
                </span>
              </div>
              <button 
                className="btn btn-primary tactile-action-btn"
                onClick={() => onAddPostClick(dateStr)}
              >
                <Plus size={15} /> Pin Post to this Day
              </button>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: dayPosts.length > 0 ? 'repeat(auto-fill, minmax(260px, 1fr))' : '1fr', 
              gap: 20, 
              flex: 1, 
              overflowY: 'auto',
              padding: '12px 4px'
            }}>
              {dayPosts.map(post => (
                <div
                  key={post.id}
                  className="post-card pinned-paper-card"
                  onClick={() => onPostClick(post)}
                  style={{ padding: '12px', height: 'fit-content' }}
                >
                  <div className="card-metal-pin">
                    <div className="pin-head"></div>
                    <div className="pin-shine"></div>
                    <div className="pin-shadow"></div>
                  </div>

                  <div className="card-thumbnail-container" style={{ aspectRatio: '16 / 9' }}>
                    <PostCardThumbnail mediaId={post.mediaId} linkPreviewImage={post.linkPreviewImage} title={post.title} contentType={post.contentType} />
                  </div>
                  <div className="card-info" style={{ marginTop: '10px', gap: '8px' }}>
                    <div className="card-title" style={{ fontSize: '0.95rem', fontWeight: 800, webkitLineClamp: 3 }}>
                      {post.title}
                    </div>
                    
                    {post.caption && (
                      <p style={{ 
                        fontSize: '0.78rem', 
                        color: 'var(--paper-text-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        webkitLineClamp: 2,
                        webkitBoxOrient: 'vertical',
                        lineHeight: 1.4
                      }}>
                        {post.caption}
                      </p>
                    )}

                    <div className="card-meta" style={{ fontSize: '0.75rem', borderTop: '1px solid var(--paper-border)', paddingTop: '10px' }}>
                      <div className="card-platform" style={{ gap: '6px' }}>
                        <PlatformIcon platform={post.platform} size={13} />
                        <span style={{ fontWeight: 700 }}>
                          {post.platform} · {post.contentType === 'Carousel' ? `${post.carouselSlides?.length || 0} slides` : post.contentType}
                        </span>
                      </div>
                      <span className={`status-pill status-${post.status.toLowerCase()}`}>
                        {post.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {dayPosts.length === 0 && (
                <div className="empty-state">
                  <Calendar className="empty-state-icon" />
                  <div className="empty-state-title">No pinned posts for this date</div>
                  <div className="empty-state-text">Plan your industrial campaigns and pin a creative post onto this page.</div>
                  <button className="btn btn-secondary tactile-btn" onClick={() => onAddPostClick(dateStr)}>
                    Pin New Post
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Header Title formatter depending on mode
  const getHeaderTitle = () => {
    if (calendarViewMode === 'month') {
      return `${monthNames[month]} ${year}`;
    } else if (calendarViewMode === 'week') {
      const currentDay = currentDate.getDay();
      const sunday = new Date(currentDate);
      sunday.setDate(currentDate.getDate() - currentDay);
      const saturday = new Date(sunday);
      saturday.setDate(sunday.getDate() + 6);
      
      if (sunday.getMonth() === saturday.getMonth()) {
        return `${monthNames[sunday.getMonth()]} ${sunday.getFullYear()}`;
      } else if (sunday.getFullYear() === saturday.getFullYear()) {
        return `${monthNames[sunday.getMonth()]} - ${monthNames[saturday.getMonth()]} ${sunday.getFullYear()}`;
      } else {
        return `${monthNames[sunday.getMonth()]} ${sunday.getFullYear()} - ${monthNames[saturday.getMonth()]} ${saturday.getFullYear()}`;
      }
    } else {
      return `${monthNames[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
    }
  };

  return (
    <div className="desk-planner-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      {/* 3D Metal Binder Rings Header */}
      <div className="binder-spine">
        <div className="binder-rings-row">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="binder-ring-unit">
              <div className="ring-hole top"></div>
              <div className="metal-ring"></div>
              <div className="ring-hole bottom"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Tactile Planner Controls Header */}
      <div className="planner-controls-header">
        <div className="date-nav-controls">
          <button className="tactile-control-btn" onClick={handleToday}>Today</button>
          <div className="tactile-btn-group">
            <button className="tactile-icon-btn" onClick={handlePrev} title="Previous">
              <ChevronLeft size={16} />
            </button>
            <button className="tactile-icon-btn" onClick={handleNext} title="Next">
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="planner-month-title">{getHeaderTitle()}</div>
        </div>

        <div className="planner-view-switch">
          <button 
            className={`planner-tab-btn ${calendarViewMode === 'month' ? 'active' : ''}`}
            onClick={() => setCalendarViewMode('month')}
          >
            Month
          </button>
          <button 
            className={`planner-tab-btn ${calendarViewMode === 'week' ? 'active' : ''}`}
            onClick={() => setCalendarViewMode('week')}
          >
            Week
          </button>
          <button 
            className={`planner-tab-btn ${calendarViewMode === 'day' ? 'active' : ''}`}
            onClick={() => setCalendarViewMode('day')}
          >
            Day
          </button>
        </div>
      </div>

      <div className="planner-content-area" style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {calendarViewMode === 'month' && renderMonthView()}
        {calendarViewMode === 'week' && renderWeekView()}
        {calendarViewMode === 'day' && renderDayView()}
      </div>
    </div>
  );
}
