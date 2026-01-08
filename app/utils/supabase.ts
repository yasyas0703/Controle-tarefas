import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variáveis de ambiente do Supabase não configuradas. Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }
  
  return supabaseClient;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return getSupabaseClient()[prop as keyof SupabaseClient];
  }
});

export async function uploadFile(
  file: File,
  path: string
): Promise<{ url: string; path: string }> {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'documentos';
  
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${path}/${fileName}`;
  
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, buffer, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });
  
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);
  
  return {
    url: publicUrl,
    path: filePath,
  };
}

export async function deleteFile(path: string): Promise<void> {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'documentos';
  
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);
  
  if (error) throw error;
}

