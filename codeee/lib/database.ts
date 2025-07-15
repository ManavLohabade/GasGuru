import { Pool } from '@/node_modules/@types/pg';

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'gasguru',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432'),
});

// Database schema initialization
export const initializeDatabase = async () => {
  const client = await pool.connect();
  
  try {
    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS batched_transactions (
        id SERIAL PRIMARY KEY,
        batch_id VARCHAR(255) UNIQUE NOT NULL,
        user_address VARCHAR(42) NOT NULL,
        to_address VARCHAR(42) NOT NULL,
        amount VARCHAR(255) NOT NULL,
        token_address VARCHAR(42),
        gas_estimate BIGINT,
        status VARCHAR(20) DEFAULT 'pending',
        scheduled_for TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        executed_at TIMESTAMP,
        tx_hash VARCHAR(66),
        error_message TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS gas_analytics (
        id SERIAL PRIMARY KEY,
        dapp_id VARCHAR(255) NOT NULL,
        total_gas_saved BIGINT DEFAULT 0,
        total_batches INTEGER DEFAULT 0,
        total_transactions INTEGER DEFAULT 0,
        average_batch_size DECIMAL(10,2) DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS scheduled_batches (
        id SERIAL PRIMARY KEY,
        batch_id VARCHAR(255) UNIQUE NOT NULL,
        dapp_id VARCHAR(255) NOT NULL,
        execution_time TIMESTAMP NOT NULL,
        frequency VARCHAR(20), -- 'once', 'daily', 'weekly', 'monthly'
        status VARCHAR(20) DEFAULT 'scheduled',
        transaction_count INTEGER DEFAULT 0,
        estimated_gas BIGINT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_batched_transactions_status ON batched_transactions(status);
      CREATE INDEX IF NOT EXISTS idx_batched_transactions_scheduled ON batched_transactions(scheduled_for);
      CREATE INDEX IF NOT EXISTS idx_scheduled_batches_execution ON scheduled_batches(execution_time);
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
};

export default pool; 