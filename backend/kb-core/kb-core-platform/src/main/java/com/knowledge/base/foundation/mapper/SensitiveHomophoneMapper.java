package com.knowledge.base.foundation.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.knowledge.base.foundation.entity.SensitiveHomophone;
import org.apache.ibatis.annotations.Mapper;

/**
 * 谐音映射 Mapper（表 kb_sensitive_homophone）。
 */
@Mapper
public interface SensitiveHomophoneMapper extends BaseMapper<SensitiveHomophone> {
}
