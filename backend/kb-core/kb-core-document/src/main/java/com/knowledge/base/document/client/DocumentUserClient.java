package com.knowledge.base.document.client;

import java.util.List;

/**
 * Document 模块访问 IAM 的进程内客户端抽象（P2-4 Core BC）。
 */
public interface DocumentUserClient {

    /**
     * 获取用户头像 URL
     *
     * @param userId 用户 ID
     * @return 头像 URL
     */
    String getUserAvatar(Long userId);

    /**
     * 获取用户权限编码列表
     *
     * @param userId 用户 ID
     * @param token  访问令牌
     * @return 权限码列表
     */
    List<String> getUserPermissions(Long userId, String token);

    /**
     * 查询用户所属团队 ID 列表（用于文档/检索 ACL）
     *
     * @param userId 用户 ID
     * @return 团队 ID 列表，失败时返回空列表
     */
    List<Long> listTeamIds(Long userId);
}
