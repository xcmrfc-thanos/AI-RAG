package com.knowledge.base.foundation.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.knowledge.base.common.config.ModelCrypto;
import com.knowledge.base.common.config.ModelLibraryClient;
import com.knowledge.base.common.exception.BusinessException;
import com.knowledge.base.common.model.ModelLibraryEntry;
import com.knowledge.base.common.model.ModelLibraryItem;
import com.knowledge.base.foundation.dto.ModelItemDTO;
import com.knowledge.base.foundation.dto.ModelProviderDTO;
import com.knowledge.base.foundation.dto.ModelTestDTO;
import com.knowledge.base.foundation.entity.ModelItem;
import com.knowledge.base.foundation.entity.ModelProvider;
import com.knowledge.base.foundation.mapper.ModelItemMapper;
import com.knowledge.base.foundation.mapper.ModelProviderMapper;
import com.knowledge.base.foundation.service.ModelProviderService;
import com.knowledge.base.foundation.vo.ModelItemVO;
import com.knowledge.base.foundation.vo.ModelOptionVO;
import com.knowledge.base.foundation.vo.ModelProviderVO;
import com.knowledge.base.foundation.vo.ModelTypeVO;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

/**
 * 模型提供方服务实现（第8阶段模型库）。
 *
 * <p>写链路：加密落库 → 全量刷新 Redis {@code kb:model:cache}（解密后明文，
 * 5 分钟 TTL 双保险）→ 清空本地缓存；读链路见 {@link ModelLibraryClient}。</p>
 *
 * @author 苏三
 * @since 1.1.0
 */
@Slf4j
@Service
public class ModelProviderServiceImpl implements ModelProviderService {

    /** 模型类型 → 中文名 */
    private static final Map<String, String> TYPE_LABELS = new LinkedHashMap<>();

    static {
        TYPE_LABELS.put(ModelLibraryClient.TYPE_CHAT, "对话");
        TYPE_LABELS.put(ModelLibraryClient.TYPE_EMBEDDING, "向量嵌入");
        TYPE_LABELS.put(ModelLibraryClient.TYPE_RERANK, "重排");
        TYPE_LABELS.put(ModelLibraryClient.TYPE_TTS, "语音合成");
        TYPE_LABELS.put(ModelLibraryClient.TYPE_STT, "语音识别");
        TYPE_LABELS.put(ModelLibraryClient.TYPE_IMAGE, "图像");
        TYPE_LABELS.put(ModelLibraryClient.TYPE_OTHER, "其他");
    }

    @Resource
    private ModelProviderMapper modelProviderMapper;

    @Resource
    private ModelItemMapper modelItemMapper;

    @Resource
    private ModelCrypto modelCrypto;

    @Resource
    private ModelLibraryClient modelLibraryClient;

    @Resource
    private StringRedisTemplate stringRedisTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    public List<ModelTypeVO> listTypes() {
        return TYPE_LABELS.entrySet().stream()
                .map(e -> new ModelTypeVO(e.getKey(), e.getValue()))
                .collect(Collectors.toList());
    }

    @Override
    public List<ModelOptionVO> listForScene(String modelType) {
        if (!StringUtils.hasText(modelType)) {
            throw new BusinessException("模型类型不能为空");
        }
        List<ModelItem> items = modelItemMapper.selectEnabledByType(modelType);
        List<ModelOptionVO> result = new ArrayList<>(items.size());
        for (ModelItem item : items) {
            ModelProvider provider = modelProviderMapper.selectById(item.getProviderId());
            ModelOptionVO vo = new ModelOptionVO();
            vo.setKey(item.getModelKey());
            vo.setValue(item.getModelKey());
            vo.setLabel(StringUtils.hasText(item.getDisplayName()) ? item.getDisplayName() : item.getModelKey());
            vo.setIsDefault(item.getIsDefault() != null && item.getIsDefault() == 1);
            vo.setProviderKey(provider != null ? provider.getProviderKey() : null);
            result.add(vo);
        }
        return result;
    }

    @Override
    public IPage<ModelProviderVO> page(Long current, Long size, String keyword) {
        LambdaQueryWrapper<ModelProvider> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(keyword)) {
            wrapper.and(w -> w.like(ModelProvider::getProviderKey, keyword)
                    .or().like(ModelProvider::getProviderName, keyword));
        }
        wrapper.orderByAsc(ModelProvider::getId);
        IPage<ModelProvider> p = modelProviderMapper.selectPage(new Page<>(current, size), wrapper);
        IPage<ModelProviderVO> voPage = new Page<>(p.getCurrent(), p.getSize(), p.getTotal());
        voPage.setRecords(p.getRecords().stream().map(this::toVO).collect(Collectors.toList()));
        return voPage;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long create(ModelProviderDTO dto) {
        ModelProvider exists = modelProviderMapper.selectOne(new LambdaQueryWrapper<ModelProvider>()
                .eq(ModelProvider::getProviderKey, dto.getProviderKey()));
        if (exists != null) {
            throw new BusinessException("提供方标识已存在：" + dto.getProviderKey());
        }
        ModelProvider provider = new ModelProvider();
        provider.preInsert();
        applyProviderFields(provider, dto, true);
        modelProviderMapper.insert(provider);

        saveModels(provider.getId(), dto.getModels());
        refreshModelCache();
        return provider.getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void update(Long id, ModelProviderDTO dto) {
        ModelProvider provider = modelProviderMapper.selectById(id);
        if (provider == null) {
            throw new BusinessException("模型提供方不存在：" + id);
        }
        applyProviderFields(provider, dto, false);
        modelProviderMapper.updateById(provider);

        // 模型条目全量替换（软删旧条目 + 插入新条目）
        List<ModelItem> oldItems = modelItemMapper.selectList(new LambdaQueryWrapper<ModelItem>()
                .eq(ModelItem::getProviderId, id));
        oldItems.forEach(i -> modelItemMapper.deleteById(i.getId()));
        saveModels(id, dto.getModels());
        refreshModelCache();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void delete(Long id) {
        ModelProvider provider = modelProviderMapper.selectById(id);
        if (provider == null) {
            throw new BusinessException("模型提供方不存在：" + id);
        }
        modelProviderMapper.deleteById(id);
        modelItemMapper.delete(new LambdaQueryWrapper<ModelItem>().eq(ModelItem::getProviderId, id));
        refreshModelCache();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int rotateKey() {
        List<ModelProvider> providers = modelProviderMapper.selectList(null);
        int rotated = 0;
        for (ModelProvider provider : providers) {
            if (!StringUtils.hasText(provider.getApiKey())) {
                continue;
            }
            try {
                String plain = modelCrypto.decrypt(provider.getApiKey());
                provider.setApiKey(modelCrypto.encrypt(plain));
                provider.setApiKeyHint(ModelCrypto.mask(plain));
                modelProviderMapper.updateById(provider);
                rotated++;
            } catch (Exception e) {
                log.warn("密钥轮换跳过 provider={}（解密失败，可能旧密钥已丢失）：{}",
                        provider.getProviderKey(), e.getMessage());
            }
        }
        refreshModelCache();
        log.info("模型凭证密钥轮换完成：成功 {} 个提供方", rotated);
        return rotated;
    }

    @Override
    public String testConnection(ModelTestDTO dto) {
        String endpoint = ModelLibraryClient.TYPE_EMBEDDING.equals(dto.getModelType())
                ? "/embeddings" : "/chat/completions";
        String url = trimEndSlash(dto.getBaseUrl()) + endpoint;
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("model", dto.getModelKey());
            if (ModelLibraryClient.TYPE_EMBEDDING.equals(dto.getModelType())) {
                body.put("input", "ping");
            } else {
                body.put("messages", List.of(Map.of("role", "user", "content", "ping")));
                body.put("max_tokens", 5);
            }
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(dto.getApiKey());
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

            org.springframework.http.client.SimpleClientHttpRequestFactory factory =
                    new org.springframework.http.client.SimpleClientHttpRequestFactory();
            factory.setConnectTimeout(8000);
            factory.setReadTimeout(8000);
            restTemplate.setRequestFactory(factory);
            ResponseEntity<Map> resp = restTemplate.exchange(url, HttpMethod.POST, entity, Map.class);
            if (resp.getStatusCode().is2xxSuccessful()) {
                return "连接成功（" + dto.getModelKey() + "@" + hostOf(dto.getBaseUrl()) + "）";
            }
            return "连接失败：HTTP " + resp.getStatusCode().value();
        } catch (Exception e) {
            log.warn("模型连通性测试失败：url={}, err={}", url, e.getMessage());
            return "连接失败：" + e.getMessage();
        }
    }

    // ==================== 内部方法 ====================

    private void applyProviderFields(ModelProvider provider, ModelProviderDTO dto, boolean isCreate) {
        provider.setProviderKey(dto.getProviderKey());
        provider.setProviderName(dto.getProviderName());
        provider.setBaseUrl(dto.getBaseUrl());
        provider.setStatus(dto.getStatus() != null ? dto.getStatus() : 1);
        provider.setExtraParams(dto.getExtraParams());
        if (StringUtils.hasText(dto.getApiKey())) {
            // 新增必填；更新时为空表示不修改
            provider.setApiKey(modelCrypto.encrypt(dto.getApiKey()));
            provider.setApiKeyHint(ModelCrypto.mask(dto.getApiKey()));
        } else if (isCreate) {
            throw new BusinessException("API Key 不能为空");
        }
    }

    private void saveModels(Long providerId, List<ModelItemDTO> items) {
        if (items == null || items.isEmpty()) {
            return;
        }
        for (ModelItemDTO dto : items) {
            ModelItem item = new ModelItem();
            item.preInsert();
            item.setProviderId(providerId);
            item.setModelKey(dto.getModelKey());
            item.setModelType(dto.getModelType());
            item.setDisplayName(dto.getDisplayName());
            item.setDimension(dto.getDimension());
            item.setModelConfig(dto.getModelConfig());
            item.setStatus(dto.getStatus() != null ? dto.getStatus() : 1);
            // 每类型至多一个默认：先清掉该类型旧默认
            if (dto.getIsDefault() != null && dto.getIsDefault() == 1) {
                List<ModelItem> typeDefaults = modelItemMapper.selectList(new LambdaQueryWrapper<ModelItem>()
                        .eq(ModelItem::getModelType, dto.getModelType())
                        .eq(ModelItem::getIsDefault, 1));
                typeDefaults.forEach(td -> {
                    td.setIsDefault(0);
                    modelItemMapper.updateById(td);
                });
            }
            item.setIsDefault(dto.getIsDefault() != null && dto.getIsDefault() == 1 ? 1 : 0);
            modelItemMapper.insert(item);
        }
    }

    private ModelProviderVO toVO(ModelProvider p) {
        ModelProviderVO vo = new ModelProviderVO();
        vo.setId(p.getId());
        vo.setProviderKey(p.getProviderKey());
        vo.setProviderName(p.getProviderName());
        vo.setBaseUrl(p.getBaseUrl());
        vo.setApiKeyHint(p.getApiKeyHint());
        vo.setExtraParams(p.getExtraParams());
        vo.setStatus(p.getStatus());
        List<ModelItem> items = modelItemMapper.selectEnabledByProvider(p.getId());
        vo.setModels(items.stream().map(this::toItemVO).collect(Collectors.toList()));
        return vo;
    }

    private ModelItemVO toItemVO(ModelItem m) {
        ModelItemVO vo = new ModelItemVO();
        vo.setId(m.getId());
        vo.setModelKey(m.getModelKey());
        vo.setModelType(m.getModelType());
        vo.setDisplayName(m.getDisplayName());
        vo.setIsDefault(m.getIsDefault());
        vo.setDimension(m.getDimension());
        vo.setModelConfig(m.getModelConfig());
        vo.setStatus(m.getStatus());
        return vo;
    }

    /**
     * 全量刷新模型库缓存：Redis Hash（解密后明文）+ 清本地缓存。
     */
    private void refreshModelCache() {
        try {
            List<ModelProvider> providers = modelProviderMapper.selectEnabledList();
            Map<String, String> hash = new HashMap<>();
            for (ModelProvider p : providers) {
                ModelLibraryEntry entry = new ModelLibraryEntry();
                entry.setProviderKey(p.getProviderKey());
                entry.setProviderName(p.getProviderName());
                entry.setBaseUrl(p.getBaseUrl());
                entry.setApiKey(modelCrypto.decrypt(p.getApiKey()));
                List<ModelLibraryItem> models = new ArrayList<>();
                for (ModelItem item : modelItemMapper.selectEnabledByProvider(p.getId())) {
                    ModelLibraryItem mi = new ModelLibraryItem();
                    mi.setModelKey(item.getModelKey());
                    mi.setModelType(item.getModelType());
                    mi.setDisplayName(item.getDisplayName());
                    mi.setIsDefault(item.getIsDefault());
                    mi.setDimension(item.getDimension());
                    mi.setModelConfig(item.getModelConfig());
                    models.add(mi);
                }
                entry.setModels(models);
                hash.put(p.getProviderKey(), objectMapper.writeValueAsString(entry));
            }
            stringRedisTemplate.delete(ModelLibraryClient.REDIS_HASH_KEY);
            if (!hash.isEmpty()) {
                stringRedisTemplate.opsForHash().putAll(ModelLibraryClient.REDIS_HASH_KEY, hash);
                // 5 分钟 TTL 双保险：写侧变更前读侧最多使用 5 分钟前的数据
                stringRedisTemplate.expire(ModelLibraryClient.REDIS_HASH_KEY, 5, TimeUnit.MINUTES);
            }
            modelLibraryClient.refresh();
            log.info("模型库缓存已刷新：{} 个提供方", hash.size());
        } catch (Exception e) {
            log.error("模型库缓存刷新失败（不影响已落库数据）", e);
        }
    }

    private String trimEndSlash(String url) {
        return url == null ? "" : url.replaceAll("/+$", "");
    }

    private String hostOf(String url) {
        try {
            return new java.net.URI(url).getHost();
        } catch (Exception e) {
            return url;
        }
    }
}
