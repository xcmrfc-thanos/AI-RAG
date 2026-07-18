package com.knowledge.base.file.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.io.Serializable;

/**
 * 断点续传初始化请求。
 *
 * <p>对应 {@code POST /files/upload/resumable/init}。会话存 JVM 内存，
 * 重启/多实例不可续传（后续可 Redis）。</p>
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
@Data
@Schema(description = "断点续传初始化请求")
public class ResumableInitDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 文件内容 SHA-256 十六进制摘要
     */
    @Schema(description = "文件 SHA-256 哈希", requiredMode = Schema.RequiredMode.REQUIRED)
    private String fileHash;

    /**
     * 原始文件名
     */
    @Schema(description = "原始文件名", requiredMode = Schema.RequiredMode.REQUIRED)
    private String fileName;

    /**
     * 文件总大小（字节）
     */
    @Schema(description = "文件总大小（字节）", requiredMode = Schema.RequiredMode.REQUIRED)
    private Long totalSize;

    /**
     * 分片总数
     */
    @Schema(description = "分片总数", requiredMode = Schema.RequiredMode.REQUIRED)
    private Integer chunkCount;

    /**
     * MIME 类型（可选）
     */
    @Schema(description = "MIME 类型")
    private String contentType;
}
