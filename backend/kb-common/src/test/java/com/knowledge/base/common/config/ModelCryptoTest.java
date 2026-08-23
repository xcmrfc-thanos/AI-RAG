package com.knowledge.base.common.config;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * {@link ModelCrypto} 单测：加解密往返、篡改失败、格式校验、掩码。
 */
class ModelCryptoTest {

    private static final String KEY = "test-encrypt-key-for-unit-test";
    private static final String PLAIN = "sk-1234567890abcdef";

    private ModelCrypto crypto() {
        return new ModelCrypto(() -> KEY);
    }

    /** 加解密往返。 */
    @Test
    void encryptDecrypt_roundTrip() {
        ModelCrypto crypto = crypto();
        String encrypted = crypto.encrypt(PLAIN);
        assertTrue(ModelCrypto.isEncrypted(encrypted), "密文应带 enc:v1: 前缀");
        assertTrue(encrypted.startsWith("enc:v1:"), "前缀格式");
        assertEquals(PLAIN, crypto.decrypt(encrypted), "解密应还原原文");
    }

    /** 每次加密随机 IV，相同明文两次密文不同。 */
    @Test
    void encrypt_randomIvProduceDifferentCiphertext() {
        ModelCrypto crypto = crypto();
        assertFalse(crypto.encrypt(PLAIN).equals(crypto.encrypt(PLAIN)), "随机 IV 下两次密文不应相同");
    }

    /** 篡改密文导致认证失败。 */
    @Test
    void decrypt_tamperedCiphertextFails() {
        ModelCrypto crypto = crypto();
        String encrypted = crypto.encrypt(PLAIN);
        // 翻转密文 body 最后一个字符
        String body = encrypted.substring("enc:v1:".length());
        int sep = body.indexOf(':');
        String cipherPart = body.substring(sep + 1);
        char last = cipherPart.charAt(cipherPart.length() - 1);
        char replaced = last == 'A' ? 'B' : 'A';
        String tampered = "enc:v1:" + body.substring(0, sep + 1)
                + cipherPart.substring(0, cipherPart.length() - 1) + replaced;
        assertThrows(IllegalStateException.class, () -> crypto.decrypt(tampered), "篡改密文应解密失败");
    }

    /** 密钥不一致解密失败。 */
    @Test
    void decrypt_wrongKeyFails() {
        String encrypted = crypto().encrypt(PLAIN);
        ModelCrypto other = new ModelCrypto(() -> "another-key");
        assertThrows(IllegalStateException.class, () -> other.decrypt(encrypted), "错误密钥应解密失败");
    }

    /** 格式校验：缺分隔符、IV 长度非法。 */
    @Test
    void decrypt_invalidFormatFails() {
        ModelCrypto crypto = crypto();
        assertThrows(IllegalArgumentException.class,
                () -> crypto.decrypt("enc:v1:only-iv-no-sep"), "缺分隔符应失败");
        assertThrows(IllegalArgumentException.class,
                () -> crypto.decrypt("enc:v1:YWJjZA==:c2VjcmV0"), "IV 长度非法应失败");
        assertThrows(IllegalArgumentException.class,
                () -> crypto.decrypt("enc:v1:!!!:!!!"), "非法 Base64 应失败");
    }

    /** 非 enc:v1: 前缀透传（兼容未加密旧数据）。 */
    @Test
    void decrypt_plainPassthrough() {
        ModelCrypto crypto = crypto();
        assertEquals(PLAIN, crypto.decrypt(PLAIN));
        assertEquals(null, crypto.decrypt(null));
        assertEquals("", crypto.decrypt(""));
    }

    /** 空明文加密原样返回。 */
    @Test
    void encrypt_emptyPlaintext() {
        ModelCrypto crypto = crypto();
        assertEquals(null, crypto.encrypt(null));
        assertEquals("", crypto.encrypt(""));
    }

    /** 密钥未配置时加密抛异常（写接口据此拒写）。 */
    @Test
    void encrypt_missingKeyThrows() {
        ModelCrypto crypto = new ModelCrypto(() -> null);
        assertThrows(IllegalStateException.class, () -> crypto.encrypt(PLAIN), "无密钥应拒写");
    }

    /** 掩码：前 3 + 后 4。 */
    @Test
    void mask_formats() {
        assertEquals("sk-****cdef", ModelCrypto.mask("sk-abc12345cdef"));
        assertEquals("****", ModelCrypto.mask("short"));
        assertEquals("", ModelCrypto.mask(""));
        assertEquals("", ModelCrypto.mask(null));
    }

    /** 掩码不泄露中间位。 */
    @Test
    void mask_hidesMiddle() {
        String masked = ModelCrypto.mask(PLAIN);
        assertFalse(masked.contains("1234567890"), "掩码不应包含中间明文");
        assertTrue(masked.endsWith("cdef"), "掩码保留后 4 位");
    }
}
