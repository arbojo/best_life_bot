import { Request, Response } from 'express';
import supabase from '../lib/supabase';

export const getAllDrivers = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .order('name');

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Supabase Error (drivers):', error);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
};

export const updateDriverStatus = async (req: Request, res: Response) => {
  const { id, status } = req.body;
  try {
    const { error } = await supabase
      .from('drivers')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Supabase Error (update driver):', error);
    res.status(500).json({ error: 'Failed to update driver' });
  }
};
