import { Router } from 'express';
import * as driverController from '../controllers/driverController';

const router = Router();

router.get('/', driverController.getAllDrivers);
router.post('/status', driverController.updateDriverStatus);

export default router;
