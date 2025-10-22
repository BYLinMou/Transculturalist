-- 论坛文化分享系统 - 数据库初始化脚本
-- PostgreSQL 版本
-- 自动在服务器启动时执行

-- ========== 文化标签表 ==========
CREATE TABLE IF NOT EXISTS culture_tags (
  id SERIAL PRIMARY KEY,
  
  -- 基本信息（主语言，默认中文）
  name VARCHAR(100) UNIQUE NOT NULL,
  name_i18n JSONB,  -- {"zh":"中华文化","en":"Chinese Culture","ja":"中華文化"}
  description TEXT,
  description_i18n JSONB,  -- 多语言描述
  icon VARCHAR(10),
  
  -- 元数据
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  usage_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_culture_tags_name ON culture_tags(name);
CREATE INDEX IF NOT EXISTS idx_culture_tags_created_at ON culture_tags(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_culture_tags_usage_count ON culture_tags(usage_count DESC);

-- ========== 文化分享表 ==========
CREATE TABLE IF NOT EXISTS culture_shares (
  id SERIAL PRIMARY KEY,
  
  -- 基本信息（主语言，默认中文）
  title VARCHAR(255) NOT NULL,
  title_i18n JSONB,  -- 多语言标题
  description TEXT NOT NULL,
  description_i18n JSONB,  -- 多语言描述
  
  -- 内容（支持多语言）
  content TEXT,
  content_i18n JSONB,  -- 多语言正文内容
  
  -- 作者信息
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  author_name VARCHAR(100),
  
  -- 文件和图片
  cover_image VARCHAR(255),  -- 单个封面图路径
  file_list JSONB,  -- 文件列表
  
  -- 统计信息
  view_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  
  -- 状态和推荐
  status VARCHAR(20) DEFAULT 'published',
  is_featured BOOLEAN DEFAULT false,
  language VARCHAR(10) DEFAULT 'zh',  -- 原始上传语言
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_culture_shares_user_id ON culture_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_culture_shares_created_at ON culture_shares(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_culture_shares_status ON culture_shares(status);
CREATE INDEX IF NOT EXISTS idx_culture_shares_is_featured ON culture_shares(is_featured);
CREATE INDEX IF NOT EXISTS idx_culture_shares_language ON culture_shares(language);

-- ========== 分享-标签关联表 ==========
CREATE TABLE IF NOT EXISTS share_tags (
  id SERIAL PRIMARY KEY,
  share_id INTEGER NOT NULL REFERENCES culture_shares(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES culture_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(share_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_share_tags_share_id ON share_tags(share_id);
CREATE INDEX IF NOT EXISTS idx_share_tags_tag_id ON share_tags(tag_id);

-- ========== 用户分享交互表 ==========
CREATE TABLE IF NOT EXISTS user_share_interactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  share_id INTEGER NOT NULL REFERENCES culture_shares(id) ON DELETE CASCADE,
  interaction_type VARCHAR(20),  -- 'like', 'download', 'view'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON user_share_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_share_id ON user_share_interactions(share_id);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON user_share_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON user_share_interactions(created_at);

-- ========== 创建更新触发器 ==========
CREATE OR REPLACE FUNCTION update_culture_shares_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_culture_shares_updated_at_trigger
BEFORE UPDATE ON culture_shares
FOR EACH ROW
EXECUTE FUNCTION update_culture_shares_updated_at();

CREATE OR REPLACE FUNCTION update_culture_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_culture_tags_updated_at_trigger
BEFORE UPDATE ON culture_tags
FOR EACH ROW
EXECUTE FUNCTION update_culture_tags_updated_at();

-- ========== 插入初始标签数据 (可选) ==========
INSERT INTO culture_tags (name, description, icon, name_i18n, description_i18n) VALUES
  ('中华文化', '中国传统文化及现代文化', '🏮',
   '{"zh":"中华文化","en":"Chinese Culture","ja":"中華文化","ko":"중국 문화"}',
   '{"zh":"中国传统文化及现代文化","en":"Traditional and modern Chinese culture","ja":"中国の伝統文化と現代文化","ko":"중국의 전통 문화와 현대 문화"}'),
  
  ('日本文化', '日本传统与现代文化', '🗾',
   '{"zh":"日本文化","en":"Japanese Culture","ja":"日本文化","ko":"일본 문화"}',
   '{"zh":"日本传统与现代文化","en":"Traditional and modern Japanese culture","ja":"日本の伝統と現代文化","ko":"일본의 전통과 현대 문화"}'),
  
  ('西方文化', '欧美文化及传统', '🏛️',
   '{"zh":"西方文化","en":"Western Culture","ja":"西方文化","ko":"서양 문화"}',
   '{"zh":"欧美文化及传统","en":"European and American culture and traditions","ja":"ヨーロッパとアメリカの文化と伝統","ko":"유럽과 미국 문화 및 전통"}'),
  
  ('印度文化', '印度及南亚文化', '🕌',
   '{"zh":"印度文化","en":"Indian Culture","ja":"インド文化","ko":"인도 문화"}',
   '{"zh":"印度及南亚文化","en":"Indian and South Asian culture","ja":"インドと南アジアの文化","ko":"인도 및 남아시아 문화"}'),
  
  ('非洲文化', '非洲大陆文化', '🌍',
   '{"zh":"非洲文化","en":"African Culture","ja":"アフリカ文化","ko":"아프리카 문화"}',
   '{"zh":"非洲大陆文化","en":"African continental culture","ja":"アフリカ大陸の文化","ko":"아프리카 대륙 문화"}'),
  
  ('原住民文化', '世界各地原住民文化', '🪶',
   '{"zh":"原住民文化","en":"Indigenous Culture","ja":"先住民文化","ko":"원주민 문화"}',
   '{"zh":"世界各地原住民文化","en":"Indigenous cultures from around the world","ja":"世界各地の先住民文化","ko":"세계 각지의 원주민 문화"}'),
  
  ('书法', '书法艺术与技法', '✍️',
   '{"zh":"书法","en":"Calligraphy","ja":"書道","ko":"서예"}',
   '{"zh":"书法艺术与技法","en":"Art and techniques of calligraphy","ja":"書道芸術と技法","ko":"서예 예술과 기법"}'),
  
  ('绘画', '绘画艺术作品', '🎨',
   '{"zh":"绘画","en":"Painting","ja":"絵画","ko":"회화"}',
   '{"zh":"绘画艺术作品","en":"Painting art and works","ja":"絵画芸術作品","ko":"회화 예술 작품"}'),
  
  ('音乐', '音乐与乐器', '🎵',
   '{"zh":"音乐","en":"Music","ja":"音楽","ko":"음악"}',
   '{"zh":"音乐与乐器","en":"Music and musical instruments","ja":"音楽と楽器","ko":"음악 및 악기"}'),
  
  ('舞蹈', '舞蹈艺术与表演', '💃',
   '{"zh":"舞蹈","en":"Dance","ja":"ダンス","ko":"무용"}',
   '{"zh":"舞蹈艺术与表演","en":"Dance art and performance","ja":"ダンス芸術とパフォーマンス","ko":"무용 예술과 공연"}'),
  
  ('建筑', '建筑设计与工程', '🏗️',
   '{"zh":"建筑","en":"Architecture","ja":"建築","ko":"건축"}',
   '{"zh":"建筑设计与工程","en":"Architectural design and engineering","ja":"建築設計と工学","ko":"건축 설계 및 공학"}'),
  
  ('手工艺', '手工艺品制作', '🧵',
   '{"zh":"手工艺","en":"Crafts","ja":"手工芸","ko":"공예"}',
   '{"zh":"手工艺品制作","en":"Handcraft and crafts production","ja":"手工芸品製作","ko":"수공예품 제작"}'),
  
  ('美食', '传统美食与烹饪', '🍜',
   '{"zh":"美食","en":"Cuisine","ja":"食べ物","ko":"음식"}',
   '{"zh":"传统美食与烹饪","en":"Traditional cuisine and cooking","ja":"伝統料理と調理","ko":"전통 음식 및 요리"}'),
  
  ('服饰', '传统服装与时尚', '👘',
   '{"zh":"服饰","en":"Fashion","ja":"服装","ko":"의상"}',
   '{"zh":"传统服装与时尚","en":"Traditional clothing and fashion","ja":"伝統衣装とファッション","ko":"전통 의상 및 패션"}'),
  
  ('节庆', '传统节日与庆典', '🎉',
   '{"zh":"节庆","en":"Festivals","ja":"フェスティバル","ko":"축제"}',
   '{"zh":"传统节日与庆典","en":"Traditional festivals and celebrations","ja":"伝統的な祭りと祝い","ko":"전통 축제 및 행사"}'),
  
  ('语言文学', '语言学习与文学作品', '📚',
   '{"zh":"语言文学","en":"Language & Literature","ja":"言語と文学","ko":"언어 및 문학"}',
   '{"zh":"语言学习与文学作品","en":"Language learning and literary works","ja":"言語学習と文学作品","ko":"언어 학습 및 문학 작품"}'),
  
  ('哲学思想', '传统哲学与思想', '🧘',
   '{"zh":"哲学思想","en":"Philosophy","ja":"哲学","ko":"철학"}',
   '{"zh":"传统哲学与思想","en":"Traditional philosophy and thoughts","ja":"伝統哲学と思想","ko":"전통 철학 및 사상"}'),
  
  ('科技创新', '科技与创新', '🚀',
   '{"zh":"科技创新","en":"Technology & Innovation","ja":"技術とイノベーション","ko":"기술 및 혁신"}',
   '{"zh":"科技与创新","en":"Technology and innovation","ja":"技術とイノベーション","ko":"기술 및 혁신"}')
ON CONFLICT (name) DO NOTHING;

