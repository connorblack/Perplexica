import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import logger from '../utils/logger';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

logger.info('Initializing database connection...');

let db: BetterSQLite3Database<typeof schema>;
try {
  const sqlite = new Database('data/db.sqlite');
  logger.debug('SQLite database file opened successfully');

  db = drizzle(sqlite, {
    schema: schema,
  });
  logger.info('Database connection established successfully');
} catch (error) {
  logger.error('Failed to initialize database:', error);
  throw error;
}
export default db;
