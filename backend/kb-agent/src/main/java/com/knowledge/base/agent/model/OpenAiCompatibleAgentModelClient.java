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
 * OpenAI-compatible AgentModelClient（第8阶段：模型库直连优先 + legacy 兜底 + AI_DEV_STUB）。
 *
 * <p>模型解析经 {@link AgentModelResolver}：模型库 chat 条目（任意 provider）→
 * 旧 qwen/deepseek 配置；不再 switch 限定两家。</p>
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OpenAiCompatibleAgentModelClient implements AgentModelClient {

    private final AgentProperties agentProperties;
    private final AgentModelResolver agentModelResolver;
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
                ? request.modelKey().trim()
                : agentProperties.getDefaultModel();
        AgentModelResolver.Resolved resolved = agentModelResolver.resolve(key);
        if (!resolved.usable()) {
            log.warn("模型 {} 无 API Key/基址（{}），回退 Stub", key, resolved.source());
            return stub(request);
        }
        try {
            String url = trimSlash(resolved.baseUrl()) + "/chat/completions";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(resolved.apiKey());

            Map<String, Object> body = new HashMap<>();
            body.put("model", resolved.model());
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
            return new AgentModelResponse(text, key + ":" + resolved.model(), false);
        } catch (Exception e) {
            log.error("Agent LLM 调用失败 model={}: {}", key, e.getMessage());
            throw new IllegalStateException("Agent LLM 调用失败: " + e.getMessage(), e);
        }
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
