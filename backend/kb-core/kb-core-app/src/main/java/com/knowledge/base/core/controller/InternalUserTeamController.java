package com.knowledge.base.core.controller;

import com.knowledge.base.common.result.Result;
import com.knowledge.base.userauth.entity.TeamMember;
import com.knowledge.base.userauth.mapper.TeamMemberMapper;
import io.swagger.v3.oas.annotations.Hidden;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * 内部接口：查询用户所属团队（供 Intelligence 检索 ACL 使用）
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
@Hidden
@RestController
@RequestMapping("/internal/users")
public class InternalUserTeamController {

    @Resource
    private TeamMemberMapper teamMemberMapper;

    /**
     * 返回用户所属团队 ID 列表
     *
     * @param userId 用户 ID
     * @return 团队 ID 列表
     */
    @GetMapping("/{userId}/team-ids")
    public Result<List<Long>> listTeamIds(@PathVariable Long userId) {
        if (userId == null) {
            return Result.success(Collections.emptyList());
        }
        List<TeamMember> members = teamMemberMapper.selectByUserId(userId);
        if (members == null || members.isEmpty()) {
            return Result.success(Collections.emptyList());
        }
        List<Long> ids = members.stream()
                .map(TeamMember::getTeamId)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
        return Result.success(ids);
    }
}
