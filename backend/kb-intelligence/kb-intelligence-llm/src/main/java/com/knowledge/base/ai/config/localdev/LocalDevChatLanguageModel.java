package com.knowledge.base.ai.config.localdev;

import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.output.Response;

import java.util.List;

/**
 * 本地开发用 ChatLanguageModel Stub，不调用外部 LLM API。
 *
 * @author 苏三
 * @since 1.0.0
 */
public class LocalDevChatLanguageModel implements ChatLanguageModel {

    /**
     * 生成基于 RAG 参考资料的 stub 回答。
     */
    /**
     * 生成。
     */
    @Override
    public Response<AiMessage> generate(List<ChatMessage> messages) {
        return Response.from(AiMessage.from(LocalDevResponseSynthesizer.synthesize(extractLastUserText(messages))));
    }

    /**
     * 提取对话中最后一条用户消息文本。
     */
    private static String extractLastUserText(List<ChatMessage> messages) {
        if (messages == null || messages.isEmpty()) {
            return "";
        }
        for (int i = messages.size() - 1; i >= 0; i--) {
            ChatMessage message = messages.get(i);
            if (message instanceof UserMessage userMessage) {
                return userMessage.singleText();
            }
        }
        return "";
    }
}
