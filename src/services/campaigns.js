// src/services/campaigns.js
// All Supabase interactions for Date Ranges / Campaigns
import { supabase } from './supabase';

// ─────────────────────────────────────────────
// DATE RANGES
// ─────────────────────────────────────────────

export async function getUserRanges() {
  const { data, error } = await supabase
    .from('date_ranges')
    .select('*')
    .order('start_date', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createDateRange({ name, start_date, end_date, description, color, source_reference_url, internal_notes, tags }) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('date_ranges')
    .insert([{
      user_id: user.id,
      name, start_date, end_date, description, color,
      source_reference_url: source_reference_url || null,
      internal_notes: internal_notes || null,
      tags: tags || []
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateDateRange(id, { name, start_date, end_date, description, color, source_reference_url, internal_notes, tags }) {
  const { data, error } = await supabase
    .from('date_ranges')
    .update({
      name, start_date, end_date, description, color,
      source_reference_url: source_reference_url || null,
      internal_notes: internal_notes || null,
      tags: tags || []
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDateRange(id) {
  const { error } = await supabase
    .from('date_ranges')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ─────────────────────────────────────────────
// ATTACHMENTS — load for a range
// ─────────────────────────────────────────────

export async function getRangeAttachments(rangeId) {
  const { data, error } = await supabase
    .from('range_attachments')
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
    .eq('range_id', rangeId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────
// FILE UPLOAD to Supabase Storage + metadata
// ─────────────────────────────────────────────

export async function uploadAttachment(file, rangeId, managerName, onProgress) {
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Build a unique storage path: {user_id}/{timestamp}-{filename}
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${user.id}/${Date.now()}-${safeName}`;
  const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';

  // 2. Upload binary to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('manager_files')
    .upload(storagePath, file, { upsert: false });
  if (uploadError) throw uploadError;

  if (onProgress) onProgress(80);

  // 3. Determine file category
  const fileType = getFileCategory(file.type, ext);

  // 4. Insert metadata row into public.files
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
    // Cleanup orphaned storage object on DB failure
    await supabase.storage.from('manager_files').remove([storagePath]);
    throw dbError;
  }

  if (onProgress) onProgress(95);

  // 5. Link to the range via range_attachments
  const { data: attachment, error: attachError } = await supabase
    .from('range_attachments')
    .insert([{
      range_id: rangeId,
      file_id: fileRow.id,
      attachment_type: 'file'
    }])
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
    .single();
  if (attachError) throw attachError;

  if (onProgress) onProgress(100);

  return attachment;
}

export function getFileCategory(mimeType, ext) {
  if (!mimeType && !ext) return 'other';
  if (mimeType && mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === 'doc' || ext === 'docx'
  ) return 'doc';
  if (mimeType && mimeType.startsWith('video/')) return 'video';
  return 'other';
}

export async function deleteAttachment(attachmentId, fileId, storagePath) {
  // 1. Remove the range_attachments row
  const { error: attachError } = await supabase
    .from('range_attachments')
    .delete()
    .eq('id', attachmentId);
  if (attachError) throw attachError;

  // 2. Remove the files metadata row (if it's a file attachment)
  if (fileId) {
    const { error: fileError } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId);
    if (fileError) throw fileError;
  }

  // 3. Remove binary from storage
  if (storagePath) {
    await supabase.storage.from('manager_files').remove([storagePath]);
  }
}

export async function updateAttachmentManagerName(fileId, managerName) {
  const { error } = await supabase
    .from('files')
    .update({ manager_name: managerName })
    .eq('id', fileId);
  if (error) throw error;
}

// ─────────────────────────────────────────────
// LINKS
// ─────────────────────────────────────────────

export async function addLink(rangeId, linkName, linkUrl) {
  const { data, error } = await supabase
    .from('range_attachments')
    .insert([{
      range_id: rangeId,
      link_name: linkName,
      link_url: linkUrl,
      attachment_type: 'link'
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteLink(attachmentId) {
  const { error } = await supabase
    .from('range_attachments')
    .delete()
    .eq('id', attachmentId);
  if (error) throw error;
}

// ─────────────────────────────────────────────
// SIGNED URLS (for private bucket previews)
// ─────────────────────────────────────────────

export async function getSignedUrl(storagePath, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from('manager_files')
    .createSignedUrl(storagePath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

// ─────────────────────────────────────────────
// POST REFERENCES
// ─────────────────────────────────────────────

export async function getRangePosts(rangeId) {
  const { data, error } = await supabase
    .from('range_posts')
    .select('*')
    .eq('range_id', rangeId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function addPostRef(rangeId, postRefId) {
  const { data, error } = await supabase
    .from('range_posts')
    .insert([{ range_id: rangeId, post_ref_id: postRefId }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removePostRef(rangeId, postRefId) {
  const { error } = await supabase
    .from('range_posts')
    .delete()
    .eq('range_id', rangeId)
    .eq('post_ref_id', postRefId);
  if (error) throw error;
}

/** Get the range_id (if any) that a given post_ref_id is linked to */
export async function getRangeForPost(postRefId) {
  const { data, error } = await supabase
    .from('range_posts')
    .select('range_id')
    .eq('post_ref_id', postRefId)
    .maybeSingle();
  if (error) throw error;
  return data?.range_id || null;
}

/**
 * Set the campaign for a post. Replaces any existing link.
 * Pass null rangeId to detach the post from all campaigns.
 */
export async function setPostRange(postRefId, newRangeId) {
  // Remove any existing link for this post
  const { error: delError } = await supabase
    .from('range_posts')
    .delete()
    .eq('post_ref_id', postRefId);
  if (delError) throw delError;

  // If a new range is selected, create the link
  if (newRangeId) {
    const { error: insError } = await supabase
      .from('range_posts')
      .insert([{ range_id: newRangeId, post_ref_id: postRefId }]);
    if (insError) throw insError;
  }
}

// ─────────────────────────────────────────────
// CALENDAR PREPARATION HELPER (consumed by Prompt 3)
// ─────────────────────────────────────────────

export function dateRangesForCalendar(ranges) {
  return ranges.map(r => ({
    id: r.id,
    name: r.name,
    color: r.color || '#024791',
    startDate: r.start_date,
    endDate: r.end_date
  }));
}
