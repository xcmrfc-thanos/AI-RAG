package com.knowledge.base.common.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * 文档生命周期领域事件 DTO
 *
 * <p>kb-core 发布，kb-intelligence 各模块订阅并处理索引相关副作用。</p>
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentLifecycleEventDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    /** 事件唯一 ID，用于日志追踪 */
    private String eventId;

    /** 事件类型 */
    private DocumentLifecycleEventType eventType;

    /** 文档 ID */
    private Long documentId;

    /** 文档标题（冗余，便于日志） */
    private String documentTitle;

    /**
     * ES 全文索引 payload（eventType=PUBLISHED 时携带）
     *
     * <p>结构与 kb-search {@code indexDocumentData} 入参一致。</p>
     */
    private Map<String, Object> searchIndexData;

    /** 事件发生时间 */
    private LocalDateTime timestamp;
}
