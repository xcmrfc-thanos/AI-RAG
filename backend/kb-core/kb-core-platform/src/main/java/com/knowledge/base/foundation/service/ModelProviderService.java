package com.knowledge.base.foundation.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.knowledge.base.foundation.dto.ModelProviderDTO;
import com.knowledge.base.foundation.dto.ModelTestDTO;
import com.knowledge.base.foundation.vo.ModelOptionVO;
import com.knowledge.base.foundation.vo.ModelProviderVO;
import com.knowledge.base.foundation.vo.ModelTypeVO;

import java.util.List;

/**
 * 模型提供方服务（第8阶段模型库）。
 *
 * <p>职责：模型库 CRUD（api_key 加密落库、列表只出掩码）、场景下拉、
 * 连通性测试、变更后刷新 Redis 模型缓存（kb:model:cache）。</p>
 *
 * @author 苏三
 * @since 1.1.0
 */
public interface ModelProviderService {

    /**
     * 模型类型枚举（chat/embedding/rerank/tts/stt/image/other + 中文名）。
     */
    List<ModelTypeVO> listTypes();

    /**
     * 场景下拉：指定类型启用模型，不含任何密钥信息。
     */
    List<ModelOptionVO> listForScene(String modelType);

    /**
     * 管理列表（含 api_key_hint，不含明文）。
     */
    IPage<ModelProviderVO> page(Long current, Long size, String keyword);

    /**
     * 新增提供方（api_key 加密后落库）。
     *
     * @return 提供方 ID
     */
    Long create(ModelProviderDTO dto);

    /**
     * 更新提供方（api_key 为空 = 不修改）。
     */
    void update(Long id, ModelProviderDTO dto);

    /**
     * 删除提供方（软删，连同其模型条目）。
     */
    void delete(Long id);

    /**
     * 连通性测试（临时解密调用 /chat/completions 或 /embeddings）。
     *
     * @return 测试结果消息（成功/失败原因）
     */
    String testConnection(ModelTestDTO dto);
}
