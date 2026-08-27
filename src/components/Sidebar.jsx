// src/components/Sidebar.jsx
import React from 'react';
import {
  Calendar,
  Layers,
  FileText,
  Clock,
  CheckCircle2,
  Archive,
  Image,
  Sliders,
  Settings,
  Globe
} from 'lucide-react';

export default function Sidebar({ activeView, setActiveView, counts }) {
  const menuItems = [
    { id: 'calendar', label: 'Calendar', icon: Calendar, section: 'Workspace' },
    { id: 'all-posts', label: 'All Posts', icon: Layers, section: 'Workspace' },

    { id: 'drafts', label: 'Drafts', icon: FileText, section: 'Workspace', countKey: 'Draft' },
    { id: 'scheduled', label: 'Scheduled', icon: Clock, section: 'Workspace', countKey: 'Scheduled' },
    { id: 'published', label: 'Published', icon: CheckCircle2, section: 'Workspace', countKey: 'Published' },
    { id: 'archive', label: 'Archive', icon: Archive, section: 'Workspace', countKey: 'Archived' },

    { id: 'media-library', label: 'Media Library', icon: Image, section: 'Library' },
    { id: 'carousels', label: 'Carousels', icon: Sliders, section: 'Library', countKey: 'carousels' },

    { id: 'platforms', label: 'Platforms', icon: Globe, section: 'Settings' },
    { id: 'settings', label: 'Workspace Settings', icon: Settings, section: 'Settings' },
  ];

  const sections = ['Workspace', 'Library', 'Settings'];

  return (
    <aside className="sidebar leather-panel">
      {/* Outer stitched line */}
      <div className="leather-stitch-line"></div>

      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <img 
              src="/assets/INGSOL - Logo 1.png" 
              alt="INGSOL Logo" 
              className="logo-svg"
              style={{ objectFit: 'contain' }}
            />
          </div>
          <div className="sidebar-brand-text">
            <span className="brand-ingsol">INGSOL</span>
            <span className="brand-manager">MANAGER</span>
          </div>
        </div>
        <div className="planner-crease"></div>
      </div>

      <div className="sidebar-menu">
        {sections.map(section => (
          <div key={section} className="sidebar-section">
            <div className="sidebar-section-header">
              <span className="sidebar-section-title">{section}</span>
              <div className="section-emboss-line"></div>
            </div>
            {menuItems
              .filter(item => item.section === section)
              .map(item => {
                const Icon = item.icon;
                const isActive = activeView === item.id;

                // Determine count badge
                let count = 0;
                if (item.countKey) {
                  count = counts[item.countKey] || 0;
                }

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className={`sidebar-item ${isActive ? 'active metal-plate' : 'embossed-item'}`}
                  >
                    <div className="sidebar-item-left">
                      <div className="item-icon-wrapper">
                        <Icon size={16} />
                      </div>
                      <span className="item-label">{item.label}</span>
                    </div>
                    {item.countKey && count > 0 && (
                      <span className={`sidebar-count ${isActive ? 'count-active' : ''}`}>{count}</span>
                    )}
                  </button>
                );
              })}
          </div>
        ))}
      </div>

    </aside>
  );
}
