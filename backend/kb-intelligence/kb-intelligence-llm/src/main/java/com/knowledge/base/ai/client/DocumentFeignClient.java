package com.knowledge.base.ai.client;

import com.knowledge.base.ai.config.InternalFeignConfig;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.Map;

/**
 * kb-core 文档 API Feign 客户端
 *
 * <p>Intelligence 模块调用 kb-core 获取文档内容与元数据，用于索引与 RAG。</p>
 *
 * @author 苏三
 * @since 1.0.0
 */
@FeignClient(name = "kb-core", url = "${kb-core.url:#{null}}",
        configuration = InternalFeignConfig.class)
public interface DocumentFeignClient {

    /**
     * 获取文档详情（含MongoDB内容）
     */
    @GetMapping("/documents/{documentId}")
    Map<String, Object> getDocument(@PathVariable("documentId") Long documentId);

    /**
     * 分页获取已发布文档列表
     */
    @GetMapping("/documents/page")
    Map<String, Object> pageDocuments(@RequestParam("current") Long current,
                                       @RequestParam("size") Long size,
                                       @RequestParam(value = "status", required = false) Integer status);
}
