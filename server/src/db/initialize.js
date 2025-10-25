const fs = require('fs');
const path = require('path');
const { queryOne, execute, executeSql, testConnection, getDatabaseConfig } = require('./connection');
const { convertSql, getListTablesQuery } = require('./sqlDialect');

/**
 * 初始化数据库
 * 读取 SQL 文件并执行，创建所有必要的表和索引
 * 同时支持 SQLite 和 PostgreSQL
 */
async function initializeDatabase() {
  try {
    console.log('[DB Init] Starting database initialization...');

    // 1. 获取数据库配置
    const dbConfig = getDatabaseConfig();
    console.log('[DB Init] Database type:', dbConfig.type);

    // 2. 测试数据库连接
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }

    // 3. 选择对应的 SQL 初始化脚本
    let sqlFiles = [];
    if (dbConfig.type === 'postgres') {
      sqlFiles = [
        path.join(__dirname, '../../db/init.common.sql'),
        path.join(__dirname, '../../db/init.forum.postgres.sql')
      ];
    } else {
      sqlFiles = [
        path.join(__dirname, '../../db/init.sql')
      ];
    }
    
    // 读取并合并所有 SQL 文件
    let sql = '';
    for (const sqlPath of sqlFiles) {
      if (fs.existsSync(sqlPath)) {
        console.log('[DB Init] Reading SQL file from:', sqlPath);
        const fileContent = fs.readFileSync(sqlPath, 'utf8');
        sql += '\n' + fileContent + '\n';
      } else {
        console.warn('[DB Init] SQL file not found:', sqlPath);
      }
    }
    
    if (!sql.trim()) {
      console.warn('[DB Init] No SQL files found for initialization');
      return false;
    }

    // 4. 如果是 SQLite，需要将 SQL 转换为 SQLite 格式
    if (dbConfig.type !== 'postgres') {
      sql = convertSql(sql, 'sqlite');
    }

    // 5. 执行 SQL 脚本
    console.log('[DB Init] Executing SQL scripts for', dbConfig.type, '...');
    await executeSql(sql);
    console.log('[DB Init] ✓ Database tables created/verified and test data inserted successfully');

    // 5.1. 强制重新计算所有标签的 usage_count
    // 这可以确保即使数据库文件已存在，启动时也能获得最新的计数值
    console.log('[DB Init] Recalculating tag usage counts...');
    await execute(`
      UPDATE culture_tags
      SET usage_count = (
        SELECT COUNT(*) FROM share_tags WHERE share_tags.tag_id = culture_tags.id
      )
    `);
    console.log('[DB Init] ✓ Tag usage counts recalculated.');

    // 6. 验证表是否存在
    const listTablesQuery = getListTablesQuery();
    const tableList = await queryOne(listTablesQuery);

    console.log('[DB Init] ✓ Tables verified');
    
    return true;
  } catch (error) {
    console.error('[DB Init] ✗ Database initialization failed:', error.message);
    // 不抛出错误，让应用继续运行（即使没有数据库）
    return false;
  }
}

/**
 * 检查认证功能是否应该启用
 * 需要同时满足：
 * 1. config.ENABLE_AUTH = true
 * 2. 数据库连接成功
 */
async function shouldEnableAuth() {
  let config = {};
  try {
    config = require('../../config');
  } catch (e) {
    try {
      config = require('/app/server/config');
    } catch (e2) {
      console.warn('[DB Init] No config.js found');
    }
  }

  // 如果 config 中禁用了认证，直接返回 false
  if (!config.ENABLE_AUTH) {
    console.log('[DB Init] Authentication disabled in config');
    return false;
  }

  // 测试数据库连接
  const dbConfig = getDatabaseConfig();
  console.log('[DB Init] Checking if auth should be enabled...');
  console.log('[DB Init] Config ENABLE_AUTH:', config.ENABLE_AUTH);
  console.log('[DB Init] Database type:', dbConfig.type);
  
  if (dbConfig.type === 'sqlite') {
    console.log('[DB Init] Database path:', dbConfig.path);
  } else if (dbConfig.type === 'postgres') {
    console.log('[DB Init] PostgreSQL host:', dbConfig.host + ':' + dbConfig.port);
  }

  const isConnected = await testConnection();
  
  if (!isConnected) {
    console.warn('[DB Init] Database not available, authentication will be disabled');
    return false;
  }

  console.log('[DB Init] ✓ Authentication enabled');
  return true;
}

/**
 * 获取数据库状态信息
 * 同时支持 SQLite 和 PostgreSQL
 */
async function getDatabaseStatus() {
  try {
    const isConnected = await testConnection();
    if (!isConnected) {
      return {
        connected: false,
        type: null,
        tables: []
      };
    }

    const dbConfig = getDatabaseConfig();
    let tableList = [];

    if (dbConfig.type === 'postgres') {
      // PostgreSQL 查询表列表
      const result = await queryOne(`
        SELECT string_agg(table_name, ', ') as tables 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      tableList = result && result.tables 
        ? result.tables.split(', ') 
        : [];
    } else {
      // SQLite 查询表列表
      const result = await queryOne(`
        SELECT GROUP_CONCAT(name, ', ') as tables FROM sqlite_master 
        WHERE type='table' 
        AND name NOT LIKE 'sqlite_%'
      `);
      tableList = result && result.tables 
        ? result.tables.split(', ') 
        : [];
    }

    return {
      connected: true,
      type: dbConfig.type,
      tables: tableList
    };
  } catch (error) {
    return {
      connected: false,
      type: null,
      error: error.message,
      tables: []
    };
  }
}

module.exports = {
  initializeDatabase,
  shouldEnableAuth,
  getDatabaseStatus
};
