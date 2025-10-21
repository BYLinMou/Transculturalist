-- 数据库初始化脚本 - 同时支持 SQLite 和 PostgreSQL
-- 建议在 PostgreSQL 中使用时，使用 pgAdmin 或 psql 工具执行此脚本
-- 在 SQLite 中使用时，放在 server/db/init.sql，系统会自动执行

-- ========== 用户基本信息表 ==========
-- PostgreSQL: CREATE TABLE IF NOT EXISTS 保持不变
-- SQLite: CREATE TABLE IF NOT EXISTS 保持不变
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  username TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- ========== 用户偏好设定表 ==========
CREATE TABLE IF NOT EXISTS user_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL,
  game_sound BOOLEAN DEFAULT TRUE,
  background_music BOOLEAN DEFAULT FALSE,
  notifications BOOLEAN DEFAULT TRUE,
  game_difficulty TEXT DEFAULT 'medium',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- ========== 用户游戏统计表 ==========
CREATE TABLE IF NOT EXISTS user_statistics (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL,
  completed_games INTEGER DEFAULT 0,
  total_play_time INTEGER DEFAULT 0,
  average_score REAL DEFAULT 0,
  forum_contributions INTEGER DEFAULT 0,
  total_games_played INTEGER DEFAULT 0,
  highest_score REAL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_statistics_user_id ON user_statistics(user_id);

-- ========== 游戏进度表 ==========
CREATE TABLE IF NOT EXISTS game_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  game_type TEXT NOT NULL,
  theme TEXT,
  current_chapter INTEGER DEFAULT 1,
  score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'in_progress',
  game_data TEXT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_played TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_game_progress_user_id ON game_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_game_progress_game_type ON game_progress(game_type);
CREATE INDEX IF NOT EXISTS idx_game_progress_status ON game_progress(status);

-- ========== 审计日志表 ==========
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- ========== 创建更新触发器 ==========
-- PostgreSQL 触发器 (需要分别创建函数和触发器)
-- 这部分需要在 PostgreSQL 中单独处理，因为语法不同

-- SQLite 触发器
-- 用户表更新触发器
CREATE TRIGGER IF NOT EXISTS update_users_updated_at 
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 用户偏好表更新触发器
CREATE TRIGGER IF NOT EXISTS update_user_preferences_updated_at 
AFTER UPDATE ON user_preferences
FOR EACH ROW
BEGIN
  UPDATE user_preferences SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 用户统计表更新触发器
CREATE TRIGGER IF NOT EXISTS update_user_statistics_updated_at 
AFTER UPDATE ON user_statistics
FOR EACH ROW
BEGIN
  UPDATE user_statistics SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
