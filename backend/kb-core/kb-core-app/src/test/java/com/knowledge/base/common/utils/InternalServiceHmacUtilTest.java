package com.knowledge.base.common.utils;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * InternalServiceHmacUtil 签名与时间窗单测。
 */
class InternalServiceHmacUtilTest {

    private static final String SECRET = "ai-rag-local-dev-hmac-secret-key!!";

    /**
     * 合法签名应通过校验
     */
    @Test
    void validSignaturePasses() {
        long now = 1_700_000_000L;
        String ts = String.valueOf(now);
        String sig = InternalServiceHmacUtil.sign(SECRET, "GET", "/documents/page", ts, "kb-intelligence");
        assertTrue(InternalServiceHmacUtil.verify(
                SECRET, "GET", "/documents/page", ts, "kb-intelligence", sig, now, 60));
    }

    /**
     * 错误签名应拒绝
     */
    @Test
    void wrongSignatureRejected() {
        long now = 1_700_000_000L;
        String ts = String.valueOf(now);
        assertFalse(InternalServiceHmacUtil.verify(
                SECRET, "GET", "/documents/page", ts, "kb-intelligence", "deadbeef", now, 60));
    }

    /**
     * 超过时间窗应拒绝
     */
    @Test
    void expiredTimestampRejected() {
        long now = 1_700_000_000L;
        String ts = String.valueOf(now - 120);
        String sig = InternalServiceHmacUtil.sign(SECRET, "GET", "/documents/1", ts, "kb-intelligence");
        assertFalse(InternalServiceHmacUtil.verify(
                SECRET, "GET", "/documents/1", ts, "kb-intelligence", sig, now, 60));
    }

    /**
     * 轮换窗口内旧密钥签名应仍可通过
     */
    @Test
    void previousSecretAcceptedDuringRotation() {
        String previous = "ai-rag-old-hmac-secret-key-32bytes!!";
        String current = SECRET;
        long now = 1_700_000_000L;
        String ts = String.valueOf(now);
        String sig = InternalServiceHmacUtil.sign(previous, "GET", "/documents/page", ts, "kb-intelligence");
        assertTrue(InternalServiceHmacUtil.verifyWithRotation(
                current, previous, "GET", "/documents/page", ts, "kb-intelligence", sig, now, 60));
        assertFalse(InternalServiceHmacUtil.verifyWithRotation(
                current, "", "GET", "/documents/page", ts, "kb-intelligence", sig, now, 60));
    }
}
