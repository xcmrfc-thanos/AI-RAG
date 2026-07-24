package com.knowledge.base.file.config;

import jakarta.annotation.PostConstruct;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Arrays;
import java.util.List;

/**
 * 文件存储配置属性类
 *
 * <p>集中管理 S3 兼容对象存储相关配置。</p>
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
@Data
@Component
@ConfigurationProperties(prefix = "file.storage")
public class FileStorageProperties {

    /**
     * 存储类型：s3（兼容旧值 rustfs）
     */
    private String type = "s3";

    /**
     * S3 兼容对象存储配置
     */
    private S3 s3 = new S3();

    /**
     * 旧配置键兼容：file.storage.rustfs
     */
    @Deprecated
    private S3 rustfs = new S3();

    /**
     * 上传限制配置
     */
    private Upload upload = new Upload();

    /**
     * URL 配置
     */
    private Url url = new Url();

    /**
     * FFmpeg 配置
     */
    private Ffmpeg ffmpeg = new Ffmpeg();

    /**
     * 归一化存储类型并合并旧 rustfs 配置
     */
    /**
     * 归一化。
     */
    @PostConstruct
    public void normalize() {
        if ("rustfs".equalsIgnoreCase(type)) {
            type = "s3";
        }
        if (!isConfigured(s3) && isConfigured(rustfs)) {
            s3 = rustfs;
        }
    }

    /**
     * 获取生效的 S3 配置（优先 s3，回退 rustfs）
     *
     * @return S3 配置
     */
    public S3 getEffectiveS3() {
        if (isConfigured(s3)) {
            return s3;
        }
        if (isConfigured(rustfs)) {
            return rustfs;
        }
        return s3;
    }

    private boolean isConfigured(S3 config) {
        return config != null && StringUtils.hasText(config.getEndpoint());
    }

    @Data
    public static class S3 {
        /** 对象存储端点主机 */
        private String endpoint = "127.0.0.1";
        /** 对象存储端口 */
        private int port = 9000;
        /** 访问密钥 ID */
        private String accessKey = "";
        /** 秘密访问密钥 */
        private String secretKey = "";
        /** 是否使用 HTTPS */
        private boolean secure = false;
        /** 默认存储桶 */
        private String bucketName = "knowledge-docs";
        /** 连接超时（毫秒） */
        private int connectTimeout = 30000;
        /** 读取超时（毫秒） */
        private int readTimeout = 60000;
        /** 写入超时（毫秒） */
        private int writeTimeout = 60000;
        /** 最大连接数 */
        private int maxConnections = 50;
        /** 是否启用 */
        private boolean enabled = true;
    }

    @Data
    public static class Upload {
        private long maxSize = 2147483648L;
        private List<String> allowedTypes = Arrays.asList(
                "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
                "txt", "md",
                "png", "jpg", "jpeg", "gif", "bmp", "svg",
                "mp4", "avi", "mov", "wmv", "mkv", "webm", "flv",
                "mp3", "wav", "flac", "aac", "ogg"
        );
        private boolean enableFastUpload = true;
        private boolean calculateHash = true;
        private boolean enableResumableUpload = true;
        /** 走分片路径的文件大小上限（默认 500MB），对应 file.upload.resumable.max.size */
        private long resumableMaxSize = 524288000L;
        /** 单个分片大小（默认 5MB），对应 file.upload.chunk.size */
        private long chunkSize = 5242880L;
        /** 触发分片上传的阈值（默认 20MB），对应 file.upload.chunk.threshold */
        private long chunkThreshold = 20971520L;
    }

    @Data
    public static class Ffmpeg {
        private String path = "/usr/bin/ffmpeg";
        private String ffprobePath = "/usr/bin/ffprobe";
        private int hlsSegmentTime = 10;
        private int thumbnailTime = 5;
    }

    @Data
    public static class Url {
        private String prefix = "/api/file";
        private String previewPrefix = "/api/file/files/preview";
    }
}
