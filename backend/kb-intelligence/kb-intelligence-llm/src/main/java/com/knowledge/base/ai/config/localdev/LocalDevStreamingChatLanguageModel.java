package com.knowledge.base.ai.config.localdev;

import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.StreamingResponseHandler;
import dev.langchain4j.model.chat.StreamingChatLanguageModel;
import dev.langchain4j.model.output.Response;

import java.util.List;

/**
 * 本地开发用 StreamingChatLanguageModel Stub，一次性推送完整 stub 回答。
 *
 * @author 苏三
 * @since 1.0.0
 */
public class LocalDevStreamingChatLanguageModel implements StreamingChatLanguageModel {

    /**
     * 流式生成 stub 回答（单 token 推送完整文本）。
     */
    @Override
    public void generate(List<ChatMessage> messages, StreamingResponseHandler<AiMessage> handler) {
        String answer = LocalDevResponseSynthesizer.synthesize(extractLastUserText(messages));
        handler.onNext(answer);
        handler.onComplete(Response.from(AiMessage.from(answer)));
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
