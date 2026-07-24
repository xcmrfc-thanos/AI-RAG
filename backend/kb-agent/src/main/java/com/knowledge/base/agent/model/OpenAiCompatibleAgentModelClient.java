package com.knowledge.base.agent.model;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.knowledge.base.agent.config.AgentProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * OpenAI-compatible AgentModelClient（千问 / DeepSeek）+ AI_DEV_STUB
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OpenAiCompatibleAgentModelClient implements AgentModelClient {

    private final AgentProperties agentProperties;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${ai.dev-stub-enabled:false}")
    private boolean devStubEnabled;

    /**
     * {@inheritDoc}
     */
    /**
     * complete 方法。
     */
    @Override
    public AgentModelResponse complete(AgentModelRequest request) {
        if (devStubEnabled) {
            return stub(request);
        }
        String key = StringUtils.hasText(request.modelKey())
                ? request.modelKey().trim().toLowerCase()
                : agentProperties.getDefaultModel().toLowerCase();
        AgentProperties.Provider provider = resolveProvider(key);
        if (!StringUtils.hasText(provider.getApiKey())) {
            log.warn("模型 {} 无 API Key，回退 Stub", key);
            return stub(request);
        }
        try {
            String url = trimSlash(provider.getBaseUrl()) + "/chat/completions";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(provider.getApiKey());

            Map<String, Object> body = new HashMap<>();
            body.put("model", provider.getModel());
            List<Map<String, String>> messages = new ArrayList<>();
            if (StringUtils.hasText(request.systemPrompt())) {
                messages.add(Map.of("role", "system", "content", request.systemPrompt()));
            }
            messages.add(Map.of("role", "user", "content",
                    request.userPrompt() != null ? request.userPrompt() : ""));
            body.put("messages", messages);

            ResponseEntity<String> resp = restTemplate.postForEntity(
                    url, new HttpEntity<>(body, headers), String.class);
            JsonNode root = objectMapper.readTree(resp.getBody());
            String text = root.path("choices").path(0).path("message").path("content").asText("");
            return new AgentModelResponse(text, key + ":" + provider.getModel(), false);
        } catch (Exception e) {
            log.error("Agent LLM 调用失败 model={}: {}", key, e.getMessage());
            throw new IllegalStateException("Agent LLM 调用失败: " + e.getMessage(), e);
        }
    }

    /**
     * 解析提供商配置
     */
    private AgentProperties.Provider resolveProvider(String key) {
        if ("deepseek".equals(key)) {
            return agentProperties.getLlm().getDeepseek();
        }
        return agentProperties.getLlm().getQwen();
    }

    /**
     * 确定性 Stub（无 Key / AI_DEV_STUB）
     */
    private AgentModelResponse stub(AgentModelRequest request) {
        String prompt = request.userPrompt() != null ? request.userPrompt() : "";
        String snippet = prompt.length() > 120 ? prompt.substring(0, 120) + "..." : prompt;
        String text = "[Agent Stub] 已根据提示生成确定性回答。\n摘要：" + snippet;
        return new AgentModelResponse(text, "stub", true);
    }

    private String trimSlash(String url) {
        if (url == null) {
            return "";
        }
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
