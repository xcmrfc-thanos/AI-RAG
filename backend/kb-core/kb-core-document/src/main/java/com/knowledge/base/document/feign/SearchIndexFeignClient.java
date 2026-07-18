package com.knowledge.base.document.feign;

import com.knowledge.base.common.result.Result;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.Map;

/**
 * 搜索索引Feign客户端
 *
 * <p>索引编排型调用；生产终态请使用 MQ 事件。</p>
 *
 * @author 苏三
 * @since 1.0.0
 * @deprecated 仅供 legacy-feign 应急模式使用
 */
@Deprecated
@FeignClient(
        name = "kb-search",
        path = "/index",
        contextId = "searchIndexFeignClient"
)
public interface SearchIndexFeignClient {

    /**
     * 索引文档
     *
     * @param docData 文档数据（id, title, summary, content, categoryId,
     *                categoryName, tags, authorId, authorName, status,
     *                isPublic, viewCount, likeCount, commentCount,
     *                publishTime, createTime, updateTime）
     * @return 是否成功
     */
    @PostMapping("/document")
    Result<Boolean> indexDocument(@RequestBody Map<String, Object> docData);

    /**
     * 删除文档索引
     *
     * @param documentId 文档ID
     * @return 是否成功
     */
    @DeleteMapping("/document/{documentId}")
    Result<Boolean> deleteDocumentIndex(@PathVariable("documentId") Long documentId);
}
