// src/components/WorkTypeSelector.jsx
// "What do you want to create?" — campaign or content
import React from 'react';
import { X, Layers, FileText } from 'lucide-react';

export default function WorkTypeSelector({ onSelectCampaign, onSelectContent, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container physical-sheet-modal"
        style={{ maxWidth: 480, width: '92vw' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-staple-accent" />

        <div className="modal-header paper-sheet-header">
          <div className="modal-header-text">
            <span className="sheet-kicker">INGSOL WORK TRACKER</span>
            <h2 className="modal-title">What do you want to create?</h2>
          </div>
          <button className="modal-close tactile-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body paper-sheet-body" style={{ padding: '20px 24px 24px' }}>
          <p style={{ fontSize: '0.84rem', color: 'var(--paper-text-muted)', marginBottom: 20 }}>
            Choose the type of work you want to add to your tracker.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {/* Campaign card */}
            <button
              className="work-type-card"
              onClick={onSelectCampaign}
            >
              <div className="work-type-icon" style={{ backgroundColor: 'rgba(2,71,145,0.10)', color: 'var(--ingsol-primary)' }}>
                <Layers size={28} />
              </div>
              <div className="work-type-label">Campaign</div>
              <div className="work-type-desc">
                A larger piece of work with a date range and multiple deliverables.
              </div>
            </button>

            {/* Content card */}
            <button
              className="work-type-card"
              onClick={onSelectContent}
            >
              <div className="work-type-icon" style={{ backgroundColor: 'rgba(5,150,105,0.10)', color: '#059669' }}>
                <FileText size={28} />
              </div>
              <div className="work-type-label">Content</div>
              <div className="work-type-desc">
                An individual piece of work or content with dates and attachments.
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
