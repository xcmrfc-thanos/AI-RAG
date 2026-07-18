package com.knowledge.base.search.support;

import co.elastic.clients.elasticsearch._types.FieldValue;
import co.elastic.clients.elasticsearch._types.query_dsl.BoolQuery;
import com.knowledge.base.common.security.DocumentVisibility;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * 检索侧 ES ACL 过滤与结果后置校验
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
public final class SearchAclQuerySupport {

    private SearchAclQuerySupport() {
    }

    /**
     * 为文档级索引（camelCase）追加可见性 filter
     *
     * @param bool ES bool 构建器
     * @param acl  ACL 上下文
     */
    public static void appendDocumentAclFilter(BoolQuery.Builder bool, SearchAclContext acl) {
        appendAclFilter(bool, acl, "isPublic", "creatorId", "teamId", true);
    }

    /**
     * 为 chunk 索引（snake_case）追加可见性 filter
     *
     * @param bool ES bool 构建器
     * @param acl  ACL 上下文
     */
    public static void appendChunkAclFilter(BoolQuery.Builder bool, SearchAclContext acl) {
        appendAclFilter(bool, acl, "is_public", "author_id", "team_id", true);
    }

    /**
     * 根据文档级 ES _source 判定是否可见
     *
     * @param source 文档索引 source
     * @param acl    ACL 上下文
     * @return 是否可见
     */
    public static boolean isDocumentSourceVisible(Map<String, Object> source, SearchAclContext acl) {
        if (source == null) {
            return false;
        }
        Boolean isPublic = toBoolean(source.get("isPublic"));
        Long creatorId = toLong(source.get("creatorId"));
        if (creatorId == null) {
            creatorId = toLong(source.get("authorId"));
        }
        Long teamId = toLong(source.get("teamId"));
        Long userId = acl != null ? acl.userId() : null;
        List<Long> teamIds = acl != null ? acl.teamIds() : List.of();
        return DocumentVisibility.isVisible(isPublic, creatorId, teamId, userId, teamIds);
    }

    /**
     * 追加 isPublic OR author OR team 的 should filter
     */
    private static void appendAclFilter(BoolQuery.Builder bool,
                                        SearchAclContext acl,
                                        String publicField,
                                        String authorField,
                                        String teamField,
                                        boolean publicAsBoolean) {
        SearchAclContext ctx = acl != null ? acl : SearchAclContext.anonymous();
        bool.filter(f -> f.bool(inner -> {
            if (publicAsBoolean) {
                inner.should(sh -> sh.term(t -> t.field(publicField).value(true)));
            } else {
                inner.should(sh -> sh.term(t -> t.field(publicField).value(1)));
            }
            if (ctx.userId() != null) {
                Long userId = ctx.userId();
                inner.should(sh -> sh.term(t -> t.field(authorField).value(userId)));
            }
            if (ctx.teamIds() != null && !ctx.teamIds().isEmpty()) {
                List<FieldValue> values = ctx.teamIds().stream()
                        .filter(Objects::nonNull)
                        .map(FieldValue::of)
                        .collect(Collectors.toList());
                if (!values.isEmpty()) {
                    inner.should(sh -> sh.terms(t -> t.field(teamField).terms(tv -> tv.value(values))));
                }
            }
            inner.minimumShouldMatch("1");
            return inner;
        }));
    }

    /**
     * 解析布尔字段（兼容 Boolean / Number / String）
     */
    private static Boolean toBoolean(Object value) {
        if (value == null) {
            return false;
        }
        if (value instanceof Boolean b) {
            return b;
        }
        if (value instanceof Number n) {
            return n.intValue() == 1;
        }
        String s = value.toString().trim();
        return "true".equalsIgnoreCase(s) || "1".equals(s);
    }

    /**
     * 解析 Long 字段
     */
    private static Long toLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number n) {
            return n.longValue();
        }
        try {
            return Long.parseLong(value.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
