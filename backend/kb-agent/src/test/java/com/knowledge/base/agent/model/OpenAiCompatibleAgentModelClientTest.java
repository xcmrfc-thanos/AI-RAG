package com.knowledge.base.agent.model;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.knowledge.base.agent.config.AgentProperties;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * AgentModelClient Stub 定向单测
 */
class OpenAiCompatibleAgentModelClientTest {

    /**
     * AI_DEV_STUB 开启时应返回确定性 Stub
     */
    @Test
    void stubWhenDevEnabled() {
        AgentProperties props = new AgentProperties();
        props.setDefaultModel("qwen");
        OpenAiCompatibleAgentModelClient client =
                new OpenAiCompatibleAgentModelClient(props, null);
        ReflectionTestUtils.setField(client, "devStubEnabled", true);

        AgentModelResponse resp = client.complete(new AgentModelRequest("sys", "hello agent", null));

        assertTrue(resp.stub());
        assertTrue(resp.text().contains("Stub"));
        assertTrue(resp.text().contains("hello agent"));
    }
}
