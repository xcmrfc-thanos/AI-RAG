package com.knowledge.base.file.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.client.config.ClientOverrideConfiguration;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;

import java.net.URI;
import java.time.Duration;

/**
 * S3 兼容对象存储客户端配置
 *
 * <p>使用 AWS SDK 连接 MinIO、RustFS、OSS S3 兼容端点等对象存储服务。</p>
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
@Configuration
@ConditionalOnExpression("'${file.storage.type:s3}' == 's3' || '${file.storage.type:s3}' == 'rustfs'")
public class S3ClientConfig {

    private final FileStorageProperties storageProperties;

    /**
     * 构造 S3 客户端配置
     *
     * @param storageProperties 存储配置
     */
    public S3ClientConfig(FileStorageProperties storageProperties) {
        this.storageProperties = storageProperties;
    }

    /**
     * 创建 S3 客户端 Bean
     *
     * @return S3Client 实例
     */
    @Bean
    public S3Client s3Client() {
        FileStorageProperties.S3 config = storageProperties.getEffectiveS3();

        String protocol = config.isSecure() ? "https" : "http";
        URI endpointUri = URI.create(protocol + "://" + config.getEndpoint() + ":" + config.getPort());

        Duration readTimeout = Duration.ofMillis(config.getReadTimeout());
        Duration writeTimeout = Duration.ofMillis(config.getWriteTimeout());

        S3Configuration s3Config = S3Configuration.builder()
                .checksumValidationEnabled(false)
                .chunkedEncodingEnabled(true)
                .build();

        ClientOverrideConfiguration overrideConfig = ClientOverrideConfiguration.builder()
                .apiCallTimeout(readTimeout.plus(writeTimeout))
                .apiCallAttemptTimeout(readTimeout)
                .build();

        return S3Client.builder()
                .endpointOverride(endpointUri)
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(config.getAccessKey(), config.getSecretKey())
                ))
                .region(Region.of("us-east-1"))
                .serviceConfiguration(s3Config)
                .overrideConfiguration(overrideConfig)
                .build();
    }
}
