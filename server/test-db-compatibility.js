#!/usr/bin/env node

/**
 * 数据库兼容性测试脚本
 * 验证 SQLite 和 PostgreSQL 两种数据库是否能正常工作
 * 
 * 使用方式:
 *   node server/test-db-compatibility.js
 */

const path = require('path');
const fs = require('fs');

// 动态加载数据库模块
async function testDatabaseCompatibility() {
  console.log('='.repeat(60));
  console.log('  数据库兼容性测试');
  console.log('='.repeat(60));
  console.log('');

  try {
    // 测试 SQLite
    console.log('📦 测试 SQLite...');
    await testSQLite();
    console.log('✅ SQLite 测试通过\n');
  } catch (error) {
    console.error('❌ SQLite 测试失败:', error.message);
    console.error('');
  }

  try {
    // 测试 PostgreSQL（可选，如果配置了）
    console.log('🐘 测试 PostgreSQL...');
    await testPostgreSQL();
    console.log('✅ PostgreSQL 测试通过\n');
  } catch (error) {
    console.log('⚠️  PostgreSQL 测试失败或未配置');
    console.log('   原因:', error.message);
    console.log('   注意: PostgreSQL 是可选的，本地开发可以使用 SQLite\n');
  }

  console.log('='.repeat(60));
  console.log('  测试完成!');
  console.log('='.repeat(60));
}

/**
 * 测试 SQLite
 */
async function testSQLite() {
  try {
    // 检查 sqlite3 模块
    const sqlite3 = require('sqlite3');
    console.log('  ✓ sqlite3 模块已安装');

    // 获取数据库配置
    const config = require('../config');
    const dbPath = path.join(__dirname, '../', config.DB_PATH || './data/transculturalist.db');
    console.log('  ✓ 数据库路径:', dbPath);

    // 创建目录
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log('  ✓ 创建数据库目录:', dir);
    }

    // 测试连接
    const testDb = new (require('sqlite3').verbose()).Database(dbPath, (err) => {
      if (err) throw err;
    });

    // 执行查询
    await new Promise((resolve, reject) => {
      testDb.get('SELECT datetime("now") as now', (err, row) => {
        if (err) reject(err);
        else {
          console.log('  ✓ 查询成功，当前时间:', row.now);
          resolve();
        }
      });
    });

    // 关闭连接
    await new Promise((resolve, reject) => {
      testDb.close((err) => {
        if (err) reject(err);
        else {
          console.log('  ✓ 连接关闭');
          resolve();
        }
      });
    });

  } catch (error) {
    throw error;
  }
}

/**
 * 测试 PostgreSQL
 */
async function testPostgreSQL() {
  try {
    // 检查 pg 模块
    const { Pool } = require('pg');
    console.log('  ✓ pg 模块已安装');

    // 获取数据库配置
    const config = require('../config');
    
    if (config.DB_TYPE !== 'postgres') {
      throw new Error('DB_TYPE 未设置为 postgres，跳过测试');
    }

    // 创建连接池
    const pool = new Pool({
      host: config.DB_HOST || 'localhost',
      port: config.DB_PORT || 5432,
      database: config.DB_NAME || 'transculturalist',
      user: config.DB_USER || 'postgres',
      password: config.DB_PASSWORD || 'postgres',
    });

    console.log(`  ✓ 连接到 PostgreSQL: ${config.DB_HOST}:${config.DB_PORT}`);

    // 测试查询
    const result = await new Promise((resolve, reject) => {
      pool.query('SELECT NOW() as now', (err, result) => {
        if (err) reject(err);
        else {
          console.log('  ✓ 查询成功，当前时间:', result.rows[0].now);
          resolve(result);
        }
      });
    });

    // 关闭连接池
    await new Promise((resolve, reject) => {
      pool.end((err) => {
        if (err) reject(err);
        else {
          console.log('  ✓ 连接池关闭');
          resolve();
        }
      });
    });

  } catch (error) {
    throw error;
  }
}

// 主程序
if (require.main === module) {
  testDatabaseCompatibility().catch((error) => {
    console.error('测试脚本错误:', error);
    process.exit(1);
  });
}

module.exports = {
  testDatabaseCompatibility,
  testSQLite,
  testPostgreSQL
};
