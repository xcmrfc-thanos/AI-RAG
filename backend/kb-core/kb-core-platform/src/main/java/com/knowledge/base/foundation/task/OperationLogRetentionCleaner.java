package com.knowledge.base.foundation.task;

import com.knowledge.base.common.config.SystemConfigCache;
import com.knowledge.base.foundation.service.OperationLogService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * 操作日志保留期清理任务。
 *
 * <p>按系统配置 {@code audit.operation-log.retention-days}（默认 90）删除过期日志。</p>
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Slf4j
@Component
public class OperationLogRetentionCleaner {

    @Resource
    private OperationLogService operationLogService;

    @Resource
    private SystemConfigCache systemConfigCache;

    /**
     * 每天凌晨 4:00 清理过期操作日志。
     */
    @Scheduled(cron = "0 0 4 * * ?")
    public void cleanupExpired() {
        int days = resolveRetentionDays();
        LocalDateTime before = LocalDateTime.now().minusDays(days);
        Integer deleted = operationLogService.deleteLogsBeforeDate(before);
        log.info("operation_log_retention_cleanup retentionDays={} deleted={}", days, deleted);
    }

    /**
     * 解析操作日志保留天数（至少 7 天，防止误配清库）。
     *
     * @return 保留天数
     */
    private int resolveRetentionDays() {
        try {
            String raw = systemConfigCache.getConfig("audit.operation-log.retention-days", "90");
            int days = Integer.parseInt(raw.trim());
            return Math.max(7, days);
        } catch (Exception e) {
            log.warn("解析操作日志保留天数失败，使用默认 90：{}", e.getMessage());
            return 90;
        }
    }
}
