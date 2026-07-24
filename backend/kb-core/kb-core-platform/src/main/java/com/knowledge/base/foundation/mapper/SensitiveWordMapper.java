package com.knowledge.base.foundation.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.knowledge.base.foundation.entity.SensitiveWord;
import org.apache.ibatis.annotations.Mapper;

/**
 * 敏感词词库 Mapper（表 kb_sensitive_word）。
 */
@Mapper
public interface SensitiveWordMapper extends BaseMapper<SensitiveWord> {
}
