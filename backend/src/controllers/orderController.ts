import { Request, Response } from 'express';
import supabase from '../lib/supabase';

export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('new_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    
    // Consistent BigInt/JSON formatting
    const formatted = JSON.parse(JSON.stringify(data, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));
    
    res.json(formatted || []);
  } catch (error) {
    console.error('Supabase Error (orders):', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

export const getOrderStats = async (req: Request, res: Response) => {
  try {
    const [{ count: total }, { count: pending }] = await Promise.all([
      supabase.from('new_orders').select('*', { count: 'exact', head: true }),
      supabase.from('new_orders').select('*', { count: 'exact', head: true }).eq('status', 'PENDING_CONFIRMATION')
    ]);
    
    res.json({
      total: total || 0,
      pending: pending || 0
    });
  } catch (error) {
    console.error('Supabase Error (stats):', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

export const assignOrder = async (req: Request, res: Response) => {
  const { orderId, driverId } = req.body;
  try {
    // 1. Update order with driver_id and new status
    const { error: orderError } = await supabase
      .from('new_orders')
      .update({ 
        driver_id: driverId, 
        status: 'ASSIGNED',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (orderError) throw orderError;

    // 2. Update driver status to Busy
    const { error: driverError } = await supabase
      .from('drivers')
      .update({ status: 'Ocupado' })
      .eq('id', driverId);

    if (driverError) throw driverError;

    res.json({ success: true });
  } catch (error) {
    console.error('Supabase Error (assign):', error);
    res.status(500).json({ error: 'Failed to assign order' });
  }
};
