package com.knowledge.base.foundation.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.knowledge.base.common.result.Result;
import com.knowledge.base.foundation.dto.ModelProviderDTO;
import com.knowledge.base.foundation.dto.ModelTestDTO;
import com.knowledge.base.foundation.service.ModelProviderService;
import com.knowledge.base.foundation.vo.ModelOptionVO;
import com.knowledge.base.foundation.vo.ModelProviderVO;
import com.knowledge.base.foundation.vo.ModelTypeVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 模型管理接口（第8阶段模型库）。
 *
 * <p>场景下拉（GET /config/models?type=xxx）仅登录即可用；
 * 写操作与列表需 {@code system:settings} 权限（新菜单挂系统组）。</p>
 *
 * @author 苏三
 * @since 1.1.0
 */
@RestController
@RequestMapping("/config/models")
@Tag(name = "模型管理", description = "第8阶段模型库：提供方 CRUD / 场景下拉 / 连通测试")
public class ModelProviderController {

    @Resource
    private ModelProviderService modelProviderService;

    /**
     * 模型类型枚举。
     */
    @GetMapping("/types")
    @Operation(summary = "模型类型枚举", description = "chat/embedding/rerank/tts/stt/image/other + 中文名")
    public Result<List<ModelTypeVO>> listTypes() {
        return Result.success(modelProviderService.listTypes());
    }

    /**
     * 场景下拉（不含密钥）。
     */
    @GetMapping
    @Operation(summary = "场景下拉", description = "指定类型启用模型列表，返回 key/value/label/isDefault/providerKey")
    public Result<List<ModelOptionVO>> listForScene(@RequestParam String type) {
        return Result.success(modelProviderService.listForScene(type));
    }

    /**
     * 管理列表（含 api_key_hint）。
     */
    @GetMapping("/page")
    @PreAuthorize("hasAuthority('system:settings')")
    @Operation(summary = "模型管理分页", description = "管理列表，凭证仅出掩码提示")
    public Result<IPage<ModelProviderVO>> page(
            @RequestParam(defaultValue = "1") Long current,
            @RequestParam(defaultValue = "10") Long size,
            @RequestParam(required = false) String keyword) {
        return Result.success(modelProviderService.page(current, size, keyword));
    }

    /**
     * 新增提供方（api_key 加密落库）。
     */
    @PostMapping
    @PreAuthorize("hasAuthority('system:settings')")
    @Operation(summary = "新增模型提供方", description = "api_key 经 AES-GCM 加密后落库，只存掩码提示")
    public Result<Long> create(@Valid @RequestBody ModelProviderDTO dto) {
        return Result.success("模型提供方已创建", modelProviderService.create(dto));
    }

    /**
     * 更新提供方（api_key 为空 = 不修改）。
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('system:settings')")
    @Operation(summary = "更新模型提供方", description = "api_key 为空表示不修改；模型条目全量替换")
    public Result<Boolean> update(@PathVariable Long id, @Valid @RequestBody ModelProviderDTO dto) {
        modelProviderService.update(id, dto);
        return Result.success("模型提供方已更新", true);
    }

    /**
     * 删除提供方（软删）。
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('system:settings')")
    @Operation(summary = "删除模型提供方", description = "逻辑删除提供方及其模型条目")
    public Result<Boolean> delete(@PathVariable Long id) {
        modelProviderService.delete(id);
        return Result.success("模型提供方已删除", true);
    }

    /**
     * 连通性测试。
     */
    @PostMapping("/test")
    @PreAuthorize("hasAuthority('system:settings')")
    @Operation(summary = "连通性测试", description = "临时解密调用 /chat/completions 或 /embeddings")
    public Result<String> test(@Valid @RequestBody ModelTestDTO dto) {
        return Result.success(modelProviderService.testConnection(dto));
    }
}
