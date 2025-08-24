import app from './app';
import { env } from './config/env';
import logger from './config/logger';

const PORT = env.PORT || 3002;

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${env.NODE_ENV}`);
});
