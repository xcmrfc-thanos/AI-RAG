package com.knowledge.base.userauth.vo;

import lombok.Builder;
import lombok.Data;

/**
 * Embed Token 签发结果。
 */
@Data
@Builder
public class EmbedTokenVO {

    /** 短期 embed JWT */
    private String token;

    /** 过期时间 epoch 毫秒 */
    private Long expiresAt;

    /** 单次 nonce */
    private String nonce;

    /** 绑定的允许 Origin */
    private String allowedOrigin;

    /** 知识范围声明 */
    private String knowledgeScope;
}
