package com.knowledge.base.file.storage;

import lombok.Data;

/**
 * 断点续传会话元数据（对外只读视图）。
 *
 * <p><b>注意：</b>会话保存在 JVM 内存中，服务重启或多实例部署时不可续传；
 * 后续可迁移至 Redis。</p>
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
@Data
public class ResumableUploadSession {

    /** 会话 ID */
    private String sessionId;

    /** S3 multipart uploadId */
    private String uploadId;

    /** 对象存储相对路径 */
    private String relativePath;

    /** 文件总大小（字节） */
    private long totalSize;

    /** 分片总数 */
    private int chunkCount;

    /** 文件内容 SHA-256 十六进制摘要 */
    private String fileHash;

    /** 原始文件名 */
    private String fileName;

    /** MIME 类型（可选） */
    private String contentType;
}
