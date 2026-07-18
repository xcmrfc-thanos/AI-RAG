package com.knowledge.base.common.utils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

/**
 * 内部服务调用 HMAC-SHA256 签名工具
 *
 * <p>签名串固定为 {@code METHOD + "\n" + PATH + "\n" + TIMESTAMP + "\n" + SERVICE}，
 * 时间戳为 Unix 秒；校验允许配置的时钟偏差。</p>
 *
 * @author AI-RAG
 * @since 1.0.0
 */
public final class InternalServiceHmacUtil {

    private static final String HMAC_SHA256 = "HmacSHA256";

    private InternalServiceHmacUtil() {
    }

    /**
     * 构造待签名原文
     *
     * @param method    HTTP 方法（将规范为大写）
     * @param path      请求路径（不含 query）
     * @param timestamp Unix 秒时间戳字符串
     * @param service   调用方服务名
     * @return 签名原文
     */
    public static String buildPayload(String method, String path, String timestamp, String service) {
        return method.toUpperCase() + "\n" + path + "\n" + timestamp + "\n" + service;
    }

    /**
     * 计算 HMAC-SHA256 十六进制签名（小写）
     *
     * @param secret    共享密钥（UTF-8）
     * @param method    HTTP 方法
     * @param path      请求路径
     * @param timestamp Unix 秒时间戳
     * @param service   服务名
     * @return 小写 hex 签名
     */
    public static String sign(String secret, String method, String path, String timestamp, String service) {
        try {
            Mac mac = Mac.getInstance(HMAC_SHA256);
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_SHA256));
            byte[] digest = mac.doFinal(
                    buildPayload(method, path, timestamp, service).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException("内部调用 HMAC 签名失败", e);
        }
    }

    /**
     * 校验签名与时间窗
     *
     * @param secret           共享密钥
     * @param method           HTTP 方法
     * @param path             请求路径
     * @param timestamp        调用方时间戳（Unix 秒）
     * @param service          服务名
     * @param signature        调用方签名（hex）
     * @param nowEpochSeconds  当前时间（Unix 秒）
     * @param maxSkewSeconds   允许偏差秒数
     * @return 是否通过
     */
    public static boolean verify(String secret, String method, String path, String timestamp,
                                 String service, String signature, long nowEpochSeconds,
                                 long maxSkewSeconds) {
        if (secret == null || signature == null || timestamp == null || service == null) {
            return false;
        }
        long ts;
        try {
            ts = Long.parseLong(timestamp.trim());
        } catch (NumberFormatException e) {
            return false;
        }
        if (Math.abs(nowEpochSeconds - ts) > maxSkewSeconds) {
            return false;
        }
        String expected = sign(secret, method, path, timestamp.trim(), service);
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                signature.trim().toLowerCase().getBytes(StandardCharsets.UTF_8));
    }

    /**
     * 使用主密钥或轮换中的旧密钥校验（任一通过即可）
     *
     * @param primarySecret   当前密钥
     * @param previousSecret  旧密钥（可空；轮换窗口内保留）
     * @param method          HTTP 方法
     * @param path            请求路径
     * @param timestamp       时间戳
     * @param service         服务名
     * @param signature       签名
     * @param nowEpochSeconds 当前 Unix 秒
     * @param maxSkewSeconds  允许偏差
     * @return 是否通过
     */
    public static boolean verifyWithRotation(String primarySecret,
                                             String previousSecret,
                                             String method,
                                             String path,
                                             String timestamp,
                                             String service,
                                             String signature,
                                             long nowEpochSeconds,
                                             long maxSkewSeconds) {
        if (verify(primarySecret, method, path, timestamp, service, signature,
                nowEpochSeconds, maxSkewSeconds)) {
            return true;
        }
        if (previousSecret != null && !previousSecret.isBlank()
                && !previousSecret.equals(primarySecret)) {
            return verify(previousSecret, method, path, timestamp, service, signature,
                    nowEpochSeconds, maxSkewSeconds);
        }
        return false;
    }
}
