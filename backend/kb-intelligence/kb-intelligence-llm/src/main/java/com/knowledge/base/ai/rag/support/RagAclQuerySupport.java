package com.knowledge.base.ai.rag.support;

import co.elastic.clients.elasticsearch._types.FieldValue;
import co.elastic.clients.elasticsearch._types.query_dsl.BoolQuery;
import io.qdrant.client.grpc.Points.Condition;
import io.qdrant.client.grpc.Points.FieldCondition;
import io.qdrant.client.grpc.Points.Filter;
import io.qdrant.client.grpc.Points.Match;
import io.qdrant.client.grpc.Points.MinShould;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * RAG 查询期 ACL filter（ES chunk 索引 / Qdrant payload），对齐 Search DocumentVisibility
 *
 * @author AI-RAG
 * @since 1.0.0
 */
public final class RagAclQuerySupport {

    private RagAclQuerySupport() {
    }

    /**
     * 为 ES chunk 索引（snake_case）追加可见性 filter：公开 OR 作者 OR 团队
     *
     * @param bool ES bool 构建器
     * @param acl  ACL 上下文
     */
    public static void appendChunkAclFilter(BoolQuery.Builder bool, RagAclContext acl) {
        RagAclContext ctx = acl != null ? acl : RagAclContext.anonymous();
        bool.filter(f -> f.bool(inner -> {
            inner.should(sh -> sh.term(t -> t.field("is_public").value(true)));
            if (ctx.userId() != null) {
                Long userId = ctx.userId();
                inner.should(sh -> sh.term(t -> t.field("author_id").value(userId)));
            }
            if (ctx.teamIds() != null && !ctx.teamIds().isEmpty()) {
                List<FieldValue> values = ctx.teamIds().stream()
                        .filter(Objects::nonNull)
                        .map(FieldValue::of)
                        .collect(Collectors.toList());
                if (!values.isEmpty()) {
                    inner.should(sh -> sh.terms(t -> t.field("team_id").terms(tv -> tv.value(values))));
                }
            }
            inner.minimumShouldMatch("1");
            return inner;
        }));
    }

    /**
     * 构建 Qdrant payload ACL filter（公开 OR 作者 OR 团队）
     *
     * @param acl ACL 上下文
     * @return Qdrant Filter
     */
    public static Filter buildQdrantChunkAclFilter(RagAclContext acl) {
        RagAclContext ctx = acl != null ? acl : RagAclContext.anonymous();
        Filter.Builder filter = Filter.newBuilder();
        filter.addShould(Condition.newBuilder()
                .setField(FieldCondition.newBuilder()
                        .setKey("is_public")
                        .setMatch(Match.newBuilder().setBoolean(true).build())
                        .build())
                .build());
        if (ctx.userId() != null) {
            filter.addShould(Condition.newBuilder()
                    .setField(FieldCondition.newBuilder()
                            .setKey("author_id")
                            .setMatch(Match.newBuilder().setInteger(ctx.userId()).build())
                            .build())
                    .build());
        }
        if (ctx.teamIds() != null) {
            for (Long teamId : ctx.teamIds()) {
                if (teamId == null) {
                    continue;
                }
                filter.addShould(Condition.newBuilder()
                        .setField(FieldCondition.newBuilder()
                                .setKey("team_id")
                                .setMatch(Match.newBuilder().setInteger(teamId).build())
                                .build())
                        .build());
            }
        }
        filter.setMinShould(MinShould.newBuilder().setMinCount(1).build());
        return filter.build();
    }
}
