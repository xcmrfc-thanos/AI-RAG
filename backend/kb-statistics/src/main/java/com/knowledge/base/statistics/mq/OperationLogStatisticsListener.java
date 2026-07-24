package com.knowledge.base.statistics.mq;

import com.knowledge.base.common.event.OperationLogEventDTO;
import com.knowledge.base.common.utils.SnowflakeIdGenerator;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * 操作日志统计投影监听器（P3-1b，与 foundation 并行消费）。
 */
@Slf4j
@Component
public class OperationLogStatisticsListener {

    @Resource
    private JdbcTemplate jdbcTemplate;

    /**
     * 写入 stat_operation_log 供活跃用户统计使用
     */
    /**
     * handleOperationLog 方法。
     */
    @RabbitListener(queues = "#{@statisticsOperationLogQueue.name}")
    public void handleOperationLog(OperationLogEventDTO event) {
        if (event == null) {
            return;
        }
        try {
            long id = SnowflakeIdGenerator.getInstance().nextId();
            jdbcTemplate.update(
                    "INSERT INTO stat_operation_log (id, user_id, username, status, created_at) VALUES (?, ?, ?, ?, NOW())",
                    id,
                    event.getUserId(),
                    event.getUsername(),
                    event.getStatus());
        } catch (Exception e) {
            log.error("操作日志统计投影失败：userId={}, error={}", event.getUserId(), e.getMessage(), e);
        }
    }
}
