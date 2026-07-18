package com.knowledge.base.intelligence.controller;

import com.knowledge.base.graph.controller.GraphController;
import com.knowledge.base.search.controller.SearchController;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class ControllerRouteIsolationTest {

    @Test
    void graphAndDocumentSearchUseDifferentInternalPaths() throws Exception {
        RequestMapping graphBase = GraphController.class.getAnnotation(RequestMapping.class);
        RequestMapping searchBase = SearchController.class.getAnnotation(RequestMapping.class);
        Method graphSearchMethod = GraphController.class.getMethod("searchGraph", String.class);
        Method documentSearchMethod = SearchController.class.getMethod(
                "searchGet", String.class, Integer.class, Integer.class,
                jakarta.servlet.http.HttpServletRequest.class);

        assertNotNull(graphBase);
        assertNotNull(searchBase);
        String graphPath = graphBase.value()[0]
                + graphSearchMethod.getAnnotation(GetMapping.class).value()[0];
        String documentPath = searchBase.value()[0]
                + documentSearchMethod.getAnnotation(GetMapping.class).value()[0];

        assertEquals("/graph/search", graphPath);
        assertEquals("/search", documentPath);
        assertNotEquals(graphPath, documentPath);
    }
}
