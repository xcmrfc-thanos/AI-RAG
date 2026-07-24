package com.knowledge.base.document.feign;

import com.knowledge.base.common.result.Result;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;
import java.util.Map;

/**
 * 知识图谱 Feign 客户端（同步备份路径；主路径为 RabbitMQ 异步）。
 *
 * <p>注册名已切到 kb-intelligence（原独立服务 kb-graph 已归档）。</p>
 */
@FeignClient(
        name = "kb-intelligence",
        path = "/graph",
        contextId = "graphFeignClient"
)
public interface GraphFeignClient {

    /**
     * 删除指定文档的知识图谱数据
     *
     * @param docId 文档ID
     * @return 操作结果
     */
    @DeleteMapping("/document/{docId}")
    Result<String> deleteDocumentGraph(@PathVariable("docId") Long docId);

    /**
     * 清理脏图谱节点（docId 不在白名单中的节点将被删除）
     *
     * @param body 包含 validDocIds 列表的请求体
     * @return 操作结果
     */
    @PostMapping("/document/cleanup")
    Result<String> cleanupDocumentGraph(@RequestBody Map<String, List<Long>> body);
}
