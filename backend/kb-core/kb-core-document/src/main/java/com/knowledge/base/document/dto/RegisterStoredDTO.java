package com.knowledge.base.document.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * 按内容哈希登记文件管理元数据请求。
 *
 * <p>用于秒传命中或分片 merge 后登记 {@code FileMetadata}。
 * {@code fileUrl} 可选且<strong>服务端忽略</strong>，存储绑定以 kb-file check-hash 结果为准。</p>
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "按内容哈希登记文件管理元数据")
public class RegisterStoredDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 已废弃：客户端可传但服务端忽略，禁止用于存储绑定。
     */
    @Schema(description = "已忽略：客户端 fileUrl 不参与存储绑定", requiredMode = Schema.RequiredMode.NOT_REQUIRED)
    private String fileUrl;

    /**
     * 原始文件名
     */
    @Schema(description = "原始文件名", requiredMode = Schema.RequiredMode.REQUIRED)
    private String originalFileName;

    /**
     * 客户端文件大小（可选；若提供则须与 kb-file 一致）
     */
    @Schema(description = "文件大小（字节，可选；与已存不一致则拒绝）")
    private Long fileSize;

    /**
     * MIME 类型（可选；优先使用 kb-file 返回的 mimeType）
     */
    @Schema(description = "MIME 类型")
    private String contentType;

    /**
     * 文件内容 SHA-256（64 位小写 hex）
     */
    @Schema(description = "文件 SHA-256（64 hex）", requiredMode = Schema.RequiredMode.REQUIRED)
    private String fileSha256;

    /**
     * 是否公开
     */
    @Schema(description = "是否公开")
    private Boolean isPublic;
}
