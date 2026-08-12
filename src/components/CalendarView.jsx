// src/components/CalendarView.jsx
import React, { useState, useEffect } from 'react';
import { getMediaBlob } from '../services/db';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar,
  Layers,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Globe
} from 'lucide-react';

/**
 * Normalize a Date object OR a date string to 'YYYY-MM-DD' using LOCAL time.
 * This avoids UTC conversion bugs (e.g. toISOString() shifts dates in UTC+5:30).
 */
export function normalizeDate(input) {
  if (!input) return '';
  let d;
  if (input instanceof Date) {
    d = input;
  } else {
    // Parse stored date strings ('YYYY-MM-DD') as LOCAL midnight to avoid UTC shift
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

// Subcomponent: Loads blob media from IndexedDB and displays it
export function PostCardThumbnail({ mediaId, title, contentType }) {
  const [imgUrl, setImgUrl] = useState(null);

  useEffect(() => {
    let active = true;
    let url = null;

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
    }

    return () => {
      active = false;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [mediaId]);

  if (imgUrl) {
    return <img src={imgUrl} alt={title} className="card-thumbnail" loading="lazy" />;
  }

  // Styled text card if there is no image
  const bgColors = [
    '#f8fafc', // slate
    '#fff7ed', // orange
    '#f0fdf4', // green
    '#eff6ff', // blue
    '#fdf4ff', // purple
  ];
  // Deterministic bg based on title hash
  let hash = 0;
  for (let i = 0; i < (title || '').length; i++) {
    hash = (title || '').charCodeAt(i) + ((hash << 5) - hash);
  }
  const bg = bgColors[Math.abs(hash) % bgColors.length];

  return (
    <div className="card-text-fallback" style={{ backgroundColor: bg }}>
      <span>{contentType === 'Text' ? 'Text Post' : 'No Media'}</span>
    </div>
  );
}

// Helper for platform icons
export function PlatformIcon({ platform, size = 12 }) {
  const p = (platform || '').toLowerCase();
  if (p === 'linkedin') return <Linkedin size={size} style={{ color: '#0077b5' }} />;
  if (p === 'instagram') return <Instagram size={size} style={{ color: '#e1306c' }} />;
  if (p === 'facebook') return <Facebook size={size} style={{ color: '#1877f2' }} />;
  if (p === 'x' || p === 'twitter') return <span style={{ fontWeight: 'bold', fontSize: size }}>𝕏</span>;
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

  // Month navigation helpers
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

  // Format month name
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

  const handleDragOver = (e, dateStr) => {
    e.preventDefault();
  };

  const handleDragEnter = (e, dateStr) => {
    e.preventDefault();
    setDragOverDate(dateStr);
  };

  const handleDragLeave = (e) => {
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

    // Weekdays row
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="calendar-wrapper">
        <div className="calendar-grid-header">
          {weekdays.map(d => (
            <div key={d} className="weekday-label">{d}</div>
          ))}
        </div>
        <div className="calendar-grid-body" style={{ gridTemplateRows: `repeat(${totalCells / 7}, 1fr)` }}>
          {cells.map(({ date, isCurrentMonth }, idx) => {
            // Use local-time date normalization to avoid UTC timezone offset bugs
            const dateStr = normalizeDate(date);
            const isToday = normalizeDate(new Date()) === dateStr;
            
            // Match posts whose normalized date equals this cell's local date
            const dayPosts = posts.filter(p => normalizeDate(p.date) === dateStr);

            // Debug logging (disabled in production — remove when verified)
            // dayPosts.forEach(post => {
            //   console.log(`[CALENDAR DEBUG] Post: "${post.title}" | Stored: ${post.date} | Normalized: ${normalizeDate(post.date)} | Cell: ${dateStr} | Match: ${normalizeDate(post.date) === dateStr}`);
            // });

            const isDragOver = dragOverDate === dateStr;

            return (
              <div
                key={idx}
                className={`calendar-cell ${isCurrentMonth ? '' : 'outside'} ${isToday ? 'today' : ''} ${isDragOver ? 'drag-over' : ''}`}
                onDragOver={(e) => handleDragOver(e, dateStr)}
                onDragEnter={(e) => handleDragEnter(e, dateStr)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, dateStr)}
              >
                <div className="calendar-cell-header">
                  <div className="date-number">{date.getDate()}</div>
                  <button 
                    className="btn btn-icon" 
                    style={{ border: 'none', background: 'transparent', padding: 2, cursor: 'pointer', opacity: 0.3 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddPostClick(dateStr);
                    }}
                    title="Quick add post"
                  >
                    <Plus size={12} />
                  </button>
                </div>

                {/* Event Card Stack */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflow: 'hidden' }}>
                  {dayPosts.slice(0, 2).map(post => (
                    <div
                      key={post.id}
                      className={`post-card`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, post.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onPostClick(post)}
                    >
                      <div className="card-thumbnail-container">
                        <PostCardThumbnail 
                          mediaId={post.mediaId} 
                          title={post.title} 
                          contentType={post.contentType} 
                        />
                      </div>
                      <div className="card-info">
                        <div className="card-title">{post.title}</div>
                        <div className="card-meta">
                          <div className="card-platform">
                            <PlatformIcon platform={post.platform} />
                            <span style={{ fontSize: '0.62rem' }}>
                              {post.contentType === 'Carousel' ? ` · ${post.carouselSlides?.length || 0} slides` : ''}
                            </span>
                          </div>
                          <div>
                            <span className={`card-status-dot status-${post.status.toLowerCase()}`}></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {dayPosts.length > 2 && (
                    <div 
                      className="cell-plus-more"
                      onClick={() => {
                        setCurrentDate(date);
                        setCalendarViewMode('day');
                      }}
                    >
                      + {dayPosts.length - 2} more
                    </div>
                  )}
                  
                  {/* Empty state shortcut for quick click additions */}
                  {dayPosts.length === 0 && (
                    <div 
                      style={{ flex: 1, cursor: 'pointer' }} 
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
    // Find the Sunday of the current week
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
      <div className="calendar-wrapper">
        <div className="week-grid-body">
          {weekDays.map((day, idx) => {
            // Use local-time date normalization to avoid UTC timezone offset bugs
            const dateStr = normalizeDate(day);
            const dayPosts = posts.filter(p => normalizeDate(p.date) === dateStr);
            const isToday = normalizeDate(new Date()) === dateStr;
            const isDragOver = dragOverDate === dateStr;

            return (
              <div 
                key={idx} 
                className={`week-cell ${isToday ? 'today' : ''} ${isDragOver ? 'drag-over' : ''}`}
                onDragOver={(e) => handleDragOver(e, dateStr)}
                onDragEnter={(e) => handleDragEnter(e, dateStr)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, dateStr)}
              >
                <div className="week-cell-title">
                  {weekdaysNames[idx]}
                  <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                    {day.getDate()} {monthNames[day.getMonth()]}
                  </span>
                </div>
                
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', padding: '6px', fontSize: '0.78rem' }}
                  onClick={() => onAddPostClick(dateStr)}
                >
                  <Plus size={14} /> Add Post
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflowY: 'auto' }}>
                  {dayPosts.map(post => (
                    <div
                      key={post.id}
                      className="post-card"
                      draggable
                      onDragStart={(e) => handleDragStart(e, post.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onPostClick(post)}
                      style={{ padding: '8px' }}
                    >
                      <div className="card-thumbnail-container" style={{ aspectRatio: '16/10' }}>
                        <PostCardThumbnail mediaId={post.mediaId} title={post.title} contentType={post.contentType} />
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
                          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                            <span className={`card-status-dot status-${post.status.toLowerCase()}`}></span>
                            {post.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {dayPosts.length === 0 && (
                    <div style={{ 
                      flex: 1, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      border: '1px dashed var(--border-light)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-muted)',
                      fontSize: '0.75rem',
                      padding: '20px 10px',
                      textAlign: 'center'
                    }}>
                      No posts
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
    // Use local-time date normalization to avoid UTC timezone offset bugs
    const dateStr = normalizeDate(currentDate);
    const dayPosts = posts.filter(p => normalizeDate(p.date) === dateStr);
    const weekdaysNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return (
      <div className="calendar-wrapper">
        <div className="day-grid-body">
          <div className="day-cell">
            <div className="day-cell-title" style={{ fontSize: '1.1rem' }}>
              <div>
                {weekdaysNames[currentDate.getDay()]}, {monthNames[currentDate.getMonth()]} {currentDate.getDate()}, {currentDate.getFullYear()}
              </div>
              <button 
                className="btn btn-primary"
                onClick={() => onAddPostClick(dateStr)}
              >
                <Plus size={16} /> Add Post to this Date
              </button>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: dayPosts.length > 0 ? 'repeat(auto-fill, minmax(260px, 1fr))' : '1fr', 
              gap: 20, 
              flex: 1, 
              overflowY: 'auto',
              padding: '10px 0'
            }}>
              {dayPosts.map(post => (
                <div
                  key={post.id}
                  className="post-card"
                  onClick={() => onPostClick(post)}
                  style={{ padding: '12px', height: 'fit-content' }}
                >
                  <div className="card-thumbnail-container" style={{ aspectRatio: '16 / 9' }}>
                    <PostCardThumbnail mediaId={post.mediaId} title={post.title} contentType={post.contentType} />
                  </div>
                  <div className="card-info" style={{ marginTop: '10px', gap: '8px' }}>
                    <div className="card-title" style={{ fontSize: '0.95rem', fontWeight: 800, webkitLineClamp: 3 }}>
                      {post.title}
                    </div>
                    
                    {post.caption && (
                      <p style={{ 
                        fontSize: '0.78rem', 
                        color: 'var(--text-secondary)',
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

                    <div className="card-meta" style={{ fontSize: '0.75rem', borderTop: '1px solid var(--border-light)', paddingTop: '10px' }}>
                      <div className="card-platform" style={{ gap: '6px' }}>
                        <PlatformIcon platform={post.platform} size={14} />
                        <span style={{ fontWeight: 700 }}>
                          {post.platform} · {post.contentType === 'Carousel' ? `${post.carouselSlides?.length || 0} slides` : post.contentType}
                        </span>
                      </div>
                      <span style={{ display: 'inline-flex', alignItems: 'center', fontWeight: 700 }}>
                        <span className={`card-status-dot status-${post.status.toLowerCase()}`}></span>
                        {post.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {dayPosts.length === 0 && (
                <div className="empty-state" style={{ border: 'none' }}>
                  <Calendar className="empty-state-icon" />
                  <div className="empty-state-title">No posts</div>
                  <div className="empty-state-text">There are no posts for this date.</div>
                  <button className="btn" onClick={() => onAddPostClick(dateStr)}>
                    Create Post
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Visual Navigation Subbar */}
      <div className="filters-bar" style={{ borderBottom: 'none', paddingBottom: 0 }}>
        <div className="date-nav">
          <button className="btn" onClick={handleToday}>Today</button>
          <button className="btn btn-icon" onClick={handlePrev}>
            <ChevronLeft size={16} />
          </button>
          <div className="date-label">{getHeaderTitle()}</div>
          <button className="btn btn-icon" onClick={handleNext}>
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="view-tabs">
          <button 
            className={`tab-btn ${calendarViewMode === 'month' ? 'active' : ''}`}
            onClick={() => setCalendarViewMode('month')}
          >
            Month
          </button>
          <button 
            className={`tab-btn ${calendarViewMode === 'week' ? 'active' : ''}`}
            onClick={() => setCalendarViewMode('week')}
          >
            Week
          </button>
          <button 
            className={`tab-btn ${calendarViewMode === 'day' ? 'active' : ''}`}
            onClick={() => setCalendarViewMode('day')}
          >
            Day
          </button>
        </div>
      </div>

      <div className="content-viewport">
        {calendarViewMode === 'month' && renderMonthView()}
        {calendarViewMode === 'week' && renderWeekView()}
        {calendarViewMode === 'day' && renderDayView()}
      </div>
    </div>
  );
}
