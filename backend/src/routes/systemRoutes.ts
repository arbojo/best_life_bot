import { Router } from 'express';
import * as systemController from '../controllers/systemController';

const router = Router();

router.get('/logs', systemController.getLogs);
router.post('/logs', systemController.createLog);
router.get('/bot-status', systemController.getBotStatus);
router.post('/bot-status', systemController.updateBotStatus);
router.get('/channels', systemController.getChannels);
router.post('/channels/sync', systemController.syncChannels);
router.post('/channels/status', systemController.updateChannelStatus);

export default router;
