#!/usr/bin/env node

/**
 * 数据库初始化测试脚本
 * 用于验证数据库自动初始化系统是否正常工作
 */

const { initializeDatabase, getDatabaseStatus } = require('./src/db/initialize');

async function test() {
  console.log('================================');
  console.log('数据库初始化测试');
  console.log('================================\n');

  try {
    // 测试 1: 初始化数据库
    console.log('测试 1: 初始化数据库...');
    const initResult = await initializeDatabase();
    
    if (initResult) {
      console.log('✓ 数据库初始化成功\n');
    } else {
      console.log('⚠ 数据库初始化失败（可能是连接问题）\n');
    }

    // 测试 2: 获取数据库状态
    console.log('测试 2: 获取数据库状态...');
    const status = await getDatabaseStatus();
    
    console.log('数据库状态:');
    console.log('  - 连接状态:', status.connected ? '✓ 已连接' : '✗ 未连接');
    
    if (status.connected && status.tables) {
      console.log('  - 表数量:', status.tables.length);
      console.log('  - 表列表:');
      status.tables.forEach(table => {
        console.log(`    • ${table}`);
      });
    }
    
    if (status.error) {
      console.log('  - 错误信息:', status.error);
    }

    console.log('\n================================');
    console.log('测试完成');
    console.log('================================');
    
    // 验证预期表是否存在
    const expectedTables = ['users', 'user_preferences', 'user_statistics', 'game_progress', 'audit_log'];
    if (status.connected && status.tables) {
      const missingTables = expectedTables.filter(t => !status.tables.includes(t));
      
      if (missingTables.length === 0) {
        console.log('\n✓ 所有预期表都已创建！');
      } else {
        console.log('\n⚠ 缺少以下表:', missingTables.join(', '));
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('\n✗ 测试失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行测试
test();
