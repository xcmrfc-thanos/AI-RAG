package com.knowledge.base.core.client;

import com.knowledge.base.common.result.Result;
import com.knowledge.base.foundation.client.UserAuthClient;
import com.knowledge.base.foundation.dto.TokenValidateVO;
import com.knowledge.base.userauth.service.UserService;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * IAM 进程内客户端（P2-3，替代 UserAuthFeignClient）。
 */
@Component
public class UserAuthLocalClient implements UserAuthClient {

    @Resource
    private UserService userService;

    /**
     * 验证 JWT Token 并映射为 foundation DTO
     */
    @Override
    public Result<TokenValidateVO> validateToken(String authorization, String token) {
        com.knowledge.base.userauth.vo.TokenValidateVO iamVo =
                userService.validateToken(authorization, token);
        return Result.success(toFoundationVo(iamVo));
    }

    /**
     * 按角色编码查询用户 ID
     */
    @Override
    public Result<List<Long>> getUserIdsByRole(String roleCode) {
        return Result.success(userService.getUserIdsByRoleCode(roleCode));
    }

    /**
     * 将 IAM VO 转为 foundation DTO
     */
    private TokenValidateVO toFoundationVo(com.knowledge.base.userauth.vo.TokenValidateVO iamVo) {
        if (iamVo == null) {
            return TokenValidateVO.builder().valid(false).build();
        }
        return TokenValidateVO.builder()
                .userId(iamVo.getUserId())
                .username(iamVo.getUsername())
                .nickname(iamVo.getNickname())
                .avatar(iamVo.getAvatar())
                .email(iamVo.getEmail())
                .status(iamVo.getStatus())
                .roles(iamVo.getRoles())
                .valid(iamVo.getValid())
                .build();
    }
}
