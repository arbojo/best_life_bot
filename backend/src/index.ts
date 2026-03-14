import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import orderRoutes from './routes/orderRoutes';
import systemRoutes from './routes/systemRoutes';
import driverRoutes from './routes/driverRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// BigInt serialization fix
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.use('/api/orders', orderRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/drivers', driverRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Best Life Backend running on http://localhost:${PORT}`);
});
