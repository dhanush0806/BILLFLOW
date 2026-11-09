import app from './app';
import { ENV } from './config/env';
import { pool } from './config/database';

const startServer = async () => {
  try {
    // Verify DB connectivity
    const client = await pool.connect();
    console.log('✅ Connected successfully to PostgreSQL database.');
    client.release();

    app.listen(ENV.PORT, () => {
      console.log(`🚀 BillFlow Backend running on port ${ENV.PORT} [${ENV.NODE_ENV}]`);
      console.log(`📡 API endpoint: http://localhost:${ENV.PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL database:', error);
    console.log('⚠️ Running Express server in standby mode for database setup...');
    app.listen(ENV.PORT, () => {
      console.log(`🚀 BillFlow Backend listening on port ${ENV.PORT}`);
    });
  }
};

startServer();
