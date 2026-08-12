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
  Globe,
  Radio
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
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon"></div>
          <span>INGSOL MANAGER </span>
        </div>
      </div>

      <div className="sidebar-menu">
        {sections.map(section => (
          <div key={section} className="sidebar-section">
            <h3 className="sidebar-section-title">{section}</h3>
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
                    className={`sidebar-item ${isActive ? 'active' : ''}`}
                  >
                    <div className="sidebar-item-left">
                      <Icon size={16} />
                      <span>{item.label}</span>
                    </div>
                    {item.countKey && count > 0 && (
                      <span className="sidebar-count">{count}</span>
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
