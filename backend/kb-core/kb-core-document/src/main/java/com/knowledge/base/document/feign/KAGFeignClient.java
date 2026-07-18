package com.knowledge.base.document.feign;

import com.knowledge.base.common.result.Result;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;

/**
 * KAG图谱构建服务Feign客户端
 *
 * <p>索引编排型调用；生产终态请使用 MQ 事件。</p>
 *
 * @author 苏三
 * @since 1.0.0
 * @deprecated 仅供 legacy-feign 应急模式使用
 */
@Deprecated
@FeignClient(
        name = "kb-ai",
        path = "/kag/build",
        url = "${kb-ai.url:#{null}}",
        contextId = "kagFeignClient"
)
public interface KAGFeignClient {

    /**
     * 触发单个文档的KAG图谱构建
     *
     * @param docId 文档ID
     * @return 任务ID
     */
    @PostMapping("/{docId}")
    Result<String> buildGraph(@PathVariable("docId") Long docId);

    /**
     * 删除单个文档的知识图谱
     *
     * @param docId 文档ID
     * @return 任务ID
     */
    @DeleteMapping("/{docId}")
    Result<String> deleteGraph(@PathVariable("docId") Long docId);
}
