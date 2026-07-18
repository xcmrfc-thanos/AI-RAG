package com.knowledge.base.file.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 断点续传合并请求。
 *
 * <p>在 {@link FileUploadDTO} 基础上增加 fileName/fileHash，供与会话元数据冗余校验。
 * 合并仍以会话内存储的元数据为准。</p>
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "断点续传合并请求")
public class ResumableMergeDTO extends FileUploadDTO {

    private static final long serialVersionUID = 1L;

    /**
     * 原始文件名（可选，与会话冗余校验）
     */
    @Schema(description = "原始文件名（可选，与会话冗余校验）")
    private String fileName;

    /**
     * 文件 SHA-256 哈希（可选，与会话冗余校验）
     */
    @Schema(description = "文件 SHA-256 哈希（可选，与会话冗余校验）")
    private String fileHash;
}
