package com.knowledge.base.foundation.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.knowledge.base.foundation.entity.SensitiveRegex;
import org.apache.ibatis.annotations.Mapper;

/**
 * 敏感词正则 Mapper（表 kb_sensitive_regex）。
 */
@Mapper
public interface SensitiveRegexMapper extends BaseMapper<SensitiveRegex> {
}
