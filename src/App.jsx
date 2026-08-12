// src/App.jsx
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import CalendarView from './components/CalendarView';
import PostModal from './components/PostModal';
import PostDetailsDrawer from './components/PostDetailsDrawer';
import MediaLibraryView from './components/MediaLibraryView';
import CarouselLibraryView from './components/CarouselLibraryView';
import { 
  getAllPosts, 
  savePost, 
  deletePost, 
  seedSampleData 
} from './services/db';
import { 
  Plus, 
  Search, 
  HelpCircle,
  FileDown,
  FileUp,
  RotateCcw,
  Sliders,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import './App.css';

export default function App() {
  const [posts, setPosts] = useState([]);
  
  // Navigation & Filtering
  const [activeView, setActiveView] = useState('calendar'); // calendar | all-posts | drafts | ...
  const [currentDate, setCurrentDate] = useState(new Date(2026, 7, 8)); // August 8, 2026 — local time (avoids UTC parse shift)
  const [searchQuery, setSearchQuery] = useState('');
  
  // Toolbar dropdown filters
  const [filterPlatform, setFilterPlatform] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterContentType, setFilterContentType] = useState('All');

  // Modals & Drawers
  const [selectedPost, setSelectedPost] = useState(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [modalDatePreset, setModalDatePreset] = useState('');
  const [editingPost, setEditingPost] = useState(null);

  // Settings mock states
  const [workspaceName, setWorkspaceName] = useState('Antigravity Marketing');
  const [linkedPlatforms, setLinkedPlatforms] = useState({
    LinkedIn: true,
    Instagram: true,
    Facebook: false,
    X: true,
    Other: false
  });

  // Initialize DB and Seed Data on first launch
  useEffect(() => {
    async function init() {
      try {
        await seedSampleData();
        await refreshPosts();
      } catch (err) {
        console.error("Initialization error:", err);
      }
    }
    init();
  }, []);

  // Fetch all posts from IndexedDB
  const refreshPosts = async () => {
    try {
      const allPosts = await getAllPosts();
      setPosts(allPosts);
      
      // Keep details drawer updated if the active post was modified
      if (selectedPost) {
        const updated = allPosts.find(p => p.id === selectedPost.id);
        if (updated) setSelectedPost(updated);
      }
    } catch (err) {
      console.error("Failed to query posts:", err);
    }
  };

  // Category counts builder for Sidebar
  const getCounts = () => {
    const counts = {
      Draft: 0,
      Scheduled: 0,
      Published: 0,
      Archived: 0,
      carousels: 0
    };

    posts.forEach(post => {
      if (post.status in counts) {
        counts[post.status]++;
      }
      if (post.contentType === 'Carousel') {
        counts.carousels++;
      }
    });

    return counts;
  };

  // Keyboard Shortcuts (N -> New Post, / -> Search)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) {
        return;
      }

      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        // Use local-time date to avoid toISOString() UTC shift
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        handleAddPostClick(`${yyyy}-${mm}-${dd}`);
      } else if (e.key === '/') {
        e.preventDefault();
        document.getElementById('global-search-input')?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Save/Update Post handler
  const handleSavePost = async (postData, filesMap) => {
    try {
      await savePost(postData, filesMap);
      await refreshPosts();
      setIsPostModalOpen(false);
      setEditingPost(null);
    } catch (err) {
      alert("Failed to save post: " + err.message);
    }
  };

  // Delete Post handler
  const handleDeletePost = async (id) => {
    try {
      await deletePost(id);
      await refreshPosts();
      if (selectedPost?.id === id) {
        setSelectedPost(null);
      }
    } catch (err) {
      alert("Failed to delete post: " + err.message);
    }
  };

  // Fast drag & drop date changes update
  const handleUpdatePostDate = async (postId, dateStr) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      const updatedPost = { ...post, date: dateStr };
      await savePost(updatedPost);
      await refreshPosts();
    }
  };

  // Quick Status change inside Drawer
  const handleStatusChange = async (postId, statusStr) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      const updatedPost = { ...post, status: statusStr };
      await savePost(updatedPost);
      await refreshPosts();
    }
  };

  // Duplicate Post logic
  const handleDuplicatePost = (post) => {
    // Copy properties: Reset status to Draft, require new date, DO NOT copy published URL
    const duplicateData = {
      title: `${post.title} (Repurposed)`,
      platform: post.platform,
      contentType: post.contentType,
      status: 'Draft',
      caption: post.caption || '',
      notes: post.notes || '',
      tags: post.tags ? [...post.tags] : [],
      figmaUrl: post.figmaUrl || '',
      publishedUrl: '',
      // Reference existing slide databases
      mediaId: post.mediaId || null,
      carouselSlides: post.carouselSlides ? post.carouselSlides.map(slide => ({
        ...slide,
        id: `slide_dup_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
      })) : []
    };

    setEditingPost(duplicateData);
    setModalDatePreset(''); // Reset date to force date-picker
    setIsPostModalOpen(true);
  };

  // Open modals handlers
  const handleAddPostClick = (dateStr) => {
    setEditingPost(null);
    setModalDatePreset(dateStr);
    setIsPostModalOpen(true);
  };

  const handleEditPostClick = (postToEdit) => {
    setEditingPost(postToEdit);
    setIsPostModalOpen(true);
  };

  // Global filters & searching logic
  const getFilteredPosts = () => {
    return posts.filter(post => {
      // Sidebar selection filtering
      if (activeView === 'drafts' && post.status !== 'Draft') return false;
      if (activeView === 'scheduled' && post.status !== 'Scheduled') return false;
      if (activeView === 'published' && post.status !== 'Published') return false;
      if (activeView === 'archive' && post.status !== 'Archived') return false;
      
      // Dropdown Toolbar Filters
      if (filterPlatform !== 'All' && post.platform !== filterPlatform) return false;
      if (filterStatus !== 'All' && post.status !== filterStatus) return false;
      if (filterContentType !== 'All' && post.contentType !== filterContentType) return false;

      // Global Search string filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (post.title || '').toLowerCase().includes(q);
        const matchesPlatform = (post.platform || '').toLowerCase().includes(q);
        const matchesStatus = (post.status || '').toLowerCase().includes(q);
        const matchesCaption = (post.caption || '').toLowerCase().includes(q);
        const matchesNotes = (post.notes || '').toLowerCase().includes(q);
        const matchesTags = post.tags ? post.tags.some(tag => tag.toLowerCase().includes(q)) : false;

        if (!matchesTitle && !matchesPlatform && !matchesStatus && !matchesCaption && !matchesNotes && !matchesTags) {
          return false;
        }
      }

      return true;
    });
  };

  // Backup DB logic (JSON export/import)
  const handleExportDB = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(posts, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `content_calendar_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Clear filters helper
  const resetFilters = () => {
    setFilterPlatform('All');
    setFilterStatus('All');
    setFilterContentType('All');
    setSearchQuery('');
  };

  const filteredPostsList = getFilteredPosts();

  // RENDER DYNAMIC PANEL VIEWS
  const renderActiveView = () => {
    switch (activeView) {
      case 'calendar':
      case 'drafts':
      case 'scheduled':
      case 'published':
      case 'archive':
        return (
          <CalendarView
            posts={filteredPostsList}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            onPostClick={setSelectedPost}
            onAddPostClick={handleAddPostClick}
            onUpdatePostDate={handleUpdatePostDate}
          />
        );
      
      case 'all-posts':
        return (
          <div className="content-viewport" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem' }}>All Scheduled Postings</h2>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                {filteredPostsList.length} total posts
              </span>
            </div>
            
            {filteredPostsList.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                {filteredPostsList.map(post => (
                  <div
                    key={post.id}
                    className="post-card"
                    onClick={() => setSelectedPost(post)}
                    style={{ padding: '12px' }}
                  >
                    {/* Render visual preview cover slide/image */}
                    <div className="card-thumbnail-container" style={{ aspectRatio: '16 / 10' }}>
                      {post.mediaId ? (
                        <img 
                          src="" // Will be resolved dynamically by subcomponent
                          alt="" 
                          style={{ display: 'none' }} 
                        />
                      ) : null}
                      <CalendarView posts={[]} currentDate={new Date()} onUpdatePostDate={() => {}} /> {/* Dummy element placeholder or let's use the PostCardThumbnail inside CalendarView */}
                      {/* Let's import the PostCardThumbnail manually here for visual fidelity */}
                      <div className="card-thumbnail-container">
                        {post.contentType === 'Carousel' ? (
                          <div style={{ position: 'absolute', top: 6, right: 6, zIndex: 1, backgroundColor: 'rgba(15, 23, 42, 0.8)', color: 'white', fontSize: '0.6rem', padding: '2px 6px', borderRadius: 10, fontWeight: 700 }}>
                            {post.carouselSlides?.length || 0} slides
                          </div>
                        ) : null}
                        {/* We use standard HTML5 rendering or fallback inside the card */}
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-tertiary)' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                            {post.contentType} Post
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="card-info" style={{ marginTop: 10, gap: 4 }}>
                      <div className="card-title" style={{ fontSize: '0.85rem', fontWeight: 800 }}>{post.title}</div>
                      <div className="card-meta" style={{ fontSize: '0.72rem' }}>
                        <span>📅 {post.date}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                          <span className={`card-status-dot status-${post.status.toLowerCase()}`}></span>
                          {post.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Sliders className="empty-state-icon" />
                <div className="empty-state-title">No posts match filters</div>
                <div className="empty-state-text">Try resetting filters to discover scheduled posts.</div>
                <button className="btn" onClick={resetFilters}>Clear Filters</button>
              </div>
            )}
          </div>
        );
      
      case 'media-library':
        return (
          <div className="content-viewport">
            <MediaLibraryView posts={posts} onPostClick={setSelectedPost} />
          </div>
        );
      
      case 'carousels':
        return (
          <div className="content-viewport">
            <CarouselLibraryView posts={posts} onPostClick={setSelectedPost} />
          </div>
        );

      case 'platforms':
        return (
          <div className="content-viewport" style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.25rem' }}>Social Platform Channels</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                Configure which social networks appear in the content dropdown picker.
              </p>
            </div>

            <div style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {Object.keys(linkedPlatforms).map(plat => (
                <div key={plat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{plat} Integration</span>
                  <label className="switch" style={{ position: 'relative', display: 'inline-block', width: 44, height: 24 }}>
                    <input 
                      type="checkbox" 
                      checked={linkedPlatforms[plat]} 
                      onChange={(e) => setLinkedPlatforms({ ...linkedPlatforms, [plat]: e.target.checked })}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
                      backgroundColor: linkedPlatforms[plat] ? 'var(--color-published)' : 'var(--border-dark)', 
                      transition: '.2s', borderRadius: 24
                    }}>
                      <span style={{
                        position: 'absolute', content: '""', height: 16, width: 16, left: linkedPlatforms[plat] ? 24 : 4, bottom: 4, 
                        backgroundColor: 'white', transition: '.2s', borderRadius: '50%'
                      }}></span>
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="content-viewport" style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.25rem' }}>Workspace Settings</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                Configure global calendar values and manage local databases.
              </p>
            </div>

            <div style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label>Workspace / Company Name</label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="input-field"
                />
              </div>

              <div style={{ height: 1, backgroundColor: 'var(--border-light)', margin: '10px 0' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label>Local Data Backup</label>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  All scheduling creative slides and post structures are saved completely inside your browser's persistent IndexedDB database. You can export/import backups locally.
                </p>
                
                <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                  <button className="btn" onClick={handleExportDB}>
                    <FileDown size={14} /> Export Backup JSON
                  </button>
                  
                  <button className="btn" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                    <FileUp size={14} /> Import Backup
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar navigation */}
      <Sidebar 
        activeView={activeView} 
        setActiveView={(view) => {
          setActiveView(view);
          // Auto reset filters when changing sidebar categories to avoid confusion
          resetFilters();
        }} 
        counts={getCounts()} 
      />

      {/* Main Panel */}
      <main className="main-panel">
        
        {/* Top Header bar */}
        <header className="top-bar">
          <div className="top-bar-left">
            <h1 className="view-title">
              {activeView === 'calendar' ? 'Content Calendar' : 
               activeView === 'all-posts' ? 'All Posts' : 
               activeView === 'media-library' ? 'Media Library' : 
               activeView === 'carousels' ? 'Carousel Library' : 
               activeView.charAt(0).toUpperCase() + activeView.slice(1)}
            </h1>

            {/* Global Search */}
            <div className="search-container">
              <Search className="search-icon" />
              <input
                id="global-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
                placeholder="Search posts, tags, notes... (/)"
              />
            </div>
          </div>

          <div className="top-bar-right">
            {/* Quick add button */}
            <button 
              className="btn btn-primary"
              onClick={() => {
                // Use local-time date to avoid toISOString() UTC shift
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                handleAddPostClick(`${yyyy}-${mm}-${dd}`);
              }}
            >
              <Plus size={16} /> Add Post <span style={{ opacity: 0.5, fontSize: '0.68rem', marginLeft: 4, borderLeft: '1px solid rgba(255,255,255,0.3)', paddingLeft: 4 }}>N</span>
            </button>
          </div>
        </header>

        {/* Dropdown Filters Sub-bar */}
        {(activeView === 'calendar' || activeView === 'all-posts' || activeView === 'drafts' || activeView === 'scheduled' || activeView === 'published' || activeView === 'archive') && (
          <div className="filters-bar">
            <div className="filters-left">
              {/* Platform Filter */}
              <div className="filter-group">
                <span className="filter-label">Platform:</span>
                <select 
                  value={filterPlatform} 
                  onChange={(e) => setFilterPlatform(e.target.value)}
                  className="filter-select"
                >
                  <option value="All">All Platforms</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Facebook">Facebook</option>
                  <option value="X">X (Twitter)</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="filter-group">
                <span className="filter-label">Status:</span>
                <select 
                  value={filterStatus} 
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="filter-select"
                >
                  <option value="All">All Statuses</option>
                  <option value="Draft">Draft</option>
                  <option value="Ready">Ready</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Published">Published</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>

              {/* Content Type Filter */}
              <div className="filter-group">
                <span className="filter-label">Type:</span>
                <select 
                  value={filterContentType} 
                  onChange={(e) => setFilterContentType(e.target.value)}
                  className="filter-select"
                >
                  <option value="All">All Formats</option>
                  <option value="Single Image">Single Image</option>
                  <option value="Carousel">Carousel</option>
                  <option value="Video">Video</option>
                  <option value="Reel">Reel</option>
                  <option value="Story">Story</option>
                  <option value="Text">Text-Only</option>
                </select>
              </div>

              {/* Clear filters badge if any are active */}
              {(filterPlatform !== 'All' || filterStatus !== 'All' || filterContentType !== 'All' || searchQuery !== '') && (
                <button 
                  className="btn" 
                  onClick={resetFilters}
                  style={{ padding: '2px 8px', fontSize: '0.72rem', borderRadius: 12, backgroundColor: 'var(--color-accent-light)' }}
                >
                  Reset filters
                </button>
              )}
            </div>

            {/* Dashboard metrics compact */}
            <div style={{ display: 'flex', gap: 14, fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
              <span>{posts.length} Posts</span>
              <span>•</span>
              <span style={{ color: 'var(--color-published)' }}>{getCounts().Published} Published</span>
              <span>•</span>
              <span style={{ color: 'var(--color-scheduled)' }}>{getCounts().Scheduled} Scheduled</span>
            </div>
          </div>
        )}

        {/* Dynamic view injection */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {renderActiveView()}
        </div>

      </main>

      {/* Details drawer panel */}
      {selectedPost && (
        <PostDetailsDrawer
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onEdit={handleEditPostClick}
          onDuplicate={handleDuplicatePost}
          onDelete={handleDeletePost}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Add / Edit modal popup */}
      {isPostModalOpen && (
        <PostModal
          post={editingPost}
          datePreset={modalDatePreset}
          onClose={() => {
            setIsPostModalOpen(false);
            setEditingPost(null);
          }}
          onSave={handleSavePost}
        />
      )}
    </div>
  );
}
