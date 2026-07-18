package com.knowledge.base.statistics.mapper;

import com.knowledge.base.statistics.model.DailyCount;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 文档统计预聚合表 Mapper
 *
 * <p>查询 kb_document_statistics 预聚合表，用于趋势/排行等需要聚合计算的场景</p>
 *
 * @author 苏三
 * @since 1.0.0
 */
@Mapper
public interface DocumentStatisticsAggMapper {

    /**
     * 按日期汇总文档浏览量
     *
     * @param startDate 开始日期
     * @param endDate   结束日期
     * @return [{"date": "2024-01-01", "count": 120}, ...]
     */
    List<DailyCount> countDailyViews(@Param("startDate") LocalDate startDate,
                                     @Param("endDate") LocalDate endDate);

    /**
     * 按日期范围汇总浏览量（kb_document_statistics 预聚合表）
     *
     * @param startDate 开始日期（含）
     * @param endDate   结束日期（含）
     * @return 浏览量合计
     */
    Long sumViewCountByDateRange(@Param("startDate") LocalDate startDate,
                                 @Param("endDate") LocalDate endDate);

    /**
     * 查询指定时间范围内浏览量最高的文档
     *
     * @param startDate 开始日期
     * @param endDate   结束日期
     * @param limit     返回数量
     * @return 文档排行列表
     */
    List<Map<String, Object>> selectTopDocumentsByViews(@Param("startDate") LocalDate startDate,
                                                         @Param("endDate") LocalDate endDate,
                                                         @Param("limit") int limit);
}
