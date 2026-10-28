// Project file upload — E-Learning App
// Picks a real file from the device (expo-document-picker) and uploads it
// to the PUBLIC Supabase Storage bucket `project-files` (created by the
// v2 SQL update: public read + anon insert policies). The returned public
// URL is stored on the user's Project (PersistedState.myProjects[].fileUrl)
// so the file can be opened again from the Projects tab.
//
// If Supabase is not configured (no .env) or the bucket does not exist
// yet, uploadProjectFile() throws and the caller keeps the project
// without a file (the pre-upload behaviour) instead of losing the post.

import * as DocumentPicker from 'expo-document-picker';

import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from './supabaseConfig';

const BUCKET = 'project-files';

export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
}

export async function pickProjectFile(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.name,
    mimeType: asset.mimeType ?? 'application/octet-stream',
  };
}

export async function uploadProjectFile(file: PickedFile): Promise<string> {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured (.env)');
  const blob = await (await fetch(file.uri)).blob();
  const safeName = file.name.replace(/[^\w.\-]+/g, '_');
  const path = `${Date.now().toString(36)}-${safeName}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': file.mimeType,
      'x-upsert': 'true',
    },
    body: blob,
  });
  if (!res.ok) throw new Error(`Storage upload -> HTTP ${res.status}`);
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(path)}`;
}
