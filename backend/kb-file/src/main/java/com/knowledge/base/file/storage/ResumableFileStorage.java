package com.knowledge.base.file.storage;

import java.io.InputStream;

/**
 * 支持 S3 分片上传的存储接口
 *
 * <p>在 {@link FileStorage} 基础上扩展断点续传能力，由 S3 兼容对象存储实现。</p>
 * <p><b>注意：</b>会话保存在 JVM 内存中，服务重启或多实例部署时不可续传；
 * 后续可迁移至 Redis。</p>
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
public interface ResumableFileStorage extends FileStorage {

    /**
     * 初始化断点续传会话，并将文件元数据写入会话。
     *
     * @param sessionId    会话 ID
     * @param relativePath 对象存储相对路径
     * @param totalSize    文件总大小
     * @param chunkCount   分块数量
     * @param fileHash     文件 SHA-256 哈希
     * @param fileName     原始文件名
     * @param contentType  MIME 类型（可为 null）
     */
    void initResumableUpload(String sessionId, String relativePath, long totalSize, int chunkCount,
                             String fileHash, String fileName, String contentType);

    /**
     * 获取会话元数据（合并前读取；合并成功后会话会被移除）。
     *
     * @param sessionId 会话 ID
     * @return 会话元数据
     */
    ResumableUploadSession getUploadSession(String sessionId);

    /**
     * 上传单个分块
     *
     * @param sessionId   会话 ID
     * @param chunkIndex  分块索引（从 0 开始）
     * @param inputStream 分块数据流
     * @param chunkSize   分块大小
     * @return 是否上传成功
     */
    boolean uploadChunk(String sessionId, int chunkIndex, InputStream inputStream, long chunkSize);

    /**
     * 获取已上传的分块索引列表
     *
     * @param sessionId 会话 ID
     * @return 已上传分块索引数组
     */
    int[] getUploadedChunks(String sessionId);

    /**
     * 合并所有分块为完整对象
     *
     * @param sessionId 会话 ID
     * @return 是否合并成功
     */
    boolean mergeChunks(String sessionId);
}
