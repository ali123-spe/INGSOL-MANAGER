// src/components/campaigns/AttachmentCard.jsx
import React, { useState, useEffect } from 'react';
import { Trash2, ExternalLink, FileText, File, Link as LinkIcon } from 'lucide-react';
import { getSignedUrl } from '../../services/campaigns';

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Image Card ────────────────────────────────────────────────────────────────
function ImageAttachmentCard({ attachment, onDelete }) {
  const [signedUrl, setSignedUrl] = useState(null);
  const file = attachment.file;

  useEffect(() => {
    if (file?.storage_path) {
      getSignedUrl(file.storage_path).then(setSignedUrl).catch(() => {});
    }
  }, [file?.storage_path]);

  return (
    <div className="attachment-card attachment-card-image">
      <div className="attachment-thumb">
        {signedUrl
          ? <img src={signedUrl} alt={file.manager_name} className="attachment-thumb-img" />
          : <div className="attachment-thumb-placeholder">Loading…</div>
        }
      </div>
      <div className="attachment-info">
        <div className="attachment-manager-name">{file.manager_name}</div>
        <div className="attachment-original-name">{file.original_filename}</div>
        <div className="attachment-meta">
          Image {file.file_size ? `· ${formatBytes(file.file_size)}` : ''}
        </div>
      </div>
      <div className="attachment-actions">
        {signedUrl && (
          <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="attachment-action-btn" title="Open">
            <ExternalLink size={14} />
          </a>
        )}
        <button onClick={onDelete} className="attachment-action-btn attachment-action-delete" title="Remove">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ── PDF Card ──────────────────────────────────────────────────────────────────
function PdfAttachmentCard({ attachment, onDelete }) {
  const [signedUrl, setSignedUrl] = useState(null);
  const file = attachment.file;

  useEffect(() => {
    if (file?.storage_path) {
      getSignedUrl(file.storage_path).then(setSignedUrl).catch(() => {});
    }
  }, [file?.storage_path]);

  return (
    <div className="attachment-card attachment-card-pdf">
      <div className="attachment-doc-icon attachment-doc-icon-pdf">
        <FileText size={28} />
        <span className="doc-type-badge">PDF</span>
      </div>
      <div className="attachment-info">
        <div className="attachment-manager-name">{file.manager_name}</div>
        <div className="attachment-original-name">{file.original_filename}</div>
        <div className="attachment-meta">PDF {file.file_size ? `· ${formatBytes(file.file_size)}` : ''}</div>
      </div>
      <div className="attachment-actions">
        {signedUrl && (
          <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="attachment-action-btn" title="Open PDF">
            <ExternalLink size={14} />
          </a>
        )}
        <button onClick={onDelete} className="attachment-action-btn attachment-action-delete" title="Remove">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ── DOC / DOCX Card ───────────────────────────────────────────────────────────
function DocAttachmentCard({ attachment, onDelete }) {
  const [signedUrl, setSignedUrl] = useState(null);
  const file = attachment.file;

  useEffect(() => {
    if (file?.storage_path) {
      getSignedUrl(file.storage_path).then(setSignedUrl).catch(() => {});
    }
  }, [file?.storage_path]);

  return (
    <div className="attachment-card attachment-card-doc">
      <div className="attachment-doc-icon attachment-doc-icon-doc">
        <FileText size={28} />
        <span className="doc-type-badge">DOC</span>
      </div>
      <div className="attachment-info">
        <div className="attachment-manager-name">{file.manager_name}</div>
        <div className="attachment-original-name">{file.original_filename}</div>
        <div className="attachment-meta">Word Document {file.file_size ? `· ${formatBytes(file.file_size)}` : ''}</div>
      </div>
      <div className="attachment-actions">
        {signedUrl && (
          <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="attachment-action-btn" title="Download">
            <ExternalLink size={14} />
          </a>
        )}
        <button onClick={onDelete} className="attachment-action-btn attachment-action-delete" title="Remove">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Generic File Card ─────────────────────────────────────────────────────────
function GenericAttachmentCard({ attachment, onDelete }) {
  const [signedUrl, setSignedUrl] = useState(null);
  const file = attachment.file;
  const ext = file.original_filename?.includes('.') ? file.original_filename.split('.').pop().toUpperCase() : 'FILE';

  useEffect(() => {
    if (file?.storage_path) {
      getSignedUrl(file.storage_path).then(setSignedUrl).catch(() => {});
    }
  }, [file?.storage_path]);

  return (
    <div className="attachment-card attachment-card-generic">
      <div className="attachment-doc-icon attachment-doc-icon-generic">
        <File size={28} />
        <span className="doc-type-badge">{ext.substring(0, 4)}</span>
      </div>
      <div className="attachment-info">
        <div className="attachment-manager-name">{file.manager_name}</div>
        <div className="attachment-original-name">{file.original_filename}</div>
        <div className="attachment-meta">{ext} {file.file_size ? `· ${formatBytes(file.file_size)}` : ''}</div>
      </div>
      <div className="attachment-actions">
        {signedUrl && (
          <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="attachment-action-btn" title="Download">
            <ExternalLink size={14} />
          </a>
        )}
        <button onClick={onDelete} className="attachment-action-btn attachment-action-delete" title="Remove">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Link Card ─────────────────────────────────────────────────────────────────
function LinkAttachmentCard({ attachment, onDelete }) {
  return (
    <div className="attachment-card attachment-card-link">
      <div className="attachment-link-icon">
        <LinkIcon size={22} />
      </div>
      <div className="attachment-info">
        <div className="attachment-manager-name">{attachment.link_name || 'Link'}</div>
        <div className="attachment-original-name" style={{ wordBreak: 'break-all' }}>{attachment.link_url}</div>
      </div>
      <div className="attachment-actions">
        <a href={attachment.link_url} target="_blank" rel="noopener noreferrer" className="attachment-action-btn" title="Open link">
          <ExternalLink size={14} />
        </a>
        <button onClick={onDelete} className="attachment-action-btn attachment-action-delete" title="Remove">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Router ─────────────────────────────────────────────────────────────────────
export default function AttachmentCard({ attachment, onDelete }) {
  if (attachment.attachment_type === 'link') {
    return <LinkAttachmentCard attachment={attachment} onDelete={onDelete} />;
  }

  const fileType = attachment.file?.file_type;
  switch (fileType) {
    case 'image':   return <ImageAttachmentCard   attachment={attachment} onDelete={onDelete} />;
    case 'pdf':     return <PdfAttachmentCard     attachment={attachment} onDelete={onDelete} />;
    case 'doc':     return <DocAttachmentCard     attachment={attachment} onDelete={onDelete} />;
    default:        return <GenericAttachmentCard attachment={attachment} onDelete={onDelete} />;
  }
}
