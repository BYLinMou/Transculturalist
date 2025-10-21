const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

let db = null;
let dbType = null;

/**
 * 获取数据库配置
 * 优先级: config.js > 环境变量 > 默认值
 */
function getDatabaseConfig() {
  let config = {};
  try {
    config = require('../../config');
  } catch (e) {
    try {
      config = require('/app/server/config');
    } catch (e2) {
      console.warn('[DB] No config.js found, using environment variables and defaults');
    }
  }

  const type = config.DB_TYPE || process.env.DB_TYPE || 'sqlite';
  
  if (type === 'postgres') {
    // PostgreSQL 配置
    return {
      type: 'postgres',
      host: config.DB_HOST || process.env.DB_HOST || 'localhost',
      port: parseInt(config.DB_PORT || process.env.DB_PORT || '5432'),
      database: config.DB_NAME || process.env.DB_NAME || 'transculturalist',
      user: config.DB_USER || process.env.DB_USER || 'postgres',
      password: config.DB_PASSWORD || process.env.DB_PASSWORD || 'postgres',
    };
  } else {
    // SQLite 配置（默认）
    const dbPath = config.DB_PATH || process.env.DB_PATH || './data/transculturalist.db';
    const absolutePath = path.isAbsolute(dbPath) 
      ? dbPath 
      : path.join(__dirname, '../../', dbPath);
    
    return {
      type: 'sqlite',
      path: absolutePath
    };
  }
}

/**
 * 获取或创建数据库连接
 * SQLite 使用单例模式，PostgreSQL 使用连接池
 */
function getDatabase() {
  const dbConfig = getDatabaseConfig();

  if (db && dbType === dbConfig.type) {
    return Promise.resolve(db);
  }

  dbType = dbConfig.type;

  if (dbConfig.type === 'postgres') {
    // PostgreSQL 连接池初始化
    return new Promise((resolve, reject) => {
      const pool = new Pool({
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        user: dbConfig.user,
        password: dbConfig.password,
      });

      pool.on('error', (err) => {
        console.error('[DB] PostgreSQL pool error:', err);
      });

      // 测试连接
      pool.query('SELECT NOW()', (err, result) => {
        if (err) {
          console.error('[DB] Failed to connect to PostgreSQL:', err);
          reject(err);
        } else {
          console.log('[DB] PostgreSQL connected:', dbConfig.host + ':' + dbConfig.port);
          db = pool;
          resolve(db);
        }
      });
    });
  } else {
    // SQLite 初始化
    return new Promise((resolve, reject) => {
      // 创建目录（如果不存在）
      const dir = path.dirname(dbConfig.path);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      db = new sqlite3.Database(dbConfig.path, (err) => {
        if (err) {
          console.error('[DB] Failed to open database:', err);
          reject(err);
        } else {
          console.log('[DB] SQLite database opened at:', dbConfig.path);
          // 启用外键约束
          db.run('PRAGMA foreign_keys = ON', (err) => {
            if (err) {
              console.error('[DB] Failed to enable foreign keys:', err);
              reject(err);
            } else {
              resolve(db);
            }
          });
        }
      });
    });
  }
}

/**
 * 执行 SQL 查询（返回所有行）
 * 同时支持 SQLite 和 PostgreSQL
 */
function queryAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().then((database) => {
      if (dbType === 'postgres') {
        // PostgreSQL 查询
        database.query(sql, params, (err, result) => {
          if (err) {
            console.error('[DB Error]', { sql, error: err.message });
            reject(err);
          } else {
            resolve(result.rows || []);
          }
        });
      } else {
        // SQLite 查询
        database.all(sql, params, (err, rows) => {
          if (err) {
            console.error('[DB Error]', { sql, error: err.message });
            reject(err);
          } else {
            resolve(rows || []);
          }
        });
      }
    }).catch(reject);
  });
}

/**
 * 执行 SQL 查询（返回单行）
 * 同时支持 SQLite 和 PostgreSQL
 */
function queryOne(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().then((database) => {
      if (dbType === 'postgres') {
        // PostgreSQL 查询
        database.query(sql, params, (err, result) => {
          if (err) {
            console.error('[DB Error]', { sql, error: err.message });
            reject(err);
          } else {
            resolve(result.rows[0] || null);
          }
        });
      } else {
        // SQLite 查询
        database.get(sql, params, (err, row) => {
          if (err) {
            console.error('[DB Error]', { sql, error: err.message });
            reject(err);
          } else {
            resolve(row || null);
          }
        });
      }
    }).catch(reject);
  });
}

/**
 * 执行 SQL 命令（INSERT, UPDATE, DELETE）
 * 同时支持 SQLite 和 PostgreSQL
 */
function execute(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().then((database) => {
      if (dbType === 'postgres') {
        // PostgreSQL 执行
        database.query(sql, params, (err, result) => {
          if (err) {
            console.error('[DB Error]', { sql, error: err.message });
            reject(err);
          } else {
            resolve({
              lastID: result.rows[0]?.id || null,
              changes: result.rowCount || 0
            });
          }
        });
      } else {
        // SQLite 执行
        database.run(sql, params, function(err) {
          if (err) {
            console.error('[DB Error]', { sql, error: err.message });
            reject(err);
          } else {
            resolve({
              lastID: this.lastID,
              changes: this.changes
            });
          }
        });
      }
    }).catch(reject);
  });
}

/**
 * 执行多条 SQL 语句（用于初始化）
 * 同时支持 SQLite 和 PostgreSQL
 */
function executeSql(sql) {
  return new Promise((resolve, reject) => {
    getDatabase().then((database) => {
      if (dbType === 'postgres') {
        // PostgreSQL 执行多条语句
        database.query(sql, (err, result) => {
          if (err) {
            console.error('[DB Error] Failed to execute SQL:', err.message);
            reject(err);
          } else {
            resolve();
          }
        });
      } else {
        // SQLite 执行多条语句
        // Parse statements more carefully for SQLite
        let statements = [];
        let currentStatement = '';
        let inTrigger = false;
        
        const lines = sql.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
          let line = lines[i];
          const trimmed = line.trim();
          
          // Skip completely empty lines and comment-only lines
          if (!trimmed || trimmed.startsWith('--') || trimmed.startsWith('/*')) {
            continue;
          }
          
          // Track if we're in a trigger definition
          if (trimmed.toUpperCase().startsWith('CREATE TRIGGER')) {
            inTrigger = true;
          }
          
          currentStatement += line + '\n';
          
          // Check if this line ends a statement with semicolon
          if (trimmed.endsWith(';')) {
            // Remove the trailing semicolon
            const stmt = currentStatement
              .substring(0, currentStatement.lastIndexOf(';'))
              .trim();
            
            if (stmt.length > 0) {
              statements.push(stmt);
            }
            currentStatement = '';
            inTrigger = false;
          }
        }
        
        // Add any remaining statement
        if (currentStatement.trim().length > 0) {
          statements.push(currentStatement.trim());
        }

        let index = 0;
        const executeNext = () => {
          if (index >= statements.length) {
            resolve();
            return;
          }

          const statement = statements[index];
          const stmtNumber = index + 1;
          index++;

          // Log the statement being executed (first 80 chars)
          const preview = statement.substring(0, 80).replace(/\n/g, ' ');
          console.log(`[DB Init] Executing statement ${stmtNumber}: ${preview}...`);

          // Use db.run for better error handling
          database.run(statement, (err) => {
            if (err) {
              console.error(`[DB Error] Failed on statement ${stmtNumber}:`, err.message);
              console.error('[DB Error] Statement:', statement.substring(0, 200));
              reject(err);
            } else {
              executeNext();
            }
          });
        };

        executeNext();
      }
    }).catch(reject);
  });
}

/**
 * 测试数据库连接
 */
async function testConnection() {
  try {
    if (dbType === 'postgres') {
      const result = await queryOne('SELECT NOW() as now');
      console.log('[DB] PostgreSQL connection test successful');
    } else {
      const result = await queryOne('SELECT datetime("now") as now');
      console.log('[DB] SQLite connection test successful:', result.now);
    }
    return true;
  } catch (error) {
    console.error('[DB] Connection test failed:', error.message);
    return false;
  }
}

/**
 * 关闭数据库连接
 */
async function closeDatabase() {
  if (db) {
    if (dbType === 'postgres') {
      // PostgreSQL 连接池关闭
      return new Promise((resolve, reject) => {
        db.end((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('[DB] PostgreSQL connection pool closed');
            db = null;
            dbType = null;
            resolve();
          }
        });
      });
    } else {
      // SQLite 连接关闭
      return new Promise((resolve, reject) => {
        db.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('[DB] SQLite database closed');
            db = null;
            dbType = null;
            resolve();
          }
        });
      });
    }
  }
}

module.exports = {
  queryAll,
  queryOne,
  execute,
  executeSql,
  getDatabase,
  closeDatabase,
  testConnection,
  getDatabaseConfig
};
