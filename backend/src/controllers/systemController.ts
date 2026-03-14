import { Request, Response } from 'express';
import supabase from '../lib/supabase';

// Helper to handle BigInt and Dates consistently with how Prisma did
const formatResponse = (data: any) => {
  return JSON.parse(JSON.stringify(data, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
};

export const getLogs = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('system_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);
    
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Supabase Error (logs):', error);
    res.json([]);
  }
};

export const createLog = async (req: Request, res: Response) => {
  const { message, level, source } = req.body;
  try {
    const { data, error } = await supabase
      .from('system_logs')
      .insert({ message, level, source })
      .select()
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(200).json({ success: false, error: 'Supabase insert fail' });
  }
};

export const getBotStatus = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'bot_active')
      .single();
    
    // If not found, default to true
    if (error && error.code !== 'PGRST116') throw error;
    res.json({ active: data?.value ?? true });
  } catch (error) {
    console.error('Supabase Error (status):', error);
    res.json({ active: true, error: 'Supabase connection fail' });
  }
};

export const updateBotStatus = async (req: Request, res: Response) => {
  const { active } = req.body;
  try {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: 'bot_active', value: active, updated_at: new Date() });
    
    if (error) throw error;
    res.json({ success: true, active });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status in Supabase' });
  }
};

export const getChannels = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Supabase Error (channels):', error);
    res.json([]);
  }
};

export const syncChannels = async (req: Request, res: Response) => {
  const { channels } = req.body;
  try {
    const { error } = await supabase
      .from('channels')
      .upsert(channels.map((c: any) => ({ ...c, updated_at: new Date() })));
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Supabase Error (sync):', error);
    res.status(500).json({ error: 'Supabase sync error' });
  }
};

export const updateChannelStatus = async (req: Request, res: Response) => {
  const { id, is_active } = req.body;
  try {
    const { data, error } = await supabase
      .from('channels')
      .update({ is_active, updated_at: new Date() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update channel' });
  }
};
