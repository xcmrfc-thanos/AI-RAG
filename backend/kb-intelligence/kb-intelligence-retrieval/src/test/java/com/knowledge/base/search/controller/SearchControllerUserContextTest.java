package com.knowledge.base.search.controller;

import com.knowledge.base.common.utils.UserContextUtil;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;

class SearchControllerUserContextTest {

    @AfterEach
    void clearContext() {
        UserContextUtil.clear();
    }

    @Test
    void bindUserContextOverwritesStaleThreadLocalUser() {
        UserContextUtil.setUserId(1000000000000000001L);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-User-Id", "1000000000000000002");
        SearchController controller = new SearchController(null, null);

        ReflectionTestUtils.invokeMethod(controller, "bindUserContext", request);

        assertEquals(1000000000000000002L, UserContextUtil.getUserId());
    }
}
