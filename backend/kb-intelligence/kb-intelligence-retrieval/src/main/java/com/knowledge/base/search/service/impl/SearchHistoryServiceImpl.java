package com.knowledge.base.search.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.knowledge.base.search.entity.SearchHistory;
import com.knowledge.base.search.mapper.SearchHistoryMapper;
import com.knowledge.base.search.service.SearchHistoryService;
import com.knowledge.base.search.vo.SearchHistoryVO;
import com.knowledge.base.common.config.IntelligenceExecutorNames;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * 搜索历史Service实现
 *
 * @author 苏三
 * @since 1.0.0
 */
@Slf4j
@Service
public class SearchHistoryServiceImpl implements SearchHistoryService {

    @Resource
    private SearchHistoryMapper searchHistoryMapper;

    @Resource(name = IntelligenceExecutorNames.SEARCH)
    private ThreadPoolTaskExecutor searchTaskExecutor;

    /** 按 userId+keyword 串行化 upsert，避免并发异步写入重复行 */
    private final ConcurrentHashMap<String, Object> upsertLocks = new ConcurrentHashMap<>();

    /** {@inheritDoc} */
    @Override
    public List<SearchHistoryVO> getSearchHistory(Long userId) {
        LambdaQueryWrapper<SearchHistory> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(SearchHistory::getUserId, userId);
        queryWrapper.orderByDesc(SearchHistory::getCreatedAt);

        List<SearchHistory> histories = searchHistoryMapper.selectList(queryWrapper);

        // 按关键词分组，取最新的记录
        Map<String, SearchHistory> keywordMap = histories.stream()
            .collect(Collectors.toMap(
                SearchHistory::getKeyword,
                h -> h,
                (h1, h2) -> h1.getCreatedAt().isAfter(h2.getCreatedAt()) ? h1 : h2
            ));

        return keywordMap.values().stream()
            .sorted(Comparator.comparing(SearchHistory::getCreatedAt).reversed())
            .limit(20)
            .map(this::convertToVO)
            .collect(Collectors.toList());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Boolean clearSearchHistory(Long userId) {
        LambdaQueryWrapper<SearchHistory> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(SearchHistory::getUserId, userId);
        return searchHistoryMapper.delete(queryWrapper) >= 0;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Boolean deleteSearchHistory(Long historyId, Long userId) {
        LambdaQueryWrapper<SearchHistory> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(SearchHistory::getId, historyId);
        queryWrapper.eq(SearchHistory::getUserId, userId);
        return searchHistoryMapper.delete(queryWrapper) > 0;
    }

    /** {@inheritDoc} */
    @Override
    public List<String> getHotSearch() {
        // 获取最近7天的热门搜索
        LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);

        LambdaQueryWrapper<SearchHistory> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.ge(SearchHistory::getCreatedAt, sevenDaysAgo);
        queryWrapper.orderByDesc(SearchHistory::getSearchCount);
        queryWrapper.last("LIMIT 10");

        return searchHistoryMapper.selectList(queryWrapper).stream()
            .map(SearchHistory::getKeyword)
            .collect(Collectors.toList());
    }

    /**
     * 保存或更新搜索历史（同一用户同一关键词仅保留一条）
     *
     * @param userId  用户 ID
     * @param keyword 搜索关键词
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void saveSearchHistory(Long userId, String keyword) {
        if (userId == null || !StringUtils.hasText(keyword)) {
            return;
        }

        String normalizedKeyword = keyword.trim();
        String lockKey = userId + ":" + normalizedKeyword;
        Object lock = upsertLocks.computeIfAbsent(lockKey, key -> new Object());
        synchronized (lock) {
            try {
                upsertSearchHistory(userId, normalizedKeyword);
            } finally {
                upsertLocks.remove(lockKey, lock);
            }
        }
    }

    /**
     * 按 userId+keyword 合并重复记录并 upsert
     */
    private void upsertSearchHistory(Long userId, String keyword) {
        LambdaQueryWrapper<SearchHistory> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(SearchHistory::getUserId, userId);
        queryWrapper.eq(SearchHistory::getKeyword, keyword);
        queryWrapper.orderByDesc(SearchHistory::getCreatedAt);

        List<SearchHistory> existingList = searchHistoryMapper.selectList(queryWrapper);
        if (!existingList.isEmpty()) {
            SearchHistory keeper = existingList.get(0);
            int mergedCount = existingList.stream()
                    .mapToInt(item -> item.getSearchCount() != null ? item.getSearchCount() : 0)
                    .sum() + 1;
            keeper.setSearchCount(mergedCount);
            keeper.setCreatedAt(LocalDateTime.now());
            searchHistoryMapper.updateById(keeper);

            for (int i = 1; i < existingList.size(); i++) {
                searchHistoryMapper.deleteById(existingList.get(i).getId());
            }
            return;
        }

        SearchHistory newHistory = new SearchHistory();
        newHistory.preInsert();
        newHistory.setUserId(userId);
        newHistory.setKeyword(keyword);
        newHistory.setSearchCount(1);
        newHistory.setCreatedAt(LocalDateTime.now());
        searchHistoryMapper.insert(newHistory);
    }

    /** {@inheritDoc} */
    @Override
    public void saveSearchHistoryAsync(Long userId, String keyword) {
        CompletableFuture.runAsync(() -> {
            try {
                saveSearchHistory(userId, keyword);
            } catch (Exception e) {
                log.warn("保存搜索历史失败：keyword={}, error={}", keyword, e.getMessage());
            }
        }, searchTaskExecutor);
    }

    /**
     * 转换为VO
     *
     * @param history 搜索历史实体
     * @return 搜索历史VO
     */
    private SearchHistoryVO convertToVO(SearchHistory history) {
        SearchHistoryVO vo = new SearchHistoryVO();
        BeanUtils.copyProperties(history, vo);
        return vo;
    }
}
