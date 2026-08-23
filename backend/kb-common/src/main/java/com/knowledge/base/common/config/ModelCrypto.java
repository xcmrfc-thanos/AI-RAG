package com.knowledge.base.common.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * 模型凭证 AES-GCM 加解密工具。
 *
 * <p>算法：AES-256-GCM，随机 12 字节 IV + 16 字节认证 tag。</p>
 *
 * <p>密文格式：{@code enc:v1:<Base64(IV)>:<Base64(ciphertext+tag)>}</p>
 *
 * <p>密钥：由 {@link EncryptKeyProvider} 返回的任意长度字符串派生
 * （UTF-8 字节 SHA-256 得到 32 字节）；密钥缺失时加密直接抛异常（调用方拒写），
 * 解密无 {@code enc:v1:} 前缀时按旧明文透传。</p>
 *
 * <p>明文仅存在于内存，禁止写入日志 / Redis / MQ；列表回显一律使用
 * {@link #mask(String)} 掩码。</p>
 *
 * @author 苏三
 * @since 1.1.0
 */
@Slf4j
@Component
public class ModelCrypto {

    /** 密文版本前缀 */
    public static final String PREFIX = "enc:v1:";

    private static final int IV_LENGTH = 12;
    private static final int TAG_BITS = 128;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final EncryptKeyProvider encryptKeyProvider;

    public ModelCrypto(EncryptKeyProvider encryptKeyProvider) {
        this.encryptKeyProvider = encryptKeyProvider;
    }

    /**
     * 加密明文（api_key 等）。
     *
     * @param plaintext 明文
     * @return {@code enc:v1:...} 密文
     * @throws IllegalStateException 加密密钥未配置时抛异常，调用方应拒绝落库
     */
    public String encrypt(String plaintext) {
        if (plaintext == null || plaintext.isEmpty()) {
            return plaintext;
        }
        try {
            byte[] iv = new byte[IV_LENGTH];
            SECURE_RANDOM.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, secretKey(), new GCMParameterSpec(TAG_BITS, iv));
            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            return PREFIX + Base64.getEncoder().encodeToString(iv) + ":"
                    + Base64.getEncoder().encodeToString(ciphertext);
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("模型凭证加密失败", e);
        }
    }

    /**
     * 解密。无 {@code enc:v1:} 前缀的输入按未加密旧数据原样返回（兼容透传）；
     * 前缀存在但格式/认证失败时抛异常，避免静默使用错误密钥。
     *
     * @param stored 密文或明文
     * @return 明文
     */
    public String decrypt(String stored) {
        if (stored == null || !stored.startsWith(PREFIX)) {
            return stored;
        }
        try {
            String body = stored.substring(PREFIX.length());
            int sep = body.indexOf(':');
            if (sep <= 0) {
                throw new IllegalArgumentException("密文格式非法，缺少 IV/密文分隔");
            }
            byte[] iv = Base64.getDecoder().decode(body.substring(0, sep));
            byte[] ciphertext = Base64.getDecoder().decode(body.substring(sep + 1));
            if (iv.length != IV_LENGTH) {
                throw new IllegalArgumentException("密文 IV 长度非法");
            }
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, secretKey(), new GCMParameterSpec(TAG_BITS, iv));
            return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("模型凭证解密失败（密钥不一致或数据被篡改）", e);
        }
    }

    /**
     * 生成掩码提示（前 3 + 后 4），列表回显专用。
     *
     * <p>示例：{@code sk-abc12345def} → {@code sk-****cdef}；
     * 长度不足 8 时全部掩码为 {@code ****}。</p>
     */
    public static String mask(String plaintext) {
        if (plaintext == null || plaintext.isEmpty()) {
            return "";
        }
        if (plaintext.length() < 8) {
            return "****";
        }
        return plaintext.substring(0, 3) + "****" + plaintext.substring(plaintext.length() - 4);
    }

    /**
     * 判断是否为模型库密文格式。
     */
    public static boolean isEncrypted(String stored) {
        return stored != null && stored.startsWith(PREFIX);
    }

    /**
     * 派生 32 字节密钥：任意长度字符串 UTF-8 字节 SHA-256。
     */
    private SecretKeySpec secretKey() {
        String key = encryptKeyProvider.resolveEncryptKey();
        if (key == null || key.isBlank()) {
            throw new IllegalStateException("模型凭证加密密钥未配置（kb.security.encrypt-key），拒绝加解密");
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] keyBytes = digest.digest(key.getBytes(StandardCharsets.UTF_8));
            return new SecretKeySpec(keyBytes, "AES");
        } catch (Exception e) {
            throw new IllegalStateException("模型凭证加密密钥派生失败", e);
        }
    }
}
