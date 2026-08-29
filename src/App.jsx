// src/App.jsx
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import CalendarView, { PostCardThumbnail, PlatformIcon } from './components/CalendarView';
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
  FileDown,
  FileUp,
  Sliders,
  Sparkles,
  Menu
} from 'lucide-react';
import AssistantChat from './components/assistant/AssistantChat';
import './App.css';

export default function App() {
  const [posts, setPosts] = useState([]);
  
  // Navigation & Filtering
  const [activeView, setActiveView] = useState('calendar');
  const [currentDate, setCurrentDate] = useState(new Date(2026, 7, 8)); // August 8, 2026
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
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Settings states
  const [workspaceName, setWorkspaceName] = useState('INGSOL Industrial Marketing');
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
      
      if (selectedPost) {
        const updated = allPosts.find(p => p.id === selectedPost.id);
        if (updated) setSelectedPost(updated);
      }
    } catch (err) {
      console.error("Failed to query posts:", err);
    }
  };

  // Category counts builder for Sidebar & Top Status Plates
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
    const duplicateData = {
      title: `${post.title} (Repurposed)`,
      platform: post.platform,
      contentType: post.contentType,
      status: 'Draft',
      caption: post.caption || '',
      notes: post.notes || '',
      tags: post.tags ? [...post.tags] : [],
      designUrl: post.designUrl || post.figmaUrl || '',
      figmaUrl: post.designUrl || post.figmaUrl || '',
      publishedUrl: '',
      mediaId: post.mediaId || null,
      linkPreviewImage: post.linkPreviewImage || '',
      carouselSlides: post.carouselSlides ? post.carouselSlides.map(slide => ({
        ...slide,
        id: `slide_dup_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
      })) : []
    };

    setEditingPost(duplicateData);
    setModalDatePreset('');
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
      if (activeView === 'drafts' && post.status !== 'Draft') return false;
      if (activeView === 'scheduled' && post.status !== 'Scheduled') return false;
      if (activeView === 'published' && post.status !== 'Published') return false;
      if (activeView === 'archive' && post.status !== 'Archived') return false;
      
      if (filterPlatform !== 'All' && post.platform !== filterPlatform) return false;
      if (filterStatus !== 'All' && post.status !== filterStatus) return false;
      if (filterContentType !== 'All' && post.contentType !== filterContentType) return false;

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

  const handleExportDB = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(posts, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ingsol_manager_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

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
          <div className="desk-planner-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--paper-border)', paddingBottom: '14px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', color: 'var(--ingsol-dark-navy)' }}>
                Master Editorial Dispatch
              </h2>
              <span style={{ fontSize: '0.78rem', color: 'var(--paper-text-muted)', fontWeight: 700 }}>
                {filteredPostsList.length} scheduled & drafted posts
              </span>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', paddingTop: 16 }}>
              {filteredPostsList.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                  {filteredPostsList.map(post => (
                    <div
                      key={post.id}
                      className="post-card pinned-paper-card"
                      onClick={() => setSelectedPost(post)}
                      style={{ padding: '10px' }}
                    >
                      <div className="card-metal-pin">
                        <div className="pin-head"></div>
                        <div className="pin-shine"></div>
                        <div className="pin-shadow"></div>
                      </div>

                      <div className="card-thumbnail-container" style={{ aspectRatio: '16 / 10' }}>
                        <PostCardThumbnail 
                          mediaId={post.mediaId} 
                          linkPreviewImage={post.linkPreviewImage} 
                          title={post.title} 
                          contentType={post.contentType} 
                        />
                      </div>
                      
                      <div className="card-info" style={{ marginTop: 8, gap: 4 }}>
                        <div className="card-title" style={{ fontSize: '0.85rem', fontWeight: 800 }}>{post.title}</div>
                        <div className="card-meta" style={{ fontSize: '0.72rem' }}>
                          <div className="card-platform">
                            <PlatformIcon platform={post.platform} size={11} />
                            <span>📅 {post.date}</span>
                          </div>
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
                  <Sliders className="empty-state-icon" />
                  <div className="empty-state-title">No posts match filters</div>
                  <div className="empty-state-text">Try resetting filters to discover scheduled posts.</div>
                  <button className="btn btn-secondary tactile-btn" onClick={resetFilters}>Clear Filters</button>
                </div>
              )}
            </div>
          </div>
        );
      
      case 'media-library':
        return <MediaLibraryView posts={posts} onPostClick={setSelectedPost} />;
      
      case 'carousels':
        return <CarouselLibraryView posts={posts} onPostClick={setSelectedPost} />;

      case 'platforms':
        return (
          <div className="desk-planner-container" style={{ maxWidth: 650, margin: '0 auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.25rem', color: 'var(--ingsol-dark-navy)' }}>
                Industrial Social Network Integrations
              </h2>
              <p style={{ fontSize: '0.84rem', color: 'var(--paper-text-muted)', marginTop: 4 }}>
                Enable or disable channels available in your publishing manifests.
              </p>
            </div>

            <div style={{ backgroundColor: 'var(--paper-card)', border: '1px solid var(--paper-border)', borderRadius: 'var(--radius-sm)', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {Object.keys(linkedPlatforms).map(plat => (
                <div key={plat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid var(--paper-line)' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{plat} Network</span>
                  <label className="switch" style={{ position: 'relative', display: 'inline-block', width: 44, height: 24 }}>
                    <input 
                      type="checkbox" 
                      checked={linkedPlatforms[plat]} 
                      onChange={(e) => setLinkedPlatforms({ ...linkedPlatforms, [plat]: e.target.checked })}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
                      backgroundColor: linkedPlatforms[plat] ? 'var(--ingsol-primary)' : '#c7bca9', 
                      transition: '.2s', borderRadius: 24,
                      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)'
                    }}>
                      <span style={{
                        position: 'absolute', content: '""', height: 16, width: 16, left: linkedPlatforms[plat] ? 24 : 4, bottom: 4, 
                        backgroundColor: 'white', transition: '.2s', borderRadius: '50%',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
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
          <div className="desk-planner-container" style={{ maxWidth: 650, margin: '0 auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.25rem', color: 'var(--ingsol-dark-navy)' }}>
                Workspace & Archive Settings
              </h2>
              <p style={{ fontSize: '0.84rem', color: 'var(--paper-text-muted)', marginTop: 4 }}>
                Configure organization identifiers and manage local persistent storage.
              </p>
            </div>

            <div style={{ backgroundColor: 'var(--paper-card)', border: '1px solid var(--paper-border)', borderRadius: 'var(--radius-sm)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label>Workspace / Company Name</label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="input-field-tactile"
                />
              </div>

              <div style={{ height: 1, backgroundColor: 'var(--paper-border)', margin: '4px 0' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label>Offline Database Backup</label>
                <p style={{ fontSize: '0.78rem', color: 'var(--paper-text-muted)', lineHeight: 1.4 }}>
                  All social posts, creative assets, and auto-fetched web previews are preserved in your local browser storage. You can export a snapshot backup at any time.
                </p>
                
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button className="btn btn-primary tactile-action-btn" onClick={handleExportDB}>
                    <FileDown size={14} /> Export Backup JSON
                  </button>
                  
                  <button className="btn btn-secondary tactile-btn" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
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
          resetFilters();
          setIsSidebarOpen(false);
        }} 
        counts={getCounts()} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Panel */}
      <main className="main-panel">
        
        {/* Top Header bar with Physical Industrial Header */}
        <header className="top-bar industrial-header">
          <div className="top-bar-left">
            <button 
              className="mobile-menu-btn" 
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open Menu"
            >
              <Menu size={20} />
            </button>
            <div className="view-title-plate">
              <h1 className="view-title">
                {activeView === 'calendar' ? 'Content Calendar' : 
                 activeView === 'all-posts' ? 'All Posts' : 
                 activeView === 'media-library' ? 'Media Library' : 
                 activeView === 'carousels' ? 'Carousel Library' : 
                 activeView.charAt(0).toUpperCase() + activeView.slice(1)}
              </h1>
            </div>

            {/* Global Search */}
            <div className="search-container tactile-search">
              <Search className="search-icon" size={15} />
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
            {/* 4 Physical Status Plates */}
            <div className="status-plates-row">
              <div 
                className={`status-plate plate-draft ${filterStatus === 'Draft' ? 'active' : ''}`}
                onClick={() => setFilterStatus(filterStatus === 'Draft' ? 'All' : 'Draft')}
                title="Filter by Drafts"
              >
                <div className="plate-screw top-left"></div>
                <div className="plate-screw top-right"></div>
                <span className="plate-count">{getCounts().Draft}</span>
                <span className="plate-label">Drafts</span>
              </div>

              <div 
                className={`status-plate plate-scheduled ${filterStatus === 'Scheduled' ? 'active' : ''}`}
                onClick={() => setFilterStatus(filterStatus === 'Scheduled' ? 'All' : 'Scheduled')}
                title="Filter by Scheduled"
              >
                <div className="plate-screw top-left"></div>
                <div className="plate-screw top-right"></div>
                <span className="plate-count">{getCounts().Scheduled}</span>
                <span className="plate-label">Scheduled</span>
              </div>

              <div 
                className={`status-plate plate-published ${filterStatus === 'Published' ? 'active' : ''}`}
                onClick={() => setFilterStatus(filterStatus === 'Published' ? 'All' : 'Published')}
                title="Filter by Published"
              >
                <div className="plate-screw top-left"></div>
                <div className="plate-screw top-right"></div>
                <span className="plate-count">{getCounts().Published}</span>
                <span className="plate-label">Published</span>
              </div>

              <div 
                className={`status-plate plate-archived ${filterStatus === 'Archived' ? 'active' : ''}`}
                onClick={() => setFilterStatus(filterStatus === 'Archived' ? 'All' : 'Archived')}
                title="Filter by Archived"
              >
                <div className="plate-screw top-left"></div>
                <div className="plate-screw top-right"></div>
                <span className="plate-count">{getCounts().Archived}</span>
                <span className="plate-label">Archived</span>
              </div>
            </div>

            {/* Quick add button (Physical tactile button) */}
            <button 
              className="btn btn-primary tactile-action-btn"
              onClick={() => {
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                handleAddPostClick(`${yyyy}-${mm}-${dd}`);
              }}
            >
              <Plus size={16} /> Add Post <span className="key-hint">N</span>
            </button>
          </div>
        </header>

        {/* Dropdown Filters Sub-bar */}
        {(activeView === 'calendar' || activeView === 'all-posts' || activeView === 'drafts' || activeView === 'scheduled' || activeView === 'published' || activeView === 'archive') && (
          <div className="filters-bar planner-toolbar">
            <div className="filters-left">
              {/* Platform Filter */}
              <div className="filter-group-tactile">
                <span className="filter-label">Platform:</span>
                <select 
                  value={filterPlatform} 
                  onChange={(e) => setFilterPlatform(e.target.value)}
                  className="filter-select-tactile"
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
              <div className="filter-group-tactile">
                <span className="filter-label">Status:</span>
                <select 
                  value={filterStatus} 
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="filter-select-tactile"
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
              <div className="filter-group-tactile">
                <span className="filter-label">Type:</span>
                <select 
                  value={filterContentType} 
                  onChange={(e) => setFilterContentType(e.target.value)}
                  className="filter-select-tactile"
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
                  className="btn btn-reset-filters" 
                  onClick={resetFilters}
                >
                  Reset filters
                </button>
              )}
            </div>

            {/* Total items badge */}
            <div className="planner-metrics-indicator">
              <span className="dot-live"></span>
              <span>{filteredPostsList.length} Active in View</span>
            </div>
          </div>
        )}

        {/* Dynamic view injection inside desk workspace */}
        <div className="workspace-desk-viewport" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {renderActiveView()}

          {/* Assistant UI */}
          <AssistantChat 
            activeView={activeView} 
            isOpen={isAssistantOpen} 
            onClose={() => setIsAssistantOpen(false)} 
          />
          {!isAssistantOpen && (
            <button 
              className="ingsol-ai-button" 
              onClick={() => setIsAssistantOpen(true)}
              aria-label="Open INGSOL AI"
            >
              <Sparkles size={24} />
            </button>
          )}
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
