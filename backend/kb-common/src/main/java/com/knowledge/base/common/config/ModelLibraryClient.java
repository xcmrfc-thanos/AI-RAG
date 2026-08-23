package com.knowledge.base.common.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.knowledge.base.common.model.ModelLibraryEntry;
import com.knowledge.base.common.model.ModelLibraryItem;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

/**
 * 模型库读取客户端（第8阶段模型库）。
 *
 * <p>读取链路：本地 Caffeine 缓存（TTL 60s）→ Redis Hash
 * {@code kb:model:cache}（解密后明文，由 kb-core 写侧维护）。</p>
 *
 * <p>任一环节为空（Redis 断连 / 未配置模型库）返回空集合，调用方回退
 * 旧 Nacos 配置，保证滚动发布安全；模型库未配置时业务行为与升级前一致。</p>
 *
 * <p>模型类型常量：{@code chat} / {@code embedding} / {@code rerank} /
 * {@code tts} / {@code stt} / {@code image} / {@code other}。</p>
 *
 * @author 苏三
 * @since 1.1.0
 */
@Slf4j
@Component
public class ModelLibraryClient {

    /** Redis Hash 键名（专用：存解密后明文，勿与 kb:system:config 混用） */
    public static final String REDIS_HASH_KEY = "kb:model:cache";

    /** 模型类型常量 */
    public static final String TYPE_CHAT = "chat";
    public static final String TYPE_EMBEDDING = "embedding";
    public static final String TYPE_RERANK = "rerank";
    public static final String TYPE_TTS = "tts";
    public static final String TYPE_STT = "stt";
    public static final String TYPE_IMAGE = "image";
    public static final String TYPE_OTHER = "other";

    /** 本地缓存 TTL（秒） */
    private static final long LOCAL_TTL_SECONDS = 60;

    @Resource
    private StringRedisTemplate stringRedisTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /** 本地缓存：key=providerKey，value=解析后的条目；TTL 60s 自然过期 */
    private final Cache<String, ModelLibraryEntry> localCache =
            Caffeine.newBuilder().expireAfterWrite(LOCAL_TTL_SECONDS, TimeUnit.SECONDS).maximumSize(256).build();

    /**
     * 全量模型库（解密后），空库返回空列表。
     */
    public List<ModelLibraryEntry> getAll() {
        Map<Object, Object> entries;
        try {
            entries = stringRedisTemplate.opsForHash().entries(REDIS_HASH_KEY);
        } catch (Exception e) {
            log.warn("模型库 Redis 读取失败，回退空库（业务将使用旧配置）：{}", e.getMessage());
            return Collections.emptyList();
        }
        if (CollectionUtils.isEmpty(entries)) {
            return Collections.emptyList();
        }
        List<ModelLibraryEntry> result = new ArrayList<>(entries.size());
        for (Object v : entries.values()) {
            if (v == null) {
                continue;
            }
            ModelLibraryEntry entry = parse(v.toString());
            if (entry != null) {
                result.add(entry);
            }
        }
        return result;
    }

    /**
     * 指定类型全部模型（含所属提供方信息），空库返回空列表。
     */
    public List<ModelLibraryEntry> getByType(String modelType) {
        return getAll().stream()
                .filter(e -> e.getModels() != null && e.getModels().stream()
                        .anyMatch(m -> modelType.equals(m.getModelType())))
                .collect(Collectors.toList());
    }

    /**
     * 指定类型默认模型（提供方 + 模型），无默认时取该类型第一个启用条目。
     */
    public ModelLibraryItem getDefaultByType(String modelType) {
        for (ModelLibraryEntry entry : getAll()) {
            if (entry.getModels() == null) {
                continue;
            }
            ModelLibraryItem hit = null;
            for (ModelLibraryItem item : entry.getModels()) {
                if (!modelType.equals(item.getModelType())) {
                    continue;
                }
                if (item.getIsDefault() != null && item.getIsDefault() == 1) {
                    return item;
                }
                if (hit == null) {
                    hit = item;
                }
            }
            if (hit != null) {
                return hit;
            }
        }
        return null;
    }

    /**
     * 按提供方标识取条目（含解密 apiKey）。
     */
    public ModelLibraryEntry getProvider(String providerKey) {
        ModelLibraryEntry cached = localCache.getIfPresent(providerKey);
        if (cached != null) {
            return cached;
        }
        Object value;
        try {
            value = stringRedisTemplate.opsForHash().get(REDIS_HASH_KEY, providerKey);
        } catch (Exception e) {
            log.warn("模型库 Redis 读取失败（provider={}）：{}", providerKey, e.getMessage());
            return null;
        }
        if (value == null) {
            return null;
        }
        ModelLibraryEntry entry = parse(value.toString());
        if (entry != null) {
            localCache.put(providerKey, entry);
        }
        return entry;
    }

    /**
     * 指定提供方下某类型模型（chat 场景按 model key 消费）。
     */
    public ModelLibraryItem getModel(String providerKey, String modelKey) {
        ModelLibraryEntry entry = getProvider(providerKey);
        if (entry == null || entry.getModels() == null) {
            return null;
        }
        return entry.getModels().stream()
                .filter(m -> modelKey.equals(m.getModelKey()))
                .findFirst().orElse(null);
    }

    /**
     * 清空本地缓存（写侧变更后调用，或 60s TTL 自然过期兜底）。
     */
    public void refresh() {
        localCache.invalidateAll();
        log.debug("模型库本地缓存已清空");
    }

    private ModelLibraryEntry parse(String json) {
        if (!StringUtils.hasText(json)) {
            return null;
        }
        try {
            return objectMapper.readValue(json, new TypeReference<ModelLibraryEntry>() {
            });
        } catch (Exception e) {
            log.warn("模型库缓存 JSON 解析失败，忽略该条目：{}", e.getMessage());
            return null;
        }
    }
}
