package com.knowledge.base.foundation.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.knowledge.base.foundation.entity.ModelItem;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 模型条目 Mapper（第8阶段模型库）
 *
 * @author 苏三
 * @since 1.1.0
 */
@Mapper
public interface ModelItemMapper extends BaseMapper<ModelItem> {

    /**
     * 查询某类型启用中的模型（含提供方信息），按默认优先排序。
     */
    @Select("""
            SELECT m.* FROM kb_model m
            INNER JOIN kb_model_provider p ON p.id = m.provider_id AND p.status = 1 AND p.deleted = 0
            WHERE m.model_type = #{modelType} AND m.status = 1
            ORDER BY m.is_default DESC, m.id
            """)
    List<ModelItem> selectEnabledByType(@Param("modelType") String modelType);

    /**
     * 查询某类型启用中的默认模型。
     */
    @Select("""
            SELECT m.* FROM kb_model m
            INNER JOIN kb_model_provider p ON p.id = m.provider_id AND p.status = 1 AND p.deleted = 0
            WHERE m.model_type = #{modelType} AND m.status = 1 AND m.is_default = 1
            ORDER BY m.id LIMIT 1
            """)
    ModelItem selectDefaultByType(@Param("modelType") String modelType);
}
