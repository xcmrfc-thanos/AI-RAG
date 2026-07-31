package com.knowledge.base.userauth.dto;

import lombok.Data;

/**
 * 签发 Embed Token 请求。
 */
@Data
public class EmbedTokenRequest {

    /** 知识范围声明（可选，首期仅写入 JWT） */
    private String knowledgeScope;

    /** 过期秒数；空则默认 300，上限 3600 */
    private Long ttlSeconds;
}
