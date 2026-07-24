package com.knowledge.base.file.storage;

import com.knowledge.base.common.exception.BusinessException;
import com.knowledge.base.file.config.FileStorageProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * S3 兼容对象存储实现
 *
 * <p>基于 AWS S3 SDK，适用于 MinIO、RustFS、阿里云 OSS（S3 兼容模式）等对象存储。</p>
 * <p><b>断点续传注意：</b>{@code uploadSessions} 存于 JVM 内存，服务重启或多实例
 * 部署时不可续传；后续可迁移至 Redis。</p>
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
@Slf4j
@Component("s3FileStorage")
@ConditionalOnExpression("'${file.storage.type:s3}' == 's3' || '${file.storage.type:s3}' == 'rustfs'")
public class S3FileStorage implements ResumableFileStorage {

    private final S3Client s3Client;
    private final FileStorageProperties storageProperties;

    private final Map<String, UploadSession> uploadSessions = new ConcurrentHashMap<>();

    /**
     * 构造 S3 文件存储实例
     *
     * @param s3Client           S3 客户端
     * @param storageProperties  存储配置
     */
    public S3FileStorage(S3Client s3Client, FileStorageProperties storageProperties) {
        this.s3Client = s3Client;
        this.storageProperties = storageProperties;
    }

    private String getBucketName() {
        return storageProperties.getEffectiveS3().getBucketName();
    }

    /** {@inheritDoc} */
    /**
     * 上传。
     */
    @Override
    public boolean upload(InputStream inputStream, String relativePath, long fileSize) {
        try {
            String bucketName = getBucketName();
            log.debug("Uploading file to S3: bucket={}, path={}, size={}", bucketName, relativePath, fileSize);

            s3Client.putObject(PutObjectRequest.builder()
                            .bucket(bucketName)
                            .key(relativePath)
                            .build(),
                    RequestBody.fromInputStream(inputStream, fileSize));
            return true;
        } catch (S3Exception e) {
            log.error("Failed to upload file to S3: {}", relativePath, e);
            return false;
        }
    }

    /** {@inheritDoc} */
    /**
     * 下载。
     */
    @Override
    public long download(String relativePath, OutputStream outputStream) {
        try {
            String bucketName = getBucketName();
            log.debug("Downloading file from S3: bucket={}, path={}", bucketName, relativePath);

            ResponseInputStream<GetObjectResponse> response = s3Client.getObject(GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(relativePath)
                    .build());
            return response.transferTo(outputStream);
        } catch (IOException | S3Exception e) {
            log.error("Failed to download file from S3: {}", relativePath, e);
            return -1;
        }
    }

    /** {@inheritDoc} */
    /**
     * 获取InputStream。
     */
    @Override
    public InputStream getInputStream(String relativePath) {
        try {
            String bucketName = getBucketName();
            log.debug("Getting input stream from S3: bucket={}, path={}", bucketName, relativePath);

            return s3Client.getObject(GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(relativePath)
                    .build());
        } catch (S3Exception e) {
            log.error("Failed to get input stream from S3: {}", relativePath, e);
            return null;
        }
    }

    /** {@inheritDoc} */
    /**
     * 删除。
     */
    @Override
    public boolean delete(String relativePath) {
        try {
            String bucketName = getBucketName();
            log.debug("Deleting file from S3: bucket={}, path={}", bucketName, relativePath);

            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(relativePath)
                    .build());
            return true;
        } catch (S3Exception e) {
            log.error("Failed to delete file from S3: {}", relativePath, e);
            return false;
        }
    }

    /** {@inheritDoc} */
    /**
     * exists 方法。
     */
    @Override
    public boolean exists(String relativePath) {
        try {
            String bucketName = getBucketName();
            s3Client.headObject(HeadObjectRequest.builder()
                    .bucket(bucketName)
                    .key(relativePath)
                    .build());
            return true;
        } catch (NoSuchKeyException e) {
            log.debug("File not found in S3: {}", relativePath);
            return false;
        } catch (S3Exception e) {
            log.error("Error checking file existence in S3: {}", relativePath, e);
            return false;
        }
    }

    /** {@inheritDoc} */
    /**
     * 获取FileSize。
     */
    @Override
    public long getFileSize(String relativePath) {
        try {
            String bucketName = getBucketName();
            HeadObjectResponse response = s3Client.headObject(HeadObjectRequest.builder()
                    .bucket(bucketName)
                    .key(relativePath)
                    .build());
            return response.contentLength();
        } catch (S3Exception e) {
            log.error("Failed to get file size from S3: {}", relativePath, e);
            return -1;
        }
    }

    /**
     * 通过 ListObjectsV2 累加桶内对象大小（RustFS / MinIO / S3 通用）。
     *
     * @return 已用字节；失败返回 -1
     */
    /**
     * estimateUsedBytes 方法。
     */
    @Override
    public long estimateUsedBytes() {
        try {
            String bucketName = getBucketName();
            long total = 0L;
            String continuation = null;
            do {
                ListObjectsV2Request.Builder builder = ListObjectsV2Request.builder()
                        .bucket(bucketName)
                        .maxKeys(1000);
                if (continuation != null) {
                    builder.continuationToken(continuation);
                }
                ListObjectsV2Response response = s3Client.listObjectsV2(builder.build());
                for (S3Object obj : response.contents()) {
                    if (obj.size() != null) {
                        total += obj.size();
                    }
                }
                continuation = Boolean.TRUE.equals(response.isTruncated())
                        ? response.nextContinuationToken()
                        : null;
            } while (continuation != null);
            return total;
        } catch (Exception e) {
            log.warn("S3 ListObjects 估算用量失败：{}", e.getMessage());
            return -1L;
        }
    }

    /** {@inheritDoc} */
    /**
     * 获取StorageType。
     */
    @Override
    public String getStorageType() {
        return "s3";
    }

    /** {@inheritDoc} */
    /**
     * 初始化ResumableUpload。
     */
    @Override
    public void initResumableUpload(String sessionId, String relativePath, long totalSize, int chunkCount,
                                    String fileHash, String fileName, String contentType) {
        log.debug("Init resumable upload: sessionId={}, path={}, size={}, chunks={}, fileHash={}, fileName={}",
                sessionId, relativePath, totalSize, chunkCount, fileHash, fileName);

        CreateMultipartUploadResponse response = s3Client.createMultipartUpload(CreateMultipartUploadRequest.builder()
                .bucket(getBucketName())
                .key(relativePath)
                .build());

        UploadSession session = new UploadSession();
        session.setUploadId(response.uploadId());
        session.setRelativePath(relativePath);
        session.setTotalSize(totalSize);
        session.setChunkCount(chunkCount);
        session.setFileHash(fileHash);
        session.setFileName(fileName);
        session.setContentType(contentType);
        session.setUploadedParts(new HashSet<>());
        uploadSessions.put(sessionId, session);

        log.info("Resumable upload session created: sessionId={}, uploadId={}", sessionId, response.uploadId());
    }

    /**
     * 按会话 ID 查找内存中的上传会话，不存在则抛业务异常。
     *
     * @param sessionId 会话 ID
     * @return 会话实体
     */
    private UploadSession requireSession(String sessionId) {
        UploadSession session = uploadSessions.get(sessionId);
        if (session == null) {
            throw new BusinessException("上传会话不存在或已过期: " + sessionId);
        }
        return session;
    }

    /** {@inheritDoc} */
    /**
     * 获取UploadSession。
     */
    @Override
    public ResumableUploadSession getUploadSession(String sessionId) {
        UploadSession session = requireSession(sessionId);
        ResumableUploadSession view = new ResumableUploadSession();
        view.setSessionId(sessionId);
        view.setUploadId(session.getUploadId());
        view.setRelativePath(session.getRelativePath());
        view.setTotalSize(session.getTotalSize());
        view.setChunkCount(session.getChunkCount());
        view.setFileHash(session.getFileHash());
        view.setFileName(session.getFileName());
        view.setContentType(session.getContentType());
        return view;
    }

    /** {@inheritDoc} */
    /**
     * 上传Chunk。
     */
    @Override
    public boolean uploadChunk(String sessionId, int chunkIndex, InputStream inputStream, long chunkSize) {
        UploadSession session = requireSession(sessionId);

        try {
            int partNumber = chunkIndex + 1;
            UploadPartResponse response = s3Client.uploadPart(UploadPartRequest.builder()
                            .bucket(getBucketName())
                            .key(session.getRelativePath())
                            .uploadId(session.getUploadId())
                            .partNumber(partNumber)
                            .build(),
                    RequestBody.fromInputStream(inputStream, chunkSize));

            session.getUploadedParts().add(chunkIndex);
            session.getPartEtags().put(partNumber, response.eTag());
            log.info("Chunk uploaded: sessionId={}, chunkIndex={}", sessionId, chunkIndex);
            return true;
        } catch (S3Exception e) {
            log.error("Chunk upload failed: {}", e.getMessage(), e);
            throw new RuntimeException("Chunk upload failed: " + e.getMessage(), e);
        }
    }

    /** {@inheritDoc} */
    /**
     * 获取UploadedChunks。
     */
    @Override
    public int[] getUploadedChunks(String sessionId) {
        UploadSession session = requireSession(sessionId);

        try {
            ListPartsResponse response = s3Client.listParts(ListPartsRequest.builder()
                    .bucket(getBucketName())
                    .key(session.getRelativePath())
                    .uploadId(session.getUploadId())
                    .build());

            Set<Integer> uploadedChunks = new HashSet<>();
            Map<Integer, String> partEtags = new HashMap<>();
            for (Part part : response.parts()) {
                uploadedChunks.add(part.partNumber() - 1);
                partEtags.put(part.partNumber(), part.eTag());
            }
            session.getUploadedParts().clear();
            session.getUploadedParts().addAll(uploadedChunks);
            session.getPartEtags().putAll(partEtags);

            int[] result = uploadedChunks.stream().mapToInt(Integer::intValue).toArray();
            Arrays.sort(result);
            return result;
        } catch (S3Exception e) {
            log.error("Failed to list uploaded chunks: {}", e.getMessage(), e);
            int[] result = session.getUploadedParts().stream().mapToInt(Integer::intValue).toArray();
            Arrays.sort(result);
            return result;
        }
    }

    /** {@inheritDoc} */
    /**
     * 合并Chunks。
     */
    @Override
    public boolean mergeChunks(String sessionId) {
        UploadSession session = requireSession(sessionId);

        try {
            getUploadedChunks(sessionId);

            List<CompletedPart> completedParts = new ArrayList<>();
            for (Integer chunkIndex : session.getUploadedParts()) {
                int partNumber = chunkIndex + 1;
                String eTag = session.getPartEtags().get(partNumber);
                if (eTag == null) {
                    throw new RuntimeException("Missing ETag for part: " + partNumber);
                }
                completedParts.add(CompletedPart.builder()
                        .partNumber(partNumber)
                        .eTag(eTag)
                        .build());
            }
            completedParts.sort(Comparator.comparingInt(CompletedPart::partNumber));

            s3Client.completeMultipartUpload(CompleteMultipartUploadRequest.builder()
                    .bucket(getBucketName())
                    .key(session.getRelativePath())
                    .uploadId(session.getUploadId())
                    .multipartUpload(CompletedMultipartUpload.builder()
                            .parts(completedParts)
                            .build())
                    .build());

            uploadSessions.remove(sessionId);
            log.info("Multipart upload completed: sessionId={}, path={}", sessionId, session.getRelativePath());
            return true;
        } catch (S3Exception e) {
            log.error("Multipart merge failed: {}", e.getMessage(), e);
            throw new RuntimeException("Multipart merge failed: " + e.getMessage(), e);
        }
    }

    /**
     * 分片上传会话（JVM 内存；含合并所需的文件元数据）
     */
    private static class UploadSession {
        private String uploadId;
        private String relativePath;
        private long totalSize;
        private int chunkCount;
        private String fileHash;
        private String fileName;
        private String contentType;
        private Set<Integer> uploadedParts = new HashSet<>();
        private Map<Integer, String> partEtags = new HashMap<>();

        /**
         * 获取UploadId。
         */
        public String getUploadId() {
            return uploadId;
        }

        /**
         * setUploadId 方法。
         */
        public void setUploadId(String uploadId) {
            this.uploadId = uploadId;
        }

        /**
         * 获取RelativePath。
         */
        public String getRelativePath() {
            return relativePath;
        }

        /**
         * setRelativePath 方法。
         */
        public void setRelativePath(String relativePath) {
            this.relativePath = relativePath;
        }

        /**
         * 获取TotalSize。
         */
        public long getTotalSize() {
            return totalSize;
        }

        /**
         * setTotalSize 方法。
         */
        public void setTotalSize(long totalSize) {
            this.totalSize = totalSize;
        }

        /**
         * 获取ChunkCount。
         */
        public int getChunkCount() {
            return chunkCount;
        }

        /**
         * setChunkCount 方法。
         */
        public void setChunkCount(int chunkCount) {
            this.chunkCount = chunkCount;
        }

        /**
         * 获取FileHash。
         */
        public String getFileHash() {
            return fileHash;
        }

        /**
         * setFileHash 方法。
         */
        public void setFileHash(String fileHash) {
            this.fileHash = fileHash;
        }

        /**
         * 获取FileName。
         */
        public String getFileName() {
            return fileName;
        }

        /**
         * setFileName 方法。
         */
        public void setFileName(String fileName) {
            this.fileName = fileName;
        }

        /**
         * 获取ContentType。
         */
        public String getContentType() {
            return contentType;
        }

        /**
         * setContentType 方法。
         */
        public void setContentType(String contentType) {
            this.contentType = contentType;
        }

        /**
         * 获取UploadedParts。
         */
        public Set<Integer> getUploadedParts() {
            return uploadedParts;
        }

        /**
         * setUploadedParts 方法。
         */
        public void setUploadedParts(Set<Integer> uploadedParts) {
            this.uploadedParts = uploadedParts;
        }

        public Map<Integer, String> getPartEtags() {
            return partEtags;
        }

        /**
         * setPartEtags 方法。
         */
        public void setPartEtags(Map<Integer, String> partEtags) {
            this.partEtags = partEtags;
        }
    }
}
