/**
 * Supabase compatibility shim — replaces Base44.
 * All existing imports of { base44 } continue to work unchanged.
 */
import { supabase } from './supabaseClient';

// Maps Base44 ordering strings like "-created_date" → Supabase ordering
const parseOrder = (order = '-created_at') => {
  const asc = !order.startsWith('-');
  let col = order.replace(/^-/, '');
  if (col === 'created_date') col = 'created_at';
  return { col, asc };
};

const makeEntity = (tableName) => ({
  list: async (order = '-created_at', limit = 100) => {
    const { col, asc } = parseOrder(order);
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order(col, { ascending: asc })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  filter: async (filters = {}, order = '-created_at', limit = 50) => {
    const { col, asc } = parseOrder(order);
    let query = supabase.from(tableName).select('*');
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    const { data, error } = await query
      .order(col, { ascending: asc })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  create: async (data) => {
    const { data: result, error } = await supabase
      .from(tableName)
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  update: async (id, data) => {
    const { data: result, error } = await supabase
      .from(tableName)
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  delete: async (id) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) throw error;
  },
});

export const base44 = {
  entities: {
    Product: makeEntity('products'),
    GlassType: makeEntity('glass_types'),
    QuoteRequest: makeEntity('quote_requests'),
    CustomOrderRequest: makeEntity('custom_order_requests'),
    GalleryItem: makeEntity('gallery_items'),
    GalleryProject: makeEntity('gallery_items'), // alias
    Review: makeEntity('reviews'),
    Sale: makeEntity('sales'),
    CreditCustomer: makeEntity('credit_customers'),
    Expense: makeEntity('expenses'),
    Accessory: makeEntity('accessories'),
    StandardSize: makeEntity('standard_sizes'),
    SiteSetting: makeEntity('site_settings'),
    QuoteAccessory: makeEntity('quote_accessories'),
  },

  integrations: {
    Core: {
      UploadFile: async ({ file }) => {
        if (!file) throw new Error('No file provided');
        
        const ext = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const path = `uploads/${fileName}`;
        
        console.log('[Supabase Upload] Starting upload:', {
          fileName: file.name,
          size: file.size,
          type: file.type,
          path: path
        });
        
        const { error } = await supabase.storage.from('media').upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });
        
        if (error) {
          console.error('[Supabase Upload] Error:', error);
          throw new Error(`Upload failed: ${error.message}`);
        }
        
        const { data } = supabase.storage.from('media').getPublicUrl(path);
        console.log('[Supabase Upload] Success:', data.publicUrl);
        
        return { file_url: data.publicUrl };
      },
    },
  },
};

