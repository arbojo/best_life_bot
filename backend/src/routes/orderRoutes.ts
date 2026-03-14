import { Router } from 'express';
import * as orderController from '../controllers/orderController';

const router = Router();

router.get('/', orderController.getAllOrders);
router.get('/stats', orderController.getOrderStats);
router.post('/assign', orderController.assignOrder);


export default router;
