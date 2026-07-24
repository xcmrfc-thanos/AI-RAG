package com.knowledge.base.document.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.knowledge.base.common.result.Result;
import com.knowledge.base.common.security.DocumentVisibility;
import com.knowledge.base.document.client.DocumentUserClient;
import com.knowledge.base.document.entity.Document;
import com.knowledge.base.document.mapper.DocumentMapper;
import io.swagger.v3.oas.annotations.Hidden;
import jakarta.annotation.Resource;
import lombok.Data;
import org.springframework.util.CollectionUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * 内部接口：批量判定文档对指定用户是否可见
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Hidden
@RestController
@RequestMapping("/internal/documents")
public class InternalDocumentVisibilityController {

    @Resource
    private DocumentMapper documentMapper;

    @Resource
    private DocumentUserClient documentUserClient;

    /**
     * 返回对 userId 可见的文档 ID 子集
     *
     * @param request 用户与候选文档
     * @return 可见 ID 列表
     */
    /**
     * filterVisibleIds 方法。
     */
    @PostMapping("/visible-ids")
    public Result<List<Long>> filterVisibleIds(@RequestBody VisibleIdsRequest request) {
        if (request == null || CollectionUtils.isEmpty(request.getDocumentIds())) {
            return Result.success(Collections.emptyList());
        }
        List<Long> ids = request.getDocumentIds().stream()
                .filter(Objects::nonNull)
                .distinct()
                .limit(200)
                .collect(Collectors.toList());
        if (ids.isEmpty()) {
            return Result.success(Collections.emptyList());
        }
        Long userId = request.getUserId();
        List<Long> teamIds = listTeamIdsSafe(userId);
        List<Document> docs = documentMapper.selectList(new LambdaQueryWrapper<Document>()
                .in(Document::getId, ids)
                .eq(Document::getDeleted, 0));
        if (docs == null || docs.isEmpty()) {
            return Result.success(Collections.emptyList());
        }
        List<Long> visible = new ArrayList<>();
        for (Document doc : docs) {
            if (DocumentVisibility.isVisible(
                    doc.getIsPublic(),
                    doc.getAuthorId(),
                    doc.getTeamId(),
                    userId,
                    teamIds)) {
                visible.add(doc.getId());
            }
        }
        return Result.success(visible);
    }

    private List<Long> listTeamIdsSafe(Long userId) {
        if (userId == null) {
            return Collections.emptyList();
        }
        try {
            List<Long> ids = documentUserClient.listTeamIds(userId);
            return ids != null ? ids : Collections.emptyList();
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    /**
     * 批量可见性请求
     */
    @Data
    public static class VisibleIdsRequest {
        private Long userId;
        private List<Long> documentIds;
    }
}
