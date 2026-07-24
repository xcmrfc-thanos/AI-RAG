package com.knowledge.base.core.client;

import com.knowledge.base.document.client.DocumentUserClient;
import com.knowledge.base.userauth.entity.TeamMember;
import com.knowledge.base.userauth.mapper.TeamMemberMapper;
import com.knowledge.base.userauth.service.UserService;
import com.knowledge.base.userauth.vo.UserVO;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Document 访问 IAM 的进程内实现（P2-4）。
 */
@Component
public class DocumentUserLocalClient implements DocumentUserClient {

    @Resource
    private UserService userService;

    @Resource
    private TeamMemberMapper teamMemberMapper;

    /**
     * 通过 UserService 获取头像
     */
    /**
     * 获取UserAvatar。
     */
    @Override
    public String getUserAvatar(Long userId) {
        if (userId == null) {
            return null;
        }
        try {
            UserVO user = userService.getUserById(userId);
            return user != null ? user.getAvatar() : null;
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * 通过 UserService 获取权限列表
     */
    /**
     * 获取UserPermissions。
     */
    @Override
    public List<String> getUserPermissions(Long userId, String token) {
        if (userId == null || !StringUtils.hasText(token)) {
            return Collections.emptyList();
        }
        try {
            return userService.getUserPermissions(userId);
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    /**
     * 通过 TeamMemberMapper 查询用户所属团队
     *
     * @param userId 用户 ID
     * @return 团队 ID 列表
     */
    /**
     * 列表查询TeamIds。
     */
    @Override
    public List<Long> listTeamIds(Long userId) {
        if (userId == null) {
            return Collections.emptyList();
        }
        try {
            List<TeamMember> members = teamMemberMapper.selectByUserId(userId);
            if (members == null || members.isEmpty()) {
                return Collections.emptyList();
            }
            return members.stream()
                    .map(TeamMember::getTeamId)
                    .filter(Objects::nonNull)
                    .distinct()
                    .collect(Collectors.toList());
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}
