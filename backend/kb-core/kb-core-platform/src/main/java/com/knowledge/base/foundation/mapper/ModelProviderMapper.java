package com.knowledge.base.foundation.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.knowledge.base.foundation.entity.ModelProvider;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 模型提供方 Mapper（第8阶段模型库）
 *
 * @author 苏三
 * @since 1.1.0
 */
@Mapper
public interface ModelProviderMapper extends BaseMapper<ModelProvider> {

    /**
     * 按标识查询启用中的提供方（含已删除过滤由 @TableLogic 自动处理）。
     */
    @Select("SELECT * FROM kb_model_provider WHERE provider_key = #{providerKey} AND status = 1 ORDER BY id LIMIT 1")
    ModelProvider selectEnabledByKey(@Param("providerKey") String providerKey);

    /**
     * 查询启用中的提供方列表。
     */
    @Select("SELECT * FROM kb_model_provider WHERE status = 1 ORDER BY id")
    List<ModelProvider> selectEnabledList();
}
