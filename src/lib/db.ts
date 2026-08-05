import pg from 'pg';
import mysql from 'mysql2/promise';

const { Pool } = pg;

// 数据库类型配置
const DB_TYPE = process.env.DB_TYPE || 'postgresql'; // 'mysql' or 'postgresql'

let pgPool: pg.Pool | null = null;
let mysqlPool: mysql.Pool | null = null;

// PostgreSQL连接池
function getPostgresPool(): pg.Pool {
  if (!pgPool) {
    pgPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'jol',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      // 在连接启动参数中指定编码，避免额外的 SET 语句（SET NAMES UTF8 在 PG 中语法非法）
      client_encoding: 'UTF8',
    });
  }
  return pgPool;
}

// MySQL连接池（保留兼容）
function getMySQLPool(): mysql.Pool {
  if (!mysqlPool) {
    mysqlPool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'jol',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4',
    });
  }
  return mysqlPool;
}

// 统一的查询接口
export async function query<T = any>(sql: string, params?: any[]): Promise<T> {
  if (DB_TYPE === 'postgresql') {
    const pool = getPostgresPool();
    const result = await pool.query(sql, params || []);
    return result.rows as T;
  } else {
    const pool = getMySQLPool();
    const [rows] = await pool.execute(sql, params || []);
    return rows as T;
  }
}

// PostgreSQL特有的JSON查询增强
export async function queryJSON<T = any>(table: string, jsonField: string, jsonPath?: string): Promise<T> {
  if (DB_TYPE === 'postgresql') {
    let sql = `SELECT * FROM ${table}`;
    if (jsonPath) {
      sql += ` WHERE ${jsonField}::jsonb @? '${jsonPath}'`;
    }
    return query<T>(sql);
  } else {
    // MySQL JSON查询降级
    return query<T>(`SELECT * FROM ${table}`);
  }
}

// 插入JSON数据（PostgreSQL优化）
export async function insertJSON(table: string, data: Record<string, any>): Promise<any> {
  if (DB_TYPE === 'postgresql') {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
    const fieldNames = fields.join(', ');
    
    const sql = `INSERT INTO ${table} (${fieldNames}) VALUES (${placeholders}) RETURNING *`;
    return query(sql, values);
  } else {
    // MySQL降级处理
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = fields.map(() => '?').join(', ');
    const fieldNames = fields.join(', ');
    
    const sql = `INSERT INTO ${table} (${fieldNames}) VALUES (${placeholders})`;
    return query(sql, values);
  }
}

// 事务支持
export async function transaction<T>(callback: (conn: any) => Promise<T>): Promise<T> {
  if (DB_TYPE === 'postgresql') {
    const pool = getPostgresPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } else {
    const pool = getMySQLPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const result = await callback(conn);
      await conn.commit();
      return result;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }
}

export default { query, queryJSON, insertJSON, transaction };
