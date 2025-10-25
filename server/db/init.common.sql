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

-- ========== 论坛系统表 ==========

-- 文化标签表
CREATE TABLE IF NOT EXISTS culture_tags (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  name_i18n JSONB,
  description TEXT,
  description_i18n JSONB,
  icon TEXT DEFAULT '🏷️',
  created_by INTEGER,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_culture_tags_created_at ON culture_tags(created_at);
CREATE INDEX IF NOT EXISTS idx_culture_tags_usage_count ON culture_tags(usage_count);

-- 文化分享表
CREATE TABLE IF NOT EXISTS culture_shares (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  title_i18n JSONB,
  description TEXT,
  description_i18n JSONB,
  content TEXT,
  content_i18n JSONB,
  user_id INTEGER NOT NULL,
  author_name TEXT NOT NULL,
  cover_image TEXT,
  file_list JSONB,
  language TEXT DEFAULT 'zh',
  status TEXT DEFAULT 'published',
  is_featured BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_culture_shares_user_id ON culture_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_culture_shares_status ON culture_shares(status);
CREATE INDEX IF NOT EXISTS idx_culture_shares_created_at ON culture_shares(created_at);
CREATE INDEX IF NOT EXISTS idx_culture_shares_view_count ON culture_shares(view_count);
CREATE INDEX IF NOT EXISTS idx_culture_shares_like_count ON culture_shares(like_count);

-- 分享-标签关联表
CREATE TABLE IF NOT EXISTS share_tags (
  share_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (share_id, tag_id),
  FOREIGN KEY (share_id) REFERENCES culture_shares(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES culture_tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_share_tags_tag_id ON share_tags(tag_id);

-- 用户-分享交互表
CREATE TABLE IF NOT EXISTS user_share_interactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  share_id INTEGER NOT NULL,
  interaction_type TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, share_id, interaction_type),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (share_id) REFERENCES culture_shares(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_share_interactions_user_id ON user_share_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_share_interactions_share_id ON user_share_interactions(share_id);
CREATE INDEX IF NOT EXISTS idx_user_share_interactions_type ON user_share_interactions(interaction_type);

-- ========== 初始化文化标签数据 ==========
INSERT INTO culture_tags (name, name_i18n, description, description_i18n, icon, usage_count) VALUES
('calligraphy', '{"zh": "书法", "en": "Calligraphy", "ja": "書道", "ko": "서예"}', '中文书法艺术', '{"zh": "中文书法艺术", "en": "Chinese calligraphy art", "ja": "中国書道芸術", "ko": "중국 서예 예술"}', '🖌️', 0),
('painting', '{"zh": "绘画", "en": "Painting", "ja": "絵画", "ko": "그림"}', '东西方绘画作品', '{"zh": "东西方绘画作品", "en": "Eastern and Western paintings", "ja": "東西洋絵画作品", "ko": "동서양 회화 작품"}', '🎨', 0),
('poetry', '{"zh": "诗歌", "en": "Poetry", "ja": "詩", "ko": "시"}', '古典和现代诗歌', '{"zh": "古典和现代诗歌", "en": "Classical and modern poetry", "ja": "古典および現代詩", "ko": "고전 및 현대 시"}', '✍️', 0),
('music', '{"zh": "音乐", "en": "Music", "ja": "音楽", "ko": "음악"}', '传统和现代音乐', '{"zh": "传统和现代音乐", "en": "Traditional and modern music", "ja": "伝統及び現代音楽", "ko": "전통 및 현대 음악"}', '🎵', 0),
('dance', '{"zh": "舞蹈", "en": "Dance", "ja": "ダンス", "ko": "댄스"}', '各文化的舞蹈传统', '{"zh": "各文化的舞蹈传统", "en": "Dance traditions of various cultures", "ja": "様々な文化のダンス伝統", "ko": "다양한 문화의 춤 전통"}', '💃', 0),
('cuisine', '{"zh": "美食", "en": "Cuisine", "ja": "料理", "ko": "요리"}', '世界各地的美食文化', '{"zh": "世界各地的美食文化", "en": "Culinary culture from around the world", "ja": "世界中の食文化", "ko": "세계 각지의 음식 문화"}', '🍜', 0),
('fashion', '{"zh": "服饰", "en": "Fashion", "ja": "ファッション", "ko": "패션"}', '传统和现代服装设计', '{"zh": "传统和现代服装设计", "en": "Traditional and modern fashion design", "ja": "伝統及び現代ファッションデザイン", "ko": "전통 및 현대 패션 디자인"}', '👗', 0),
('crafts', '{"zh": "手工艺", "en": "Crafts", "ja": "工芸", "ko": "공예"}', '传统手工技艺', '{"zh": "传统手工技艺", "en": "Traditional handicrafts", "ja": "伝統工芸", "ko": "전통 공예"}', '🧵', 0),
('architecture', '{"zh": "建筑", "en": "Architecture", "ja": "建築", "ko": "건축"}', '建筑风格和文化', '{"zh": "建筑风格和文化", "en": "Architecture style and culture", "ja": "建築スタイルと文化", "ko": "건축 양식 및 문화"}', '🏯', 0),
('literature', '{"zh": "文学", "en": "Literature", "ja": "文学", "ko": "문학"}', '各文化的文学作品', '{"zh": "各文化的文学作品", "en": "Literary works of various cultures", "ja": "様々な文化の文学作品", "ko": "다양한 문화의 문학 작품"}', '📚', 0),
('philosophy', '{"zh": "哲学", "en": "Philosophy", "ja": "哲学", "ko": "철학"}', '东西方哲学思想', '{"zh": "东西方哲学思想", "en": "Eastern and Western philosophical thoughts", "ja": "東西洋哲学思想", "ko": "동서양 철학 사상"}', '🤔', 0),
('history', '{"zh": "历史", "en": "History", "ja": "歴史", "ko": "역사"}', '文化历史故事', '{"zh": "文化历史故事", "en": "Cultural history stories", "ja": "文化史の物語", "ko": "문화 역사 이야기"}', '📜', 0),
('religion', '{"zh": "宗教", "en": "Religion", "ja": "宗教", "ko": "종교"}', '世界各大宗教', '{"zh": "世界各大宗教", "en": "Major world religions", "ja": "世界の主要宗教", "ko": "세계 주요 종교"}', '⛩️', 0),
('festival', '{"zh": "节日", "en": "Festival", "ja": "祭り", "ko": "축제"}', '传统节日和庆典', '{"zh": "传统节日和庆典", "en": "Traditional festivals and celebrations", "ja": "伝統的な祭りと祭典", "ko": "전통 축제 및 행사"}', '🎆', 0),
('language', '{"zh": "语言", "en": "Language", "ja": "言語", "ko": "언어"}', '语言学和语言文化', '{"zh": "语言学和语言文化", "en": "Linguistics and language culture", "ja": "言語学と言語文化", "ko": "언어학 및 언어 문화"}', '🗣️', 0),
('nature', '{"zh": "自然", "en": "Nature", "ja": "自然", "ko": "자연"}', '自然与生态文化', '{"zh": "自然与生态文化", "en": "Nature and ecological culture", "ja": "自然と生態文化", "ko": "자연 및 생태 문화"}', '🌿', 0),
('science', '{"zh": "科学", "en": "Science", "ja": "科学", "ko": "과학"}', '科学发现和传统知识', '{"zh": "科学发现和传统知识", "en": "Scientific discoveries and traditional knowledge", "ja": "科学的発見と伝統知識", "ko": "과학 발견 및 전통 지식"}', '🔬', 0),
('technology', '{"zh": "技术", "en": "Technology", "ja": "技術", "ko": "기술"}', '传统技术与现代融合', '{"zh": "传统技术与现代融合", "en": "Traditional technology and modern fusion", "ja": "伝統技術と現代の融合", "ko": "전통 기술과 현대 융합"}', '⚙️', 0)
ON CONFLICT (name) DO NOTHING;

