package com.knowledge.base.document.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import cn.hutool.core.util.StrUtil;
import com.knowledge.base.common.enums.DocumentStatus;
import com.knowledge.base.common.event.CoreStatisticsProjectionPublisher;
import com.knowledge.base.common.event.ReviewEventDTO;
import com.knowledge.base.common.exception.BusinessException;
import com.knowledge.base.common.result.PageResult;
import com.knowledge.base.common.utils.SnowflakeIdGenerator;
import com.knowledge.base.document.dto.DocumentReviewDTO;
import com.knowledge.base.document.dto.ReviewQueryDTO;
import com.knowledge.base.document.entity.Document;
import com.knowledge.base.document.entity.DocumentReview;
import com.knowledge.base.document.entity.mongodb.DocumentContent;
import com.knowledge.base.document.mapper.DocumentMapper;
import com.knowledge.base.document.mapper.DocumentReviewMapper;
import com.knowledge.base.document.service.DocumentContentService;
import com.knowledge.base.document.service.DocumentIndexingTriggerService;
import com.knowledge.base.document.service.DocumentReviewService;
import com.knowledge.base.common.sensitive.SensitiveTextGuard;
import com.knowledge.base.document.utils.UserContext;
import com.knowledge.base.document.vo.DocumentReviewVO;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import com.knowledge.base.common.config.SqlDialectHelper;
import com.knowledge.base.common.config.SystemConfigCache;
import com.knowledge.base.common.config.InstanceIdentifier;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

/**
 * 文档审核Service实现类
 *
 * <p>按照阿里巴巴Java开发规范设计，实现文档审核相关业务逻辑</p>
 *
 * @author 苏三
 * @since 1.0.0
 */
@Slf4j
@Service
@Transactional(transactionManager = "documentTransactionManager")
public class DocumentReviewServiceImpl extends ServiceImpl<DocumentReviewMapper, DocumentReview> implements DocumentReviewService {

    @Resource
    private DocumentReviewMapper documentReviewMapper;

    @Resource
    private DocumentMapper documentMapper;

    @Resource
    @Qualifier("documentJdbcTemplate")
    private JdbcTemplate jdbcTemplate;

    @Resource
    private SystemConfigCache systemConfigCache;

    @Resource
    private DocumentIndexingTriggerService documentIndexingTriggerService;

    @Resource
    private RabbitTemplate rabbitTemplate;

    @Resource
    private ThreadPoolTaskExecutor asyncTaskExecutor;

    @Resource
    private InstanceIdentifier instanceIdentifier;

    @Resource
    private CoreStatisticsProjectionPublisher coreStatisticsProjectionPublisher;

    @Resource
    private SensitiveTextGuard sensitiveTextGuard;

    @Resource
    private DocumentContentService documentContentService;

    @Resource
    private SqlDialectHelper sqlDialectHelper;

    private static final String REVIEW_EXCHANGE = "kb.notification.exchange";

    /** 构建实例隔离的审核通知路由键 */
    private String reviewRoutingKey(String eventType) {
        return "notification.review." + instanceIdentifier.getId() + "." + eventType;
    }

    /**
     * 提交ForReview。
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public Boolean submitForReview(Long documentId) {
        log.info("提交文档审核：documentId={}", documentId);

        if (documentId == null) {
            throw new BusinessException("文档ID不能为空");
        }

        // 检查文档是否存在
        Document document = documentMapper.selectById(documentId);
        if (document == null) {
            throw new BusinessException("文档不存在");
        }

        assertDocumentContentAllowed(document);

        // 检查系统配置：如果关闭了文档审核，直接发布文档
        if (!checkRequireApproval()) {
            log.info("系统配置关闭了文档审核，直接发布文档：documentId={}", documentId);
            return directPublishDocument(document);
        }

        // 检查文档状态：草稿或已发布状态的文档可以提交审核（已发布的文档编辑后需要重新审核）
        if (!document.getStatus().equals(DocumentStatus.DRAFT.getCode())
                && !document.getStatus().equals(DocumentStatus.PUBLISHED.getCode())) {
            throw new BusinessException("只有草稿或已发布状态的文档才能提交审核");
        }

        // 获取当前轮次
        Integer currentRound = jdbcTemplate.queryForObject(
                "SELECT COALESCE(MAX(review_round), 0) FROM tb_document_review WHERE document_id = ?",
                Integer.class,
                documentId
        );

        // 创建审核记录，审核人尚未分配，reviewer_id 为空
        DocumentReview review = new DocumentReview();
        review.setId(SnowflakeIdGenerator.getInstance().nextId());
        review.setDocumentId(documentId);
        review.setReviewerId(null);
        review.setReviewerName(null);
        review.setReviewResult(null);
        review.setReviewComment(null);
        review.setBeforeStatus(document.getStatus());
        review.setReviewedAt(null);
        review.setReviewRound((currentRound != null ? currentRound : 0) + 1);
        review.setReviewLevel(1);
        review.setCreatedAt(LocalDateTime.now());

        int count = documentReviewMapper.insert(review);
        if (count <= 0) {
            throw new BusinessException("提交审核失败");
        }

        // 更新文档状态为待审核
        document.setStatus(DocumentStatus.PENDING_REVIEW.getCode());
        documentMapper.updateById(document);
        syncDocumentProjection(documentMapper.selectById(documentId));

        // 发布审核提交事件 → RabbitMQ，通知审核员
        try {
            ReviewEventDTO event = ReviewEventDTO.builder()
                    .eventType("SUBMITTED")
                    .documentId(documentId)
                    .documentTitle(document.getTitle())
                    .authorId(document.getAuthorId())
                    .authorName(document.getAuthorName())
                    .reviewRound(review.getReviewRound())
                    .reviewLevel(review.getReviewLevel())
                    .timestamp(LocalDateTime.now())
                    .build();
            String rk = reviewRoutingKey("submitted");
            CorrelationData correlationData = new CorrelationData(
                    "review-SUBMITTED-" + documentId + "-" + UUID.randomUUID().toString().substring(0, 8));
            rabbitTemplate.convertAndSend(REVIEW_EXCHANGE, rk, event, correlationData);
            log.info("已发布审核提交事件：documentId={}, title={}, authorId={}, exchange={}, routingKey={}",
                    documentId, document.getTitle(), document.getAuthorId(), REVIEW_EXCHANGE, rk);
        } catch (Exception e) {
            log.warn("发布审核提交事件失败（不影响审核流程）：documentId={}, error={}",
                    documentId, e.getMessage());
        }

        return true;
    }

    /**
     * 通过审核Review。
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public Boolean approveReview(DocumentReviewDTO dto) {
        log.info("审核通过：reviewId={}", dto.getReviewId());

        if (dto.getReviewId() == null) {
            throw new BusinessException("审核记录ID不能为空");
        }

        // 检查审核记录是否存在
        DocumentReview review = documentReviewMapper.selectById(dto.getReviewId());
        if (review == null) {
            throw new BusinessException("审核记录不存在");
        }

        if (review.getReviewResult() != null) {
            throw new BusinessException("该记录已审核");
        }

        // 从上下文获取当前审核人信息
        Long reviewerId;
        String reviewerName;
        try {
            reviewerId = UserContext.getCurrentUserId();
            reviewerName = UserContext.getCurrentUserName();
        } catch (Exception e) {
            reviewerId = null;
            reviewerName = "审核员";
        }

        // 更新审核记录
        review.setReviewerId(reviewerId);
        review.setReviewerName(reviewerName);
        review.setReviewResult(1); // 1-通过
        review.setReviewComment(dto.getReviewComment());
        review.setReviewedAt(LocalDateTime.now());
        documentReviewMapper.updateById(review);

        // 更新文档状态为已发布，并设置发布时间
        Document document = documentMapper.selectById(review.getDocumentId());
        if (document != null) {
            document.setStatus(DocumentStatus.PUBLISHED.getCode());
            document.setPublishTime(LocalDateTime.now());
            documentMapper.updateById(document);

            syncDocumentProjection(document);

            // 触发RAG/KAG/ES索引（审核通过后才建索引）
            documentIndexingTriggerService.onPublished(document, null);

            // 发布审核通过事件 → RabbitMQ，通知文档作者
            try {
                ReviewEventDTO event = ReviewEventDTO.builder()
                        .eventType("APPROVED")
                        .documentId(document.getId())
                        .documentTitle(document.getTitle())
                        .authorId(document.getAuthorId())
                        .authorName(document.getAuthorName())
                        .reviewerId(reviewerId)
                        .reviewerName(reviewerName)
                        .reviewRound(review.getReviewRound())
                        .reviewLevel(review.getReviewLevel() != null ? review.getReviewLevel() : 1)
                        .timestamp(LocalDateTime.now())
                        .build();
                CorrelationData correlationData = new CorrelationData(
                        "review-APPROVED-" + document.getId() + "-" + UUID.randomUUID().toString().substring(0, 8));
                rabbitTemplate.convertAndSend(REVIEW_EXCHANGE, reviewRoutingKey("approved"), event, correlationData);
                log.info("已发布审核通过事件：documentId={}, eventType=APPROVED", document.getId());
            } catch (Exception e) {
                log.warn("发布审核通过事件失败（不影响审核流程）：documentId={}, error={}",
                        document.getId(), e.getMessage());
            }
        }

        return true;
    }

    /**
     * 驳回审核Review。
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public Boolean rejectReview(DocumentReviewDTO dto) {
        log.info("审核驳回：reviewId={}", dto.getReviewId());

        if (dto.getReviewId() == null) {
            throw new BusinessException("审核记录ID不能为空");
        }

        if (!StringUtils.hasText(dto.getReviewComment())) {
            throw new BusinessException("驳回意见不能为空");
        }

        // 检查审核记录是否存在
        DocumentReview review = documentReviewMapper.selectById(dto.getReviewId());
        if (review == null) {
            throw new BusinessException("审核记录不存在");
        }

        if (review.getReviewResult() != null) {
            throw new BusinessException("该记录已审核");
        }

        // 从上下文获取当前审核人信息
        Long reviewerId;
        String reviewerName;
        try {
            reviewerId = UserContext.getCurrentUserId();
            reviewerName = UserContext.getCurrentUserName();
        } catch (Exception e) {
            reviewerId = null;
            reviewerName = "审核员";
        }

        // 更新审核记录
        review.setReviewerId(reviewerId);
        review.setReviewerName(reviewerName);
        review.setReviewResult(2); // 2-驳回
        review.setReviewComment(dto.getReviewComment());
        review.setReviewedAt(LocalDateTime.now());
        documentReviewMapper.updateById(review);

        // 驳回后文档状态退回草稿
        Document document = documentMapper.selectById(review.getDocumentId());
        if (document != null) {
            document.setStatus(DocumentStatus.DRAFT.getCode());
            documentMapper.updateById(document);
            syncDocumentProjection(documentMapper.selectById(document.getId()));

            // 发布审核驳回事件 → RabbitMQ，通知文档作者
            try {
                ReviewEventDTO event = ReviewEventDTO.builder()
                        .eventType("REJECTED")
                        .documentId(document.getId())
                        .documentTitle(document.getTitle())
                        .authorId(document.getAuthorId())
                        .authorName(document.getAuthorName())
                        .reviewerId(reviewerId)
                        .reviewerName(reviewerName)
                        .reviewRound(review.getReviewRound())
                        .reviewLevel(review.getReviewLevel() != null ? review.getReviewLevel() : 1)
                        .reviewComment(dto.getReviewComment())
                        .timestamp(LocalDateTime.now())
                        .build();
                CorrelationData correlationData = new CorrelationData(
                        "review-REJECTED-" + document.getId() + "-" + UUID.randomUUID().toString().substring(0, 8));
                rabbitTemplate.convertAndSend(REVIEW_EXCHANGE, reviewRoutingKey("rejected"), event, correlationData);
                log.info("已发布审核驳回事件：documentId={}, eventType=REJECTED", document.getId());
            } catch (Exception e) {
                log.warn("发布审核驳回事件失败（不影响审核流程）：documentId={}, error={}",
                        document.getId(), e.getMessage());
            }
        }

        return true;
    }

    /**
     * 自动修复：为状态是 PENDING_REVIEW 但缺少待审核记录的文档补建审核记录
     * <p>这种情况可能发生在直接操作数据库、数据迁移等场景</p>
     */
    private void syncOrphanedPendingDocuments() {
        try {
            List<Long> orphanedIds = jdbcTemplate.queryForList(
                    "SELECT d.id FROM kb_document d " +
                    "WHERE d.status = ? AND d.deleted = 0 " +
                    "AND NOT EXISTS (SELECT 1 FROM tb_document_review r WHERE r.document_id = d.id AND r.review_result IS NULL)",
                    Long.class,
                    DocumentStatus.PENDING_REVIEW.getCode()
            );

            if (!orphanedIds.isEmpty()) {
                log.info("发现 {} 个孤儿待审核文档，正在自动补建审核记录...", orphanedIds.size());
                for (Long docId : orphanedIds) {
                    try {
                        Document document = documentMapper.selectById(docId);
                        if (document == null) continue;

                        Integer currentRound = jdbcTemplate.queryForObject(
                                "SELECT COALESCE(MAX(review_round), 0) FROM tb_document_review WHERE document_id = ?",
                                Integer.class, docId
                        );

                        DocumentReview review = new DocumentReview();
                        review.setId(SnowflakeIdGenerator.getInstance().nextId());
                        review.setDocumentId(docId);
                        review.setReviewerId(null);
                        review.setReviewerName(null);
                        review.setReviewResult(null);
                        review.setReviewComment(null);
                        review.setBeforeStatus(document.getStatus());
                        review.setReviewedAt(null);
                        review.setReviewRound((currentRound != null ? currentRound : 0) + 1);
                        review.setReviewLevel(1);
                        review.setCreatedAt(LocalDateTime.now());
                        documentReviewMapper.insert(review);
                    } catch (Exception e) {
                        log.warn("补建审核记录失败：documentId={}, error={}", docId, e.getMessage());
                    }
                }
                log.info("孤儿待审核文档补建完成，共处理 {} 条", orphanedIds.size());
            }
        } catch (Exception e) {
            log.warn("检查孤儿待审核文档失败（不影响查询流程）：{}", e.getMessage());
        }
    }

    /**
     * 获取PendingReviews。
     */
    @Override
    public PageResult<DocumentReviewVO> getPendingReviews(ReviewQueryDTO dto) {
        // 自动修复：为状态是 PENDING_REVIEW 但缺少待审核记录的文档补建审核记录
        syncOrphanedPendingDocuments();

        // 构建查询条件
        LambdaQueryWrapper<DocumentReview> wrapper = new LambdaQueryWrapper<>();

        // 状态筛选：0=待审核(null)，1=已通过，2=已驳回，null=全部
        if (dto.getStatus() == null) {
            // 不筛选
        } else if (dto.getStatus() == 0) {
            wrapper.isNull(DocumentReview::getReviewResult);
        } else {
            wrapper.eq(DocumentReview::getReviewResult, dto.getStatus());
        }

        if (dto.getReviewerId() != null) {
            wrapper.eq(DocumentReview::getReviewerId, dto.getReviewerId());
        }

        if (dto.getAuthorId() != null) {
            wrapper.exists(
                    "SELECT 1 FROM kb_document d WHERE d.id = tb_document_review.document_id AND d.author_id = {0}",
                    dto.getAuthorId()
            );
        }

        // 关键词搜索（Oracle CONCAT 仅两参数，走方言助手）
        if (StringUtils.hasText(dto.getKeyword())) {
            String titleLike = sqlDialectHelper.likeContains("d.title", "{0}");
            wrapper.exists(
                    "SELECT 1 FROM kb_document d WHERE d.id = tb_document_review.document_id AND " + titleLike,
                    dto.getKeyword()
            );
        }

        // 排序
        wrapper.orderByDesc(DocumentReview::getCreatedAt);

        // 分页查询
        Page<DocumentReview> page = new Page<>(dto.getCurrent(), dto.getSize());
        IPage<DocumentReview> reviewPage = documentReviewMapper.selectPage(page, wrapper);

        // 转换为VO
        IPage<DocumentReviewVO> voPage = reviewPage.convert(review -> {
            return buildReviewVO(review);
        });

        return PageResult.<DocumentReviewVO>builder()
                .records(voPage.getRecords())
                .total(voPage.getTotal())
                .current(voPage.getCurrent())
                .size(voPage.getSize())
                .build();
    }

    /**
     * 获取CurrentReviewTask。
     */
    @Override
    public DocumentReviewVO getCurrentReviewTask(Long documentId) {
        if (documentId == null) {
            throw new BusinessException("文档ID不能为空");
        }

        syncOrphanedPendingDocuments();
        DocumentReview review = documentReviewMapper.selectLatestByDocumentId(documentId);
        if (review == null) {
            throw new BusinessException("未找到审核记录");
        }
        return buildReviewVO(review);
    }

    /**
     * 获取DocumentReviewHistory。
     */
    @Override
    public List<DocumentReviewVO> getDocumentReviewHistory(Long documentId) {
        if (documentId == null) {
            throw new BusinessException("文档ID不能为空");
        }

        List<DocumentReview> reviews = documentReviewMapper.selectList(
                new LambdaQueryWrapper<DocumentReview>()
                        .eq(DocumentReview::getDocumentId, documentId)
                        .orderByDesc(DocumentReview::getReviewRound)
        );

        return reviews.stream()
                .map(this::buildReviewVO)
                .collect(Collectors.toList());
    }

    /**
     * 获取PendingCount。
     */
    @Override
    public Long getPendingCount() {
        LambdaQueryWrapper<DocumentReview> wrapper = new LambdaQueryWrapper<>();
        wrapper.isNull(DocumentReview::getReviewResult);
        return documentReviewMapper.selectCount(wrapper);
    }

    @Override
    public Map<String, Long> getReviewStats() {
        Map<String, Long> stats = new LinkedHashMap<>();
        stats.put("pending", documentReviewMapper.selectCount(
                new LambdaQueryWrapper<DocumentReview>().isNull(DocumentReview::getReviewResult)));
        stats.put("approved", documentReviewMapper.selectCount(
                new LambdaQueryWrapper<DocumentReview>().eq(DocumentReview::getReviewResult, 1)));
        stats.put("rejected", documentReviewMapper.selectCount(
                new LambdaQueryWrapper<DocumentReview>().eq(DocumentReview::getReviewResult, 2)));
        return stats;
    }

    /**
     * 批量Review。
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void batchReview(List<Long> taskIds, String status, String comment) {
        if (taskIds == null || taskIds.isEmpty()) {
            throw new BusinessException("审核任务ID列表不能为空");
        }

        DocumentReviewDTO dto = new DocumentReviewDTO();
        dto.setReviewComment(comment);

        for (Long taskId : taskIds) {
            dto.setReviewId(taskId);
            if ("approved".equalsIgnoreCase(status)) {
                approveReview(dto);
            } else if ("rejected".equalsIgnoreCase(status)) {
                rejectReview(dto);
            } else {
                throw new BusinessException("无效的审核结果：" + status);
            }
        }
    }

    private DocumentReviewVO buildReviewVO(DocumentReview review) {
        Document document = documentMapper.selectById(review.getDocumentId());
        String documentTitle = document != null ? document.getTitle() : "";
        String authorName = document != null ? document.getAuthorName() : "";
        Long authorId = document != null ? document.getAuthorId() : null;

        Long categoryId = document != null ? document.getCategoryId() : null;
        String categoryName = "";
        if (categoryId != null) {
            try {
                categoryName = jdbcTemplate.queryForObject(
                        "SELECT category_name FROM kb_category WHERE id = ?",
                        String.class,
                        categoryId
                );
            } catch (Exception ignored) {
                // 分类删除或不存在时返回空字符串，不影响审核页展示
            }
        }

        return DocumentReviewVO.builder()
                .id(review.getId())
                .documentId(review.getDocumentId())
                .documentTitle(documentTitle)
                .authorId(authorId)
                .authorName(authorName)
                .reviewerId(review.getReviewerId())
                .reviewerName(review.getReviewerName())
                .reviewResult(review.getReviewResult())
                .reviewComment(review.getReviewComment())
                .beforeStatus(review.getBeforeStatus())
                .reviewedAt(review.getReviewedAt())
                .reviewRound(review.getReviewRound())
                .createdAt(review.getCreatedAt())
                .categoryId(categoryId)
                .categoryName(categoryName)
                .build();
    }

    // ==================== 直接发布方法 ====================

    /**
     * 检查系统配置：是否需要文档审核
     */
    /**
     * 送审/发布前校验标题与正文敏感词。
     *
     * @param document 文档元数据
     */
    private void assertDocumentContentAllowed(Document document) {
        StringBuilder sb = new StringBuilder();
        if (StringUtils.hasText(document.getTitle())) {
            sb.append(document.getTitle()).append('\n');
        }
        if (StringUtils.hasText(document.getSummary())) {
            sb.append(document.getSummary()).append('\n');
        }
        try {
            DocumentContent content = documentContentService.getContentByDocumentId(document.getId());
            if (content != null && StringUtils.hasText(content.getContent())) {
                sb.append(content.getContent());
            }
        } catch (Exception e) {
            log.warn("读取文档正文失败，仅校验标题摘要：documentId={}, err={}", document.getId(), e.getMessage());
        }
        sensitiveTextGuard.assertAllowed(sb.toString(), "document.publish");
    }

    private boolean checkRequireApproval() {
        String value = systemConfigCache.getConfig("system.requireApproval");
        return !"false".equals(value);
    }

    /**
     * 直接发布文档（无需审核）
     * <p>当 system.requireApproval 配置为 false 时调用此方法</p>
     */
    private Boolean directPublishDocument(Document document) {
        // 只有草稿、已发布或待审核状态的文档可以直接发布
        Integer status = document.getStatus();
        if (!status.equals(DocumentStatus.DRAFT.getCode())
                && !status.equals(DocumentStatus.PUBLISHED.getCode())
                && !status.equals(DocumentStatus.PENDING_REVIEW.getCode())) {
            throw new BusinessException("当前文档状态不允许发布");
        }

        // 直接设置为已发布
        document.setStatus(DocumentStatus.PUBLISHED.getCode());
        document.setPublishTime(LocalDateTime.now());
        documentMapper.updateById(document);

        Document published = documentMapper.selectById(document.getId());
        syncDocumentProjection(published);

        // 触发索引
        documentIndexingTriggerService.onPublished(published, null);

        log.info("文档直接发布成功：documentId={}", document.getId());
        return true;
    }

    /**
     * 同步文档快照到 statistics 本地投影表（P3-1b / 任务 34）
     */
    private void syncDocumentProjection(Document document) {
        if (document == null || document.getId() == null) {
            return;
        }
        coreStatisticsProjectionPublisher.publishDocumentUpsert(
                document.getId(),
                document.getTitle(),
                document.getAuthorId(),
                document.getCategoryId(),
                document.getStatus(),
                document.getViewCount(),
                document.getLikeCount(),
                document.getFavoriteCount(),
                document.getSummary(),
                document.getDeleted(),
                document.getIsPublic(),
                document.getTeamId());
    }
}
