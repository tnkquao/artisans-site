import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Configure Neon database with more resilient connection handling
// Use only the configuration options that are actually available in the NeonConfig type
neonConfig.fetchConnectionCache = true;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create a connection pool with error handlers
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20,          // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 10000, // Maximum time to wait for a connection to become available
});

// Add error handling to the pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
  // Don't crash the server, just log the error
});

// Add connection check function
export async function checkDatabaseConnection() {
  let client;
  try {
    client = await pool.connect();
    await client.query('SELECT 1');
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  } finally {
    if (client) client.release();
  }
}

// Initialize database client with the schema
export const db = drizzle({ client: pool, schema });
