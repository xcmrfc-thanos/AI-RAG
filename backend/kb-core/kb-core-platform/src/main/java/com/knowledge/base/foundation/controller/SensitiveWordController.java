package com.knowledge.base.foundation.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.knowledge.base.common.result.Result;
import com.knowledge.base.foundation.dto.SensitiveCheckResult;
import com.knowledge.base.foundation.entity.SensitiveHomophone;
import com.knowledge.base.foundation.entity.SensitiveRegex;
import com.knowledge.base.foundation.entity.SensitiveWord;
import com.knowledge.base.foundation.service.SensitiveWordService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import lombok.Data;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * 敏感词管理与试检测接口。
 */
@RestController
@RequestMapping("/sensitive-words")
@Tag(name = "敏感词管理", description = "L1 词库 + L1.5 正则/谐音")
public class SensitiveWordController {

    @Resource
    private SensitiveWordService sensitiveWordService;

    /**
     * 分页查询词条。
     */
    /**
     * 分页查询。
     */
    @GetMapping
    @Operation(summary = "分页查询敏感词")
    public Result<IPage<SensitiveWord>> page(
            @RequestParam(defaultValue = "1") Long current,
            @RequestParam(defaultValue = "20") Long size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Integer enabled) {
        return Result.success(sensitiveWordService.pageWords(current, size, keyword, category, enabled));
    }

    /**
     * 新增词条。
     */
    /**
     * 创建。
     */
    @PostMapping
    @Operation(summary = "新增敏感词")
    public Result<Boolean> create(@RequestBody SensitiveWord word) {
        return Result.success(sensitiveWordService.createWord(word));
    }

    /**
     * 更新词条。
     */
    /**
     * 更新。
     */
    @PutMapping("/{id}")
    @Operation(summary = "更新敏感词")
    public Result<Boolean> update(@PathVariable Long id, @RequestBody SensitiveWord word) {
        return Result.success(sensitiveWordService.updateWord(id, word));
    }

    /**
     * 删除词条。
     */
    /**
     * 删除。
     */
    @DeleteMapping("/{id}")
    @Operation(summary = "删除敏感词")
    public Result<Boolean> delete(@PathVariable Long id) {
        return Result.success(sensitiveWordService.deleteWord(id));
    }

    /**
     * 批量导入（每行一词）。
     */
    @PostMapping("/import")
    @Operation(summary = "批量导入敏感词")
    public Result<Map<String, Integer>> importWords(@RequestBody ImportRequest req) {
        List<String> lines = req.getText() == null ? List.of()
                : Arrays.asList(req.getText().split("\\r?\\n"));
        int n = sensitiveWordService.importWords(lines, req.getCategory(), req.getAction());
        return Result.success(Map.of("imported", n));
    }

    /**
     * 试检测。
     */
    /**
     * 检测。
     */
    @PostMapping("/check")
    @Operation(summary = "试检测文本")
    public Result<SensitiveCheckResult> check(@RequestBody CheckRequest req) {
        return Result.success(sensitiveWordService.check(req.getText()));
    }

    /**
     * 重载内存引擎。
     */
    /**
     * 重载。
     */
    @PostMapping("/reload")
    @Operation(summary = "重载敏感词引擎")
    public Result<Boolean> reload() {
        sensitiveWordService.reload();
        return Result.success(true);
    }

    /**
     * 正则列表。
     */
    /**
     * 列表查询Regex。
     */
    @GetMapping("/regex")
    @Operation(summary = "正则规则列表")
    public Result<List<SensitiveRegex>> listRegex() {
        return Result.success(sensitiveWordService.listRegex());
    }

    /**
     * 保存正则。
     */
    /**
     * 保存Regex。
     */
    @PostMapping("/regex")
    @Operation(summary = "保存正则规则")
    public Result<Boolean> saveRegex(@RequestBody SensitiveRegex regex) {
        return Result.success(sensitiveWordService.saveRegex(regex));
    }

    /**
     * 删除正则。
     */
    /**
     * 删除Regex。
     */
    @DeleteMapping("/regex/{id}")
    @Operation(summary = "删除正则规则")
    public Result<Boolean> deleteRegex(@PathVariable Long id) {
        return Result.success(sensitiveWordService.deleteRegex(id));
    }

    /**
     * 谐音列表。
     */
    /**
     * 列表查询Homophones。
     */
    @GetMapping("/homophones")
    @Operation(summary = "谐音映射列表")
    public Result<List<SensitiveHomophone>> listHomophones() {
        return Result.success(sensitiveWordService.listHomophones());
    }

    /**
     * 保存谐音。
     */
    /**
     * 保存Homophone。
     */
    @PostMapping("/homophones")
    @Operation(summary = "保存谐音映射")
    public Result<Boolean> saveHomophone(@RequestBody SensitiveHomophone row) {
        return Result.success(sensitiveWordService.saveHomophone(row));
    }

    /**
     * 删除谐音。
     */
    /**
     * 删除Homophone。
     */
    @DeleteMapping("/homophones/{id}")
    @Operation(summary = "删除谐音映射")
    public Result<Boolean> deleteHomophone(@PathVariable Long id) {
        return Result.success(sensitiveWordService.deleteHomophone(id));
    }

    /**
     * 批量导入请求体。
     */
    @Data
    public static class ImportRequest {
        /** 多行文本，每行一词；# 开头为注释 */
        private String text;
        /** 导入分类，默认 custom */
        private String category;
        /** 导入策略，默认 block */
        private String action;
    }

    /**
     * 试检测请求体。
     */
    @Data
    public static class CheckRequest {
        /** 待检测原文 */
        private String text;
    }
}
