package com.knowledge.base.document.util;

import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;

/**
 * 自定义MultipartFile实现
 *
 * <p>用于从字节数组创建MultipartFile对象</p>
 *
 * @author 苏三
 * @since 1.0.0
 */
public class CustomMultipartFile implements MultipartFile {

    private final byte[] content;
    private final String name;
    private final String originalFilename;
    private final String contentType;

    public CustomMultipartFile(byte[] content, String name, String originalFilename, String contentType) {
        this.content = content;
        this.name = name;
        this.originalFilename = originalFilename;
        this.contentType = contentType;
    }

    public CustomMultipartFile(byte[] content, String originalFilename, String contentType) {
        this(content, "file", originalFilename, contentType);
    }

    /**
     * 获取Name。
     */
    @Override
    public String getName() {
        return name;
    }

    /**
     * 获取OriginalFilename。
     */
    @Override
    public String getOriginalFilename() {
        return originalFilename;
    }

    /**
     * 获取ContentType。
     */
    @Override
    public String getContentType() {
        return contentType;
    }

    /**
     * 判断是否Empty。
     */
    @Override
    public boolean isEmpty() {
        return content == null || content.length == 0;
    }

    /**
     * 获取Size。
     */
    @Override
    public long getSize() {
        return content != null ? content.length : 0;
    }

    /**
     * 获取Bytes。
     */
    @Override
    public byte[] getBytes() throws IOException {
        return content;
    }

    /**
     * 获取InputStream。
     */
    @Override
    public InputStream getInputStream() throws IOException {
        return new ByteArrayInputStream(content);
    }

    /**
     * transferTo 方法。
     */
    @Override
    public void transferTo(File dest) throws IOException, IllegalStateException {
        throw new UnsupportedOperationException("transferTo not supported");
    }
}
