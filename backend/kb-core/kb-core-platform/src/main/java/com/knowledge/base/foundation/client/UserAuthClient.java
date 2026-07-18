package com.knowledge.base.foundation.client;

import com.knowledge.base.common.result.Result;
import com.knowledge.base.foundation.dto.TokenValidateVO;

import java.util.List;

/**
 * IAM 认证客户端抽象（Core BC 内进程内调用，替代 Feign）。
 */
public interface UserAuthClient {

    /**
     * 验证 JWT Token
     */
    Result<TokenValidateVO> validateToken(String authorization, String token);

    /**
     * 按角色编码查询用户 ID 列表
     */
    Result<List<Long>> getUserIdsByRole(String roleCode);
}
