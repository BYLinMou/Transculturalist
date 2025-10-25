/**
 * SQL 方言转换层
 * 在 SQLite 和 PostgreSQL 之间转换 SQL 语句
 * 这样可以用统一的方言编写 SQL，系统会自动转换
 */

const { getDatabaseConfig } = require('./connection');

/**
 * 根据当前数据库类型转换 SQL 语句
 * @param {string} sql - 通用 SQL 语句
 * @param {string} targetType - 目标数据库类型（可选，如果不提供则使用配置中的类型）
 * @returns {string} 转换后的 SQL 语句
 */
function convertSql(sql, targetType = null) {
  const dbConfig = getDatabaseConfig();
  const type = targetType || dbConfig.type;

  if (type === 'postgres') {
    return convertToPostgreSQL(sql);
  } else {
    return convertToSQLite(sql);
  }
}

/**
 * 将通用 SQL 转换为 PostgreSQL
 * @param {string} sql - 原始 SQL
 * @returns {string} PostgreSQL SQL
 */
function convertToPostgreSQL(sql) {
  let converted = sql;

  // AUTOINCREMENT -> SERIAL 或使用 GENERATED ALWAYS AS IDENTITY
  converted = converted.replace(/INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT/gi, 
    'SERIAL PRIMARY KEY');

  // DATETIME -> TIMESTAMP
  converted = converted.replace(/DATETIME/gi, 'TIMESTAMP');

  // 布尔值 1/0 -> TRUE/FALSE
  converted = converted.replace(/\bDEFAULT\s+1\b/gi, 'DEFAULT TRUE');
  converted = converted.replace(/\bDEFAULT\s+0\b/gi, 'DEFAULT FALSE');

  // CURRENT_TIMESTAMP 保持不变（两个数据库都支持）
  // GROUP_CONCAT(field, ', ') -> STRING_AGG(field, ', ')
  converted = converted.replace(/GROUP_CONCAT\s*\(\s*(\w+)\s*,\s*'([^']+)'\s*\)/gi,
    "STRING_AGG($1, '$2')");

  // SQLite datetime("now") -> PostgreSQL NOW()
  converted = converted.replace(/datetime\s*\(\s*['"]now["']\s*\)/gi, 'NOW()');

  // SQLite 的 AUTOINCREMENT 需要改为 SERIAL 或 GENERATED
  converted = converted.replace(/\bLAST_INSERT_ROWID\s*\(\s*\)/gi, 'lastval()');

  return converted;
}

/**
 * 将通用 SQL 转换为 SQLite
 * @param {string} sql - 原始 SQL
 * @returns {string} SQLite SQL
 */
function convertToSQLite(sql) {
  let converted = sql;

  // SERIAL -> INTEGER PRIMARY KEY AUTOINCREMENT
  converted = converted.replace(/SERIAL\s+PRIMARY\s+KEY/gi, 
    'INTEGER PRIMARY KEY AUTOINCREMENT');

  // TIMESTAMP -> DATETIME
  converted = converted.replace(/TIMESTAMP/gi, 'DATETIME');

  // 布尔值 TRUE/FALSE -> 1/0
  converted = converted.replace(/DEFAULT\s+TRUE/gi, 'DEFAULT 1');
  converted = converted.replace(/DEFAULT\s+FALSE/gi, 'DEFAULT 0');

  // STRING_AGG -> GROUP_CONCAT
  converted = converted.replace(/STRING_AGG\s*\(\s*(\w+)\s*,\s*'([^']+)'\s*\)/gi,
    "GROUP_CONCAT($1, '$2')");

  // PostgreSQL NOW() -> SQLite datetime("now")
  converted = converted.replace(/NOW\s*\(\s*\)/gi, "datetime('now')");

  // PostgreSQL lastval() -> SQLite last_insert_rowid()
  converted = converted.replace(/lastval\s*\(\s*\)/gi, 'last_insert_rowid()');

  return converted;
}

/**
 * 获取用于检查表是否存在的 SQL 语句
 * @param {string} tableName - 表名
 * @returns {string} SQL 语句
 */
function getTableExistsQuery(tableName) {
  const dbConfig = getDatabaseConfig();
  
  if (dbConfig.type === 'postgres') {
    return `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = '${tableName}'
    )`;
  } else {
    return `SELECT name FROM sqlite_master 
            WHERE type='table' AND name='${tableName}'`;
  }
}

/**
 * 获取列出所有表的 SQL 语句
 * @returns {string} SQL 语句
 */
function getListTablesQuery() {
  const dbConfig = getDatabaseConfig();
  
  if (dbConfig.type === 'postgres') {
    return `SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public'`;
  } else {
    return `SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'`;
  }
}

/**
 * 获取插入后获取 ID 的 SQL 语句
 * @param {string} lastIdVariable - 最后插入的 ID 变量名
 * @returns {string} SQL 语句
 */
function getLastInsertIdQuery() {
  const dbConfig = getDatabaseConfig();
  
  if (dbConfig.type === 'postgres') {
    return 'RETURNING id';
  } else {
    return ''; // SQLite 通过 this.lastID 获取
  }
}

module.exports = {
  convertSql,
  convertToPostgreSQL,
  convertToSQLite,
  getTableExistsQuery,
  getListTablesQuery,
  getLastInsertIdQuery
};
