/**
 * 论坛 - 文化分享 API 实现
 * 文件: server/src/routes/modules/forum.js
 */

const express = require('express');
const { 
  queryAll, 
  queryOne, 
  execute 
} = require('../../db/connection');

// ==================== 标签管理 API ====================

/**
 * GET /api/forum/tags
 * 获取所有标签，并实时计算其使用次数
 */
async function getTags(req, res) {
  try {
    const tags = await queryAll(`
      SELECT 
        ct.id, 
        ct.name, 
        ct.description, 
        ct.icon, 
        ct.created_at,
        ct.name_i18n, 
        ct.description_i18n,
        (SELECT COUNT(*) FROM share_tags st WHERE st.tag_id = ct.id) as usage_count
      FROM culture_tags ct
      GROUP BY ct.id
      HAVING usage_count > 0
      ORDER BY usage_count DESC, ct.created_at DESC
    `);
    
    res.json({
      success: true,
      data: tags
    });
  } catch (error) {
    console.error('[Forum] Error fetching tags:', error);
    res.status(500).json({
      success: false,
      message: '获取标签失败'
    });
  }
}

/**
 * POST /api/forum/tags
 * 创建新标签
 * 请求体: { name, description?, icon? }
 */
async function createTag(req, res) {
  try {
    const { name, description, icon } = req.body;
    const user_id = req.user?.id || null;
    
    // 验证
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '标签名称不能为空'
      });
    }
    
    if (name.length > 50) {
      return res.status(400).json({
        success: false,
        message: '标签名称不能超过50个字符'
      });
    }
    
    // 检查是否已存在
    const existing = await queryOne(
      'SELECT id FROM culture_tags WHERE name = ?',
      [name]
    );
    
    if (existing) {
      return res.json({
        success: true,
        message: '标签已存在',
        data: existing
      });
    }
    
    // 创建标签
    const result = await execute(`
      INSERT INTO culture_tags (name, description, icon, created_by)
      VALUES (?, ?, ?, ?)
    `, [name, description || null, icon || null, user_id]);
    
    const newTag = await queryOne(
      'SELECT id, name, description, icon, usage_count, created_at FROM culture_tags WHERE id = ?',
      [result.lastID]
    );
    
    res.json({
      success: true,
      message: '标签创建成功',
      data: newTag
    });
  } catch (error) {
    console.error('[Forum] Error creating tag:', error);
    res.status(500).json({
      success: false,
      message: '创建标签失败'
    });
  }
}

/**
 * DELETE /api/forum/tags/:tagId
 * 删除标签（仅限管理员或创建者）
 */
async function deleteTag(req, res) {
  try {
    const { tagId } = req.params;
    const user_id = req.user?.id;
    
    // 检查权限
    const tag = await queryOne(
      'SELECT created_by FROM culture_tags WHERE id = ?',
      [tagId]
    );
    
    if (!tag) {
      return res.status(404).json({
        success: false,
        message: '标签不存在'
      });
    }
    
    // 仅允许创建者或管理员删除
    if (tag.created_by !== user_id && !req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: '没有权限删除此标签'
      });
    }
    
    // 删除标签
    await execute('DELETE FROM culture_tags WHERE id = ?', [tagId]);
    
    res.json({
      success: true,
      message: '标签已删除'
    });
  } catch (error) {
    console.error('[Forum] Error deleting tag:', error);
    res.status(500).json({
      success: false,
      message: '删除标签失败'
    });
  }
}

// ==================== 分享管理 API ====================

/**
 * GET /api/forum/shares
 * 获取分享列表（支持筛选）
 * 查询参数: tag_ids, sort, page, limit, search
 */
async function getShares(req, res) {
  try {
    const {
      tag_ids,
      sort = '-created_at',
      page = 1,
      limit = 20,
      search
    } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit) || 20, 100);
    const offset = (pageNum - 1) * limitNum;
    
    let baseQuery = 'SELECT id, title, title_i18n, description, description_i18n, content, content_i18n, user_id, author_name, cover_image, icon, file_list, view_count, download_count, like_count, status, is_featured, created_at, updated_at FROM culture_shares WHERE status = ?';
    let params = ['published'];
    
    // 搜索条件
    if (search) {
      baseQuery += ' AND (title LIKE ? OR description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }
    
    // 标签过滤（单标签，用OR逻辑）
    let query = baseQuery;
    let useSubquery = false;
    if (tag_ids) {
      const tagArray = tag_ids.split(',').map(Number).filter(id => !isNaN(id));
      if (tagArray.length > 0) {
        // 使用子查询：分享包含任意一个指定标签即可（OR逻辑）
        query = `
          SELECT DISTINCT cs.id, cs.title, cs.title_i18n, cs.description, cs.description_i18n, 
                 cs.content, cs.content_i18n, cs.user_id, cs.author_name, cs.cover_image, cs.icon,
                 cs.file_list, cs.view_count, cs.download_count, cs.like_count, cs.status, 
                 cs.is_featured, cs.created_at, cs.updated_at
          FROM (${baseQuery}) cs
          INNER JOIN share_tags st ON cs.id = st.share_id
          WHERE st.tag_id IN (${tagArray.map(() => '?').join(',')})
        `;
        params.push(...tagArray);
        useSubquery = true;
      }
    }
    
    // 排序
    if (sort === '-created_at') {
      query += ` ORDER BY ${useSubquery ? 'cs.' : ''}created_at DESC`;
    } else if (sort === 'created_at') {
      query += ` ORDER BY ${useSubquery ? 'cs.' : ''}created_at ASC`;
    } else if (sort === '-view_count') {
      query += ` ORDER BY ${useSubquery ? 'cs.' : ''}view_count DESC`;
    } else if (sort === '-like_count') {
      query += ` ORDER BY ${useSubquery ? 'cs.' : ''}like_count DESC`;
    }
    
    // 分页
    query += ' LIMIT ? OFFSET ?';
    params.push(limitNum, offset);
    
    // 获取总数
    let countQuery;
    let countParams;
    
    if (tag_ids) {
      const tagArray = tag_ids.split(',').map(Number).filter(id => !isNaN(id));
      if (tagArray.length > 0) {
        countQuery = `
          SELECT COUNT(DISTINCT cs.id) as total
          FROM culture_shares cs
          INNER JOIN share_tags st ON cs.id = st.share_id
          WHERE cs.status = ? AND st.tag_id IN (${tagArray.map(() => '?').join(',')})
        `;
        countParams = ['published', ...tagArray];
      } else {
        countQuery = 'SELECT COUNT(*) as total FROM culture_shares WHERE status = ?';
        countParams = ['published'];
      }
    } else {
      countQuery = 'SELECT COUNT(*) as total FROM culture_shares WHERE status = ?';
      countParams = ['published'];
    }
    
    if (search) {
      countQuery = countQuery.replace('WHERE cs.status = ?', 'WHERE cs.status = ? AND (cs.title LIKE ? OR cs.description LIKE ?)');
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm);
    }
    
    const shares = await queryAll(query, params);
    const countResult = await queryOne(countQuery, countParams);
    const total = countResult?.total || 0;
    
    // 为每个分享加载标签
    for (let share of shares) {
      const tags = await queryAll(`
        SELECT ct.id, ct.name, ct.icon, ct.name_i18n
        FROM culture_tags ct
        INNER JOIN share_tags st ON ct.id = st.tag_id
        WHERE st.share_id = ?
      `, [share.id]);
      share.tags = tags;
      
      // 解析file_list JSON
      try {
        share.files = share.file_list ? JSON.parse(share.file_list) : [];
      } catch (e) {
        share.files = [];
      }
    }
    
    res.json({
      success: true,
      data: shares,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('[Forum] Error fetching shares:', error);
    res.status(500).json({
      success: false,
      message: '获取分享列表失败'
    });
  }
}

/**
 * GET /api/forum/shares/:shareId
 * 获取分享详情
 */
async function getShareDetail(req, res) {
  try {
    const { shareId } = req.params;
    const user_id = req.user?.id;
    
    let share = await queryOne(
      'SELECT * FROM culture_shares WHERE id = ?',
      [shareId]
    );
    
    if (!share) {
      return res.status(404).json({
        success: false,
        message: '分享不存在'
      });
    }
    
    // 增加浏览次数
    await execute(
      'UPDATE culture_shares SET view_count = view_count + 1 WHERE id = ?',
      [shareId]
    );
    
    // 加载标签
    const tags = await queryAll(`
      SELECT ct.id, ct.name, ct.icon, ct.name_i18n
      FROM culture_tags ct
      INNER JOIN share_tags st ON ct.id = st.tag_id
      WHERE st.share_id = ?
    `, [shareId]);
    share.tags = tags;
    
    // 解析files
    try {
      share.files = share.file_list ? JSON.parse(share.file_list) : [];
    } catch (e) {
      share.files = [];
    }
    
    // 检查当前用户是否已点赞
    if (user_id) {
      const liked = await queryOne(
        'SELECT id FROM user_share_interactions WHERE user_id = ? AND share_id = ? AND interaction_type = ?',
        [user_id, shareId, 'like']
      );
      share.is_liked = !!liked;
    } else {
      share.is_liked = false;
    }
    
    // 检查权限
    share.can_edit = share.user_id === user_id;
    share.can_delete = share.user_id === user_id || req.user?.isAdmin;
    
    res.json({
      success: true,
      data: share
    });
  } catch (error) {
    console.error('[Forum] Error fetching share detail:', error);
    res.status(500).json({
      success: false,
      message: '获取分享详情失败'
    });
  }
}

/**
 * POST /api/forum/shares
 * 创建新分享
 * 请求体 (multipart/form-data):
 *   - title: 标题
 *   - description: 描述
 *   - content: 正文内容
 *   - tag_ids: 标签IDs (JSON数组)
 *   - files: 上传的文件
 */
async function createShare(req, res) {
  try {
    const { title, description, content, tag_ids } = req.body;
    const user_id = req.user?.id;
    const author_name = req.user?.username || 'Anonymous';
    
    // 验证
    if (!user_id) {
      return res.status(401).json({
        success: false,
        message: '需要登录'
      });
    }
    
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: '标题和描述不能为空'
      });
    }
    
    // 解析标签IDs
    let tagIds = [];
    try {
      tagIds = JSON.parse(tag_ids || '[]');
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: '标签格式无效'
      });
    }
    
    if (tagIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '至少需要一个标签'
      });
    }
    
    // 创建分享
    const result = await execute(`
      INSERT INTO culture_shares (
        title, description, content, user_id, author_name, file_list
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      title,
      description,
      content || '',
      user_id,
      author_name,
      JSON.stringify(req.files || [])
    ]);
    
    const shareId = result.lastID;
    
    // 添加标签关联
    for (let tagId of tagIds) {
      await execute(
        'INSERT INTO share_tags (share_id, tag_id) VALUES (?, ?)',
        [shareId, tagId]
      );
    }
    
    // 返回创建的分享
    const share = await queryOne(
      'SELECT * FROM culture_shares WHERE id = ?',
      [shareId]
    );
    
    const tags = await queryAll(`
      SELECT ct.id, ct.name, ct.icon
      FROM culture_tags ct
      INNER JOIN share_tags st ON ct.id = st.tag_id
      WHERE st.share_id = ?
    `, [shareId]);
    
    share.tags = tags;
    share.files = req.files || [];
    
    res.json({
      success: true,
      message: '分享发表成功',
      data: share
    });
  } catch (error) {
    console.error('[Forum] Error creating share:', error);
    res.status(500).json({
      success: false,
      message: '创建分享失败'
    });
  }
}

/**
 * PUT /api/forum/shares/:shareId
 * 编辑分享
 */
async function updateShare(req, res) {
  try {
    const { shareId } = req.params;
    const { title, description, content, tag_ids } = req.body;
    const user_id = req.user?.id;
    
    // 检查权限
    const share = await queryOne(
      'SELECT user_id FROM culture_shares WHERE id = ?',
      [shareId]
    );
    
    if (!share) {
      return res.status(404).json({
        success: false,
        message: '分享不存在'
      });
    }
    
    if (share.user_id !== user_id && !req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: '没有权限编辑此分享'
      });
    }
    
    // 更新分享
    await execute(`
      UPDATE culture_shares
      SET title = ?, description = ?, content = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [title, description, content || '', shareId]);
    
    // 如果更新了标签
    if (tag_ids) {
      let newTagIds = [];
      try {
        newTagIds = JSON.parse(tag_ids);
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: '标签格式无效'
        });
      }
      
      // 获取旧标签
      const oldTags = await queryAll(
        'SELECT tag_id FROM share_tags WHERE share_id = ?',
        [shareId]
      );
      const oldTagIds = oldTags.map(t => t.tag_id);
      
      // 删除不在新标签中的旧标签
      const tagsToDecrement = oldTagIds.filter(id => !newTagIds.includes(id));
      for (let oldId of tagsToDecrement) {
        await execute(
          'DELETE FROM share_tags WHERE share_id = ? AND tag_id = ?',
          [shareId, oldId]
        );
      }
      
      // 添加新标签
      const tagsToIncrement = newTagIds.filter(id => !oldTagIds.includes(id));
      for (let newId of tagsToIncrement) {
        await execute(
          'INSERT OR IGNORE INTO share_tags (share_id, tag_id) VALUES (?, ?)',
          [shareId, newId]
        );
      }
    }
    
    // 返回更新后的分享
    const updated = await queryOne(
      'SELECT * FROM culture_shares WHERE id = ?',
      [shareId]
    );
    
    const tags = await queryAll(`
      SELECT ct.id, ct.name, ct.icon
      FROM culture_tags ct
      INNER JOIN share_tags st ON ct.id = st.tag_id
      WHERE st.share_id = ?
    `, [shareId]);
    
    updated.tags = tags;
    
    res.json({
      success: true,
      message: '分享已更新',
      data: updated
    });
  } catch (error) {
    console.error('[Forum] Error updating share:', error);
    res.status(500).json({
      success: false,
      message: '更新分享失败'
    });
  }
}

/**
 * DELETE /api/forum/shares/:shareId
 * 删除分享
 */
async function deleteShare(req, res) {
  try {
    const { shareId } = req.params;
    const user_id = req.user?.id;
    
    // 检查权限
    const share = await queryOne(
      'SELECT user_id FROM culture_shares WHERE id = ?',
      [shareId]
    );
    
    if (!share) {
      return res.status(404).json({
        success: false,
        message: '分享不存在'
      });
    }
    
    if (share.user_id !== user_id && !req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: '没有权限删除此分享'
      });
    }
    
    // 删除关联的标签关系
    const tags = await queryAll(
      'SELECT tag_id FROM share_tags WHERE share_id = ?',
      [shareId]
    );
    const tagIds = tags.map(t => t.tag_id);
    
    // 删除标签关联
    await execute('DELETE FROM share_tags WHERE share_id = ?', [shareId]);
    
    // 删除分享
    await execute('DELETE FROM culture_shares WHERE id = ?', [shareId]);
    
    res.json({
      success: true,
      message: '分享已删除'
    });
  } catch (error) {
    console.error('[Forum] Error deleting share:', error);
    res.status(500).json({
      success: false,
      message: '删除分享失败'
    });
  }
}

// ==================== 交互 API ====================

/**
 * POST /api/forum/shares/:shareId/like
 * 点赞/取消点赞
 */
async function toggleLike(req, res) {
  try {
    const { shareId } = req.params;
    const { action } = req.body;
    const user_id = req.user?.id;
    
    if (!user_id) {
      return res.status(401).json({
        success: false,
        message: '需要登录'
      });
    }
    
    if (!['like', 'unlike'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: '无效的操作'
      });
    }
    
    // 检查分享是否存在
    const share = await queryOne(
      'SELECT id, like_count FROM culture_shares WHERE id = ?',
      [shareId]
    );
    
    if (!share) {
      return res.status(404).json({
        success: false,
        message: '分享不存在'
      });
    }
    
    if (action === 'like') {
      // 检查是否已点赞
      const existing = await queryOne(
        'SELECT id FROM user_share_interactions WHERE user_id = ? AND share_id = ? AND interaction_type = ?',
        [user_id, shareId, 'like']
      );
      
      if (!existing) {
        // 添加点赞记录
        await execute(
          'INSERT INTO user_share_interactions (user_id, share_id, interaction_type) VALUES (?, ?, ?)',
          [user_id, shareId, 'like']
        );
        
        // 更新分享的like_count
        await execute(
          'UPDATE culture_shares SET like_count = like_count + 1 WHERE id = ?',
          [shareId]
        );
      }
    } else {
      // 取消点赞
      await execute(
        'DELETE FROM user_share_interactions WHERE user_id = ? AND share_id = ? AND interaction_type = ?',
        [user_id, shareId, 'like']
      );
      
      // 更新分享的like_count
      await execute(
        'UPDATE culture_shares SET like_count = like_count - 1 WHERE id = ?',
        [shareId]
      );
    }
    
    // 返回更新后的like_count
    const updated = await queryOne(
      'SELECT like_count FROM culture_shares WHERE id = ?',
      [shareId]
    );
    
    res.json({
      success: true,
      action: action,
      like_count: updated.like_count
    });
  } catch (error) {
    console.error('[Forum] Error toggling like:', error);
    res.status(500).json({
      success: false,
      message: '操作失败'
    });
  }
}

// ==================== 导出 ====================

module.exports = {
  getTags,
  createTag,
  deleteTag,
  getShares,
  getShareDetail,
  createShare,
  updateShare,
  deleteShare,
  toggleLike
};

