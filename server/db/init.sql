-- SQLite 数据库初始化脚本
-- 自动在服务器启动时执行

-- ========== 用户基本信息表 ==========
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  username TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME,
  is_active BOOLEAN DEFAULT 1,
  is_verified BOOLEAN DEFAULT 0
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- ========== 用户偏好设定表 ==========
CREATE TABLE IF NOT EXISTS user_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  game_sound BOOLEAN DEFAULT 1,
  background_music BOOLEAN DEFAULT 0,
  notifications BOOLEAN DEFAULT 1,
  game_difficulty TEXT DEFAULT 'medium',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- ========== 用户游戏统计表 ==========
CREATE TABLE IF NOT EXISTS user_statistics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  completed_games INTEGER DEFAULT 0,
  total_play_time INTEGER DEFAULT 0,
  average_score REAL DEFAULT 0,
  forum_contributions INTEGER DEFAULT 0,
  total_games_played INTEGER DEFAULT 0,
  highest_score REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_statistics_user_id ON user_statistics(user_id);

-- ========== 游戏进度表 ==========
CREATE TABLE IF NOT EXISTS game_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  game_type TEXT NOT NULL,
  theme TEXT,
  current_chapter INTEGER DEFAULT 1,
  score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'in_progress',
  game_data TEXT,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_played DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_game_progress_user_id ON game_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_game_progress_game_type ON game_progress(game_type);
CREATE INDEX IF NOT EXISTS idx_game_progress_status ON game_progress(status);

-- ========== 审计日志表 ==========
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- ========== 创建更新触发器 ==========
-- 触发器已注释 - 应用层通常在应用代码中直接处理 updated_at 字段更新
-- SQLite 触发器的 WHEN 子句可能会导致问题，所以我们依赖应用层来处理时间戳

-- -- 用户表更新触发器
-- CREATE TRIGGER IF NOT EXISTS update_users_updated_at 
-- AFTER UPDATE ON users
-- FOR EACH ROW
-- BEGIN
--   UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
-- END;

-- -- 用户偏好表更新触发器
-- CREATE TRIGGER IF NOT EXISTS update_user_preferences_updated_at 
-- AFTER UPDATE ON user_preferences
-- FOR EACH ROW
-- BEGIN
--   UPDATE user_preferences SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
-- END;

-- -- 用户统计表更新触发器
-- CREATE TRIGGER IF NOT EXISTS update_user_statistics_updated_at 
-- AFTER UPDATE ON user_statistics
-- FOR EACH ROW
-- BEGIN
--   UPDATE user_statistics SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
-- END;

-- ========== 文化标签表 ==========
CREATE TABLE IF NOT EXISTS culture_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- 基本信息（主语言，默认中文）
  name TEXT UNIQUE NOT NULL,
  name_i18n TEXT,  -- JSON: {"zh":"中华文化","en":"Chinese Culture","ja":"中華文化"}
  description TEXT,
  description_i18n TEXT,  -- JSON: 多语言描述
  icon TEXT,
  
  -- 元数据
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  usage_count INTEGER DEFAULT 0,
  
  -- 外键
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_culture_tags_name ON culture_tags(name);
CREATE INDEX IF NOT EXISTS idx_culture_tags_created_at ON culture_tags(created_at);
CREATE INDEX IF NOT EXISTS idx_culture_tags_usage_count ON culture_tags(usage_count DESC);

-- ========== 文化分享表 ==========
CREATE TABLE IF NOT EXISTS culture_shares (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- 基本信息（主语言，默认中文）
  title TEXT NOT NULL,
  title_i18n TEXT,  -- JSON: 多语言标题
  description TEXT NOT NULL,
  description_i18n TEXT,  -- JSON: 多语言描述
  
  -- 内容（支持多语言）
  content TEXT,
  content_i18n TEXT,  -- JSON: 多语言正文内容
  
  -- 作者信息
  user_id INTEGER,
  author_name TEXT,
  
  -- 文件和图片
  cover_image TEXT,  -- 单个封面图路径
  icon TEXT,  -- emoji 或图标
  file_list TEXT,  -- JSON: 文件列表，格式见下方
  
  -- 统计信息
  view_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  
  -- 状态和推荐
  status TEXT DEFAULT 'published',  -- 'draft', 'published', 'archived'
  is_featured BOOLEAN DEFAULT 0,
  language TEXT DEFAULT 'zh',  -- 原始上传语言
  
  -- 时间戳
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- 外键
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_culture_shares_user_id ON culture_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_culture_shares_created_at ON culture_shares(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_culture_shares_status ON culture_shares(status);
CREATE INDEX IF NOT EXISTS idx_culture_shares_is_featured ON culture_shares(is_featured);
CREATE INDEX IF NOT EXISTS idx_culture_shares_language ON culture_shares(language);

-- ========== 分享-标签关联表 ==========
CREATE TABLE IF NOT EXISTS share_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  share_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (share_id) REFERENCES culture_shares(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES culture_tags(id) ON DELETE CASCADE,
  UNIQUE(share_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_share_tags_share_id ON share_tags(share_id);
CREATE INDEX IF NOT EXISTS idx_share_tags_tag_id ON share_tags(tag_id);

-- ========== 用户分享交互表 ==========
CREATE TABLE IF NOT EXISTS user_share_interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  share_id INTEGER NOT NULL,
  interaction_type TEXT,  -- 'like', 'download', 'view'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (share_id) REFERENCES culture_shares(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON user_share_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_share_id ON user_share_interactions(share_id);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON user_share_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON user_share_interactions(created_at);

-- ========== 插入初始标签数据 (可选) ==========
-- 这些是系统预定义的标签，用户也可以创建新标签
INSERT OR IGNORE INTO culture_tags (id, name, name_i18n, description, description_i18n, icon) VALUES
(1, 'calligraphy', '{"zh-Hans": "书法", "zh": "書法", "en": "Calligraphy", "ja": "書道", "ko": "서예"}', '中文书法艺术', '{"zh-Hans": "中文书法艺术", "zh": "中文書法藝術", "en": "Chinese calligraphy art", "ja": "中国書道芸術", "ko": "중국 서예 예술"}', '🖌️'),
(2, 'painting', '{"zh-Hans": "绘画", "zh": "繪畫", "en": "Painting", "ja": "絵画", "ko": "그림"}', '东西方绘画作品', '{"zh-Hans": "东西方绘画作品", "zh": "東西洋繪畫作品", "en": "Eastern and Western paintings", "ja": "東西洋絵画作品", "ko": "동서양 회화 작품"}', '🎨'),
(3, 'poetry', '{"zh-Hans": "诗歌", "zh": "詩歌", "en": "Poetry", "ja": "詩", "ko": "시"}', '古典和现代诗歌', '{"zh-Hans": "古典和现代诗歌", "zh": "古典和現代詩歌", "en": "Classical and modern poetry", "ja": "古典および現代詩", "ko": "고전 및 현대 시"}', '✍️'),
(4, 'music', '{"zh-Hans": "音乐", "zh": "音樂", "en": "Music", "ja": "音楽", "ko": "음악"}', '传统和现代音乐', '{"zh-Hans": "传统和现代音乐", "zh": "傳統和現代音樂", "en": "Traditional and modern music", "ja": "伝統及び現代音楽", "ko": "전통 및 현대 음악"}', '🎵'),
(5, 'dance', '{"zh-Hans": "舞蹈", "zh": "舞蹈", "en": "Dance", "ja": "ダンス", "ko": "댄스"}', '各文化的舞蹈传统', '{"zh-Hans": "各文化的舞蹈传统", "zh": "各文化的舞蹈傳統", "en": "Dance traditions of various cultures", "ja": "様々な文化のダンス伝統", "ko": "다양한 문화의 춤 전통"}', '💃'),
(6, 'cuisine', '{"zh-Hans": "美食", "zh": "美食", "en": "Cuisine", "ja": "料理", "ko": "요리"}', '世界各地的美食文化', '{"zh-Hans": "世界各地的美食文化", "zh": "世界各地的美食文化", "en": "Culinary culture from around the world", "ja": "世界中の食文化", "ko": "세계 각지의 음식 문화"}', '🍜'),
(7, 'fashion', '{"zh-Hans": "服饰", "zh": "服飾", "en": "Fashion", "ja": "ファッション", "ko": "패션"}', '传统和现代服装设计', '{"zh-Hans": "传统和现代服装设计", "zh": "傳統和現代服裝設計", "en": "Traditional and modern fashion design", "ja": "伝統及び現代ファッションデザイン", "ko": "전통 및 현대 패션 디자인"}', '👗'),
(8, 'crafts', '{"zh-Hans": "手工艺", "zh": "手工藝", "en": "Crafts", "ja": "工芸", "ko": "공예"}', '传统手工技艺', '{"zh-Hans": "传统手工技艺", "zh": "傳統手工技藝", "en": "Traditional handicrafts", "ja": "伝統工芸", "ko": "전통 공예"}', '🧵'),
(9, 'architecture', '{"zh-Hans": "建筑", "zh": "建築", "en": "Architecture", "ja": "建築", "ko": "건축"}', '建筑风格和文化', '{"zh-Hans": "建筑风格和文化", "zh": "建築風格和文化", "en": "Architecture style and culture", "ja": "建築スタイルと文化", "ko": "건축 양식 및 문화"}', '🏯'),
(10, 'literature', '{"zh-Hans": "文学", "zh": "文學", "en": "Literature", "ja": "文学", "ko": "문학"}', '各文化的文学作品', '{"zh-Hans": "各文化的文学作品", "zh": "各文化的文學作品", "en": "Literary works of various cultures", "ja": "様々な文化の文学作品", "ko": "다양한 문화의 문학 작품"}', '📚'),
(11, 'philosophy', '{"zh-Hans": "哲学", "zh": "哲學", "en": "Philosophy", "ja": "哲学", "ko": "철학"}', '东西方哲学思想', '{"zh-Hans": "东西方哲学思想", "zh": "東西洋哲學思想", "en": "Eastern and Western philosophical thoughts", "ja": "東西洋哲学思想", "ko": "동서양 철학 사상"}', '🤔'),
(12, 'history', '{"zh-Hans": "历史", "zh": "歷史", "en": "History", "ja": "歴史", "ko": "역사"}', '文化历史故事', '{"zh-Hans": "文化历史故事", "zh": "文化歷史故事", "en": "Cultural history stories", "ja": "文化史の物語", "ko": "문화 역사 이야기"}', '📜'),
(13, 'religion', '{"zh-Hans": "宗教", "zh": "宗教", "en": "Religion", "ja": "宗教", "ko": "종교"}', '世界各大宗教', '{"zh-Hans": "世界各大宗教", "zh": "世界各大宗教", "en": "Major world religions", "ja": "世界の主要宗教", "ko": "세계 주요 종교"}', '⛩️'),
(14, 'festival', '{"zh-Hans": "节日", "zh": "節日", "en": "Festival", "ja": "祭り", "ko": "축제"}', '传统节日和庆典', '{"zh-Hans": "传统节日和庆典", "zh": "傳統節日和慶典", "en": "Traditional festivals and celebrations", "ja": "伝統的な祭りと祭典", "ko": "전통 축제 및 행사"}', '🎆'),
(15, 'language', '{"zh-Hans": "语言", "zh": "語言", "en": "Language", "ja": "言語", "ko": "언어"}', '语言学和语言文化', '{"zh-Hans": "语言学和语言文化", "zh": "語言學和語言文化", "en": "Linguistics and language culture", "ja": "言語学と言語文化", "ko": "언어학 및 언어 문화"}', '🗣️'),
(16, 'nature', '{"zh-Hans": "自然", "zh": "自然", "en": "Nature", "ja": "自然", "ko": "자연"}', '自然与生态文化', '{"zh-Hans": "自然与生态文化", "zh": "自然與生態文化", "en": "Nature and ecological culture", "ja": "自然と生態文化", "ko": "자연 및 생태 문화"}', '🌿'),
(17, 'science', '{"zh-Hans": "科学", "zh": "科學", "en": "Science", "ja": "科学", "ko": "과학"}', '科学发现和传统知识', '{"zh-Hans": "科学发现和传统知识", "zh": "科學發現和傳統知識", "en": "Scientific discoveries and traditional knowledge", "ja": "科学的発見と伝統知識", "ko": "과학 발견 및 전통 지식"}', '🔬'),
(18, 'technology', '{"zh-Hans": "技术", "zh": "技術", "en": "Technology", "ja": "技術", "ko": "기술"}', '传统技术与现代融合', '{"zh-Hans": "传统技术与现代融合", "zh": "傳統技術與現代融合", "en": "Traditional technology and modern fusion", "ja": "伝統技術と現代の融合", "ko": "전통 기술과 현대 융합"}', '⚙️');

-- ========== 插入测试分享数据 ==========
-- 测试用：后续删除即可
INSERT OR IGNORE INTO culture_shares (
  id, title, title_i18n, description, description_i18n, content, content_i18n,
  author_name, user_id, status, icon
) VALUES
  (1, '中国书法艺术入门指南',
   '{"zh-Hans":"中国书法艺术入门指南","en":"Chinese Calligraphy Art Guide","ja":"中国書道美術入門ガイド","ko":"중국 서예 미술 입문 가이드"}',
   '从基础笔画到成为书法爱好者，本文介绍了中国书法的基本知识和学习方法',
   '{"zh-Hans":"从基础笔画到成为书法爱好者，本文介绍了中国书法的基本知识和学习方法","en":"From basic strokes to becoming a calligraphy enthusiast","ja":"基本的なストロークから書道愛好家になるまで","ko":"기본 획에서 서예 애호가가 되기까지"}',
   '# 中国书法艺术\n\n书法是中国古老的艺术形式，具有悠久的历史和深厚的文化底蕴。本指南将帮助初学者理解书法的基本原理和技巧。\n\n## 基础笔画\n\n书法中有八种基本笔画：横、竖、撇、捺、折、钩、挑、提。掌握这些基本笔画是学习书法的第一步。\n\n## 选择工具\n\n传统的书法工具包括：毛笔、墨、纸和砚台。初学者建议从硬笔书法开始，逐步过渡到毛笔书法。',
   '{"zh-Hans":"# 中国书法艺术\n\n书法是中国古老的艺术形式，具有悠久的历史和深厚的文化底蕴。","en":"# Chinese Calligraphy Art","ja":"# 中国書道美術","ko":"# 중국 서예 미술"}',
   'Test User 1', NULL, 'published', '✍️'),
  
  (2, '日本传统茶道文化',
   '{"zh-Hans":"日本传统茶道文化","en":"Japanese Tea Ceremony Culture","ja":"日本伝統茶道文化","ko":"일본 전통 다도 문화"}',
   '探索日本茶道的深层含义和修行方法，了解"一期一会"的精神',
   '{"zh-Hans":"探索日本茶道的深层含义和修行方法","en":"Explore the deep meaning and practice methods of Japanese tea ceremony","ja":"日本茶道の深い意味と修行方法を探索","ko":"일본 다도의 깊은 의미와 수행 방법 탐구"}',
   '# 日本茶道\n\n茶道是日本的一项重要文化传统，强调在冲泡和享受茶的过程中实现精神的修养。\n\n## 茶道的四谛\n\n- 和：人与人之间的和谐\n- 敬：相互尊重和敬畏\n- 清：心灵的纯净\n- 寂：内心的宁静',
   '{"zh-Hans":"# 日本茶道","en":"# Japanese Tea Ceremony","ja":"# 日本茶道","ko":"# 일본 다도"}',
   'Test User 2', NULL, 'published', '🍵'),
  
  (3, '法国葡萄酒文化与品鉴',
   '{"zh-Hans":"法国葡萄酒文化与品鉴","en":"French Wine Culture and Tasting","ja":"フランスワイン文化とテイスティング","ko":"프랑스 와인 문화와 시음"}',
   '深入了解法国葡萄酒的分类、产地和品鉴技巧',
   '{"zh-Hans":"深入了解法国葡萄酒的分类、产地和品鉴技巧","en":"Learn French wine classification and tasting techniques","ja":"フランスワインの分類と試飲技法を学ぶ","ko":"프랑스 와인 분류 및 시음 기술 배우기"}',
   '# 法国葡萄酒文化\n\n法国葡萄酒享誉世界，其独特的风土和酿造工艺使其成为葡萄酒爱好者的首选。\n\n## 著名产区\n\n- 波尔多：以赤霞珠混酿而闻名\n- 勃艮第：以黑皮诺和霞多丽葡萄著称\n- 香槟：气泡酒的代名词',
   '{"zh-Hans":"# 法国葡萄酒文化","en":"# French Wine Culture","ja":"# フランスワイン文化","ko":"# 프랑스 와인 문화"}',
   'Test User 3', NULL, 'published', '🍷'),
  
  (4, '印度瑜伽修行指南',
   '{"zh-Hans":"印度瑜伽修行指南","en":"Indian Yoga Practice Guide","ja":"インドヨガ修行ガイド","ko":"인도 요가 수련 가이드"}',
   '介绍印度瑜伽的起源、类型和修行要点',
   '{"zh-Hans":"介绍印度瑜伽的起源、类型和修行要点","en":"Learn the origins, types and practice points of Indian yoga","ja":"インドヨガの起源、種類、修行のポイントを学ぶ","ko":"인도 요가의 기원, 유형 및 수행 요점 배우기"}',
   '# 印度瑜伽\n\n瑜伽源于古代印度，是一种身心合一的修行方法。现代瑜伽已成为全球健身和养生的流行方式。\n\n## 瑜伽的八支分法\n\n- 持戒（Yama）\n- 精进（Niyama）\n- 体式（Asana）\n- 呼吸调节（Pranayama）',
   '{"zh-Hans":"# 印度瑜伽","en":"# Indian Yoga","ja":"# インドヨガ","ko":"# 인도 요가"}',
   'Test User 4', NULL, 'published', '🧘'),

  (5, '非洲鼓乐文化',
   '{"zh-Hans":"非洲鼓乐文化","zh":"非洲鼓樂文化","en":"African Drum Music Culture","ja":"アフリカドラム音楽文化","ko":"아프리카 드럼 음악 문화"}',
   '了解非洲传统鼓乐的历史和演奏技巧',
   '{"zh-Hans":"了解非洲传统鼓乐的历史和演奏技巧","zh":"了解非洲傳統鼓樂的歷史和演奏技巧","en":"Learn the history and playing techniques of traditional African drums","ja":"伝統的なアフリカドラムの歴史と演奏技術を学ぶ","ko":"전통 아프리카 드럼의 역사와 연주 기법 배우기"}',
   '# 非洲鼓乐\n\n鼓在非洲文化中扮演着重要角色，不仅是音乐工具，更是文化传承的载体。',
   '{"zh-Hans":"# 非洲鼓乐","zh":"# 非洲鼓樂","en":"# African Drums","ja":"# アフリカドラム","ko":"# 아프리카 드럼"}',
   'Test User 8', NULL, 'published', '🥁');

-- ========== 分享与标签关联 ==========
-- 将测试分享与标签关联
INSERT OR IGNORE INTO share_tags (share_id, tag_id) VALUES
  (1, 1),  -- 中国书法 -> calligraphy
  (1, 3),  -- 中国书法 -> poetry
  (2, 6),  -- 日本茶道 -> cuisine
  (2, 14), -- 日本茶道 -> festival
  (3, 6),  -- 法国葡萄酒 -> cuisine
  (3, 2),  -- 法国葡萄酒 -> painting
  (4, 11), -- 印度瑜伽 -> philosophy
  (4, 16); -- 印度瑜伽 -> nature

-- ========== 更新标签的usage_count ==========
-- 根据实际的分享-标签关联关系重新计算usage_count
-- 注意：此步骤已移至 initialize.js 中，以确保每次启动都强制更新
-- UPDATE culture_tags
-- SET usage_count = (
--   SELECT COUNT(*) FROM share_tags WHERE share_tags.tag_id = culture_tags.id
-- );

