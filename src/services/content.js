// src/services/content.js
// Supabase interactions for the new V1.5 Content work items
import { supabase } from './supabase';

// ─────────────────────────────────────────────
// CONTENT CRUD
// ─────────────────────────────────────────────

export async function getUserContent() {
  const { data, error } = await supabase
    .from('content')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createContent({ title, content_type, start_date, end_date, status,
  distribution_channel, description, source_reference_url, internal_notes, tags }) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('content')
    .insert([{
      owner_id: user.id,
      title, content_type, start_date, end_date,
      status: status || 'Draft',
      distribution_channel, description, source_reference_url, internal_notes,
      tags: tags || []
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateContent(id, updates) {
  const { data, error } = await supabase
    .from('content')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteContent(id) {
  const { error } = await supabase
    .from('content')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ─────────────────────────────────────────────
// CONTENT ATTACHMENTS
// ─────────────────────────────────────────────

export async function getContentAttachments(contentId) {
  const { data, error } = await supabase
    .from('content_attachments')
    .select(`
      id,
      attachment_type,
      link_name,
      link_url,
      created_at,
      file:file_id (
        id,
        original_filename,
        manager_name,
        file_type,
        mime_type,
        file_size,
        storage_path
      )
    `)
    .eq('content_id', contentId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function uploadContentAttachment(file, contentId, managerName, onProgress) {
  const { data: { user } } = await supabase.auth.getUser();

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${user.id}/${Date.now()}-${safeName}`;
  const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';

  const { error: uploadError } = await supabase.storage
    .from('manager_files')
    .upload(storagePath, file, { upsert: false });
  if (uploadError) throw uploadError;

  if (onProgress) onProgress(70);

  const fileType = getFileCategory(file.type, ext);

  const { data: fileRow, error: dbError } = await supabase
    .from('files')
    .insert([{
      original_filename: file.name,
      manager_name: managerName,
      file_type: fileType,
      mime_type: file.type,
      file_size: file.size,
      storage_path: storagePath,
      uploaded_by: user.id
    }])
    .select()
    .single();

  if (dbError) {
    await supabase.storage.from('manager_files').remove([storagePath]);
    throw dbError;
  }

  if (onProgress) onProgress(90);

  const { data: attachment, error: attachError } = await supabase
    .from('content_attachments')
    .insert([{ content_id: contentId, file_id: fileRow.id, attachment_type: 'file' }])
    .select(`
      id, attachment_type, link_name, link_url, created_at,
      file:file_id (id, original_filename, manager_name, file_type, mime_type, file_size, storage_path)
    `)
    .single();
  if (attachError) throw attachError;

  if (onProgress) onProgress(100);
  return attachment;
}

export async function deleteContentAttachment(attachmentId, fileId, storagePath) {
  const { error } = await supabase.from('content_attachments').delete().eq('id', attachmentId);
  if (error) throw error;
  if (fileId) {
    await supabase.from('files').delete().eq('id', fileId);
  }
  if (storagePath) {
    await supabase.storage.from('manager_files').remove([storagePath]);
  }
}

// ─────────────────────────────────────────────
// CAMPAIGN ↔ CONTENT RELATIONSHIPS
// ─────────────────────────────────────────────

export async function getCampaignContent(campaignId) {
  const { data, error } = await supabase
    .from('campaign_content')
    .select(`
      id,
      content_id,
      created_at,
      content:content_id (*)
    `)
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function linkContentToCampaign(campaignId, contentId) {
  const { data, error } = await supabase
    .from('campaign_content')
    .insert([{ campaign_id: campaignId, content_id: contentId }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function unlinkContentFromCampaign(campaignId, contentId) {
  const { error } = await supabase
    .from('campaign_content')
    .delete()
    .eq('campaign_id', campaignId)
    .eq('content_id', contentId);
  if (error) throw error;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

export function getFileCategory(mimeType, ext) {
  if (!mimeType && !ext) return 'other';
  if (mimeType && mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (mimeType && mimeType.includes('word') || ext === 'doc' || ext === 'docx') return 'doc';
  if (mimeType && mimeType.includes('presentation') || ext === 'ppt' || ext === 'pptx') return 'presentation';
  if (mimeType && mimeType.includes('spreadsheet') || ext === 'xls' || ext === 'xlsx') return 'spreadsheet';
  if (mimeType && mimeType.startsWith('video/')) return 'video';
  return 'other';
}

export function getFileIcon(fileType) {
  const icons = {
    image: '🖼️', pdf: '📄', doc: '📝', presentation: '📊',
    spreadsheet: '📈', video: '🎬', other: '📎'
  };
  return icons[fileType] || icons.other;
}

export async function getSignedUrl(storagePath, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from('manager_files')
    .createSignedUrl(storagePath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
