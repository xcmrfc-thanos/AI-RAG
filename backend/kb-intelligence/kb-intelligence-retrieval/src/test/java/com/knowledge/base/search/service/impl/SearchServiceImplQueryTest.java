package com.knowledge.base.search.service.impl;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class SearchServiceImplQueryTest {

    @Test
    void idsStringQueryContainsOnlyQueryClause() {
        String query = SearchServiceImpl.buildIdsQueryClause(List.of("101", "202"));

        assertEquals("{\"terms\":{\"_id\":[\"101\",\"202\"]}}", query);
    }

    @Test
    void keywordSearchRequiresHalfOfAnalyzedTerms() {
        assertEquals("50%", SearchServiceImpl.minimumTermCoverage());
    }
}
