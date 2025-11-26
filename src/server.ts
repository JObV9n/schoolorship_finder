import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './config/logger.js';
import apiRouter from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(): Express {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cors());

  const publicPath = path.join(__dirname, 'public');
  app.use(express.static(publicPath));

  app.use('/api', apiRouter);

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

export function startServer(port: number = 3000) {
  const app = createApp();
  
  const server = app.listen(port, () => {
    const url = `http://localhost:${port}`;
    logger.info(`🚀 Server started at ${url}`);
    console.log(`🚀 Server started at ${url}`);
  });

  const shutdown = () => {
    logger.info('Shutting down server gracefully...');
    console.log('\nShutting down server gracefully...');
    
    server.close(() => {
      logger.info('Server closed');
      console.log('Server closed');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return server;
}

const isMainModule = process.argv[1] && (
  import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || // fiel  
  import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` ||
  fileURLToPath(import.meta.url) === process.argv[1]
);

if (isMainModule) {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  startServer(port);
}
