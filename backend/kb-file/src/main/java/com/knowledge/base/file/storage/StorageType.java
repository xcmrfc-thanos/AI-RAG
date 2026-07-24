package com.knowledge.base.file.storage;

/**
 * 存储类型枚举
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
public enum StorageType {

    /**
     * S3 兼容对象存储（MinIO / RustFS / OSS S3 模式等）
     */
    S3("s3", "s3FileStorage");

    private final String code;
    private final String beanName;

    StorageType(String code, String beanName) {
        this.code = code;
        this.beanName = beanName;
    }

    /**
     * 获取Code。
     */
    public String getCode() {
        return code;
    }

    /**
     * 获取BeanName。
     */
    public String getBeanName() {
        return beanName;
    }

    /**
     * 根据配置代码解析存储类型
     *
     * @param code 配置值（s3 或兼容旧值 rustfs）
     * @return 存储类型
     */
    public static StorageType fromCode(String code) {
        if (code == null || code.isBlank()) {
            return S3;
        }
        if ("rustfs".equalsIgnoreCase(code)) {
            return S3;
        }
        for (StorageType type : values()) {
            if (type.code.equalsIgnoreCase(code)) {
                return type;
            }
        }
        return S3;
    }
}
