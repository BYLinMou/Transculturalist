-- PostgreSQL 专用初始化脚本
-- 包含触发器函数和 PostgreSQL 特定的语法

-- ========== 创建触发器函数 ==========
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ========== 用户表 ==========
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

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- 用户表触发器
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

-- 用户偏好表触发器
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

-- 用户统计表触发器
DROP TRIGGER IF EXISTS update_user_statistics_updated_at ON user_statistics;
CREATE TRIGGER update_user_statistics_updated_at BEFORE UPDATE ON user_statistics
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
