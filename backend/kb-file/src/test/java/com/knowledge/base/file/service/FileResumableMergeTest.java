package com.knowledge.base.file.service;

import com.knowledge.base.common.config.SystemConfigCache;
import com.knowledge.base.common.exception.BusinessException;
import com.knowledge.base.file.config.FileStorageProperties;
import com.knowledge.base.file.controller.FileController;
import com.knowledge.base.file.dto.ResumableInitDTO;
import com.knowledge.base.file.dto.ResumableMergeDTO;
import com.knowledge.base.file.entity.FileInfo;
import com.knowledge.base.file.mapper.FileMapper;
import com.knowledge.base.file.service.impl.FileServiceImpl;
import com.knowledge.base.file.storage.FileStorageFactory;
import com.knowledge.base.file.storage.ResumableFileStorage;
import com.knowledge.base.file.storage.ResumableUploadSession;
import com.knowledge.base.file.vo.FileInfoVO;
import com.knowledge.base.common.result.Result;
import com.knowledge.base.common.result.ResultCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 断点续传 merge 元数据与 Controller 端点单元测试。
 *
 * <p>重点验证：禁止 sessionId.substring 伪 hash，落库使用会话内真实 fileHash/fileName/path。</p>
 */
@ExtendWith(MockitoExtension.class)
class FileResumableMergeTest {

    private static final String SAMPLE_SHA256 =
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    private static final String SESSION_ID = "abcdef0123456789abcdef0123456789";
    private static final String RELATIVE_PATH = "2026/07/18/e3/" + SAMPLE_SHA256 + ".pdf";

    @Mock
    private FileMapper fileMapper;

    @Mock
    private FileStorageFactory storageFactory;

    @Mock
    private FileStorageProperties storageProperties;

    @Mock
    private MediaService mediaService;

    @Mock
    private RabbitTemplate rabbitTemplate;

    @Mock
    private SystemConfigCache systemConfigCache;

    @Mock
    private ResumableFileStorage resumableFileStorage;

    @Mock
    private FileService fileService;

    private FileServiceImpl fileServiceImpl;

    private FileController fileController;

    /**
     * 初始化被测 Service，并注入 Mapper / SystemConfigCache。
     */
    @BeforeEach
    void setUp() {
        fileServiceImpl = new FileServiceImpl(storageFactory, storageProperties, mediaService, rabbitTemplate);
        ReflectionTestUtils.setField(fileServiceImpl, "fileMapper", fileMapper);
        ReflectionTestUtils.setField(fileServiceImpl, "systemConfigCache", systemConfigCache);
        fileController = new FileController(fileService);
    }

    /**
     * merge 应从会话读取真实 hash/文件名/路径，而不是 sessionId 前缀。
     */
    @Test
    @DisplayName("mergeChunks：使用会话元数据落库，禁止伪 hash")
    void mergeChunks_usesSessionMetadata_notSessionIdPrefix() {
        ResumableUploadSession session = buildSession();
        when(storageFactory.getStorage()).thenReturn(resumableFileStorage);
        when(storageFactory.getStorageType()).thenReturn("s3");
        when(resumableFileStorage.getUploadSession(SESSION_ID)).thenReturn(session);
        when(resumableFileStorage.getUploadedChunks(SESSION_ID)).thenReturn(new int[]{0});
        when(resumableFileStorage.mergeChunks(SESSION_ID)).thenReturn(true);
        // SAMPLE_SHA256 为空内容的 SHA-256
        when(resumableFileStorage.getInputStream(RELATIVE_PATH))
                .thenReturn(new ByteArrayInputStream(new byte[0]));
        when(resumableFileStorage.getFileSize(RELATIVE_PATH)).thenReturn(2048L);
        when(fileMapper.insert(any(FileInfo.class))).thenReturn(1);

        ResumableMergeDTO dto = new ResumableMergeDTO();
        dto.setUploaderId(9L);
        dto.setAccessLevel(2);

        FileInfoVO vo = fileServiceImpl.mergeChunks(SESSION_ID, dto);

        ArgumentCaptor<FileInfo> captor = ArgumentCaptor.forClass(FileInfo.class);
        verify(fileMapper).insert(captor.capture());
        FileInfo saved = captor.getValue();

        assertEquals(SAMPLE_SHA256, saved.getFileHash());
        assertEquals("report.pdf", saved.getOriginalName());
        assertEquals(RELATIVE_PATH, saved.getFilePath());
        assertEquals(2048L, saved.getFileSize());
        assertEquals("application/pdf", saved.getMimeType());
        // 旧实现用 sessionId.substring(0,8) 伪 hash，此处必须不等于该伪值
        assertTrue(!SESSION_ID.substring(0, 8).equals(saved.getFileHash()));
        assertNotNull(vo.getId());
        assertEquals("report.pdf", vo.getOriginalName());
        verify(resumableFileStorage, never()).delete(anyString());
    }

    /**
     * 分片未齐全时禁止 completeMultipart / 落库。
     */
    @Test
    @DisplayName("mergeChunks：分片未齐全则拒绝合并")
    void mergeChunks_rejectsIncompleteChunks() {
        ResumableUploadSession session = buildSession();
        session.setChunkCount(3);
        when(storageFactory.getStorage()).thenReturn(resumableFileStorage);
        when(resumableFileStorage.getUploadSession(SESSION_ID)).thenReturn(session);
        when(resumableFileStorage.getUploadedChunks(SESSION_ID)).thenReturn(new int[]{0, 1});

        BusinessException ex = assertThrows(BusinessException.class,
                () -> fileServiceImpl.mergeChunks(SESSION_ID, new ResumableMergeDTO()));
        assertTrue(ex.getMessage().contains("分片未齐全"));
        verify(resumableFileStorage, never()).mergeChunks(anyString());
        verify(fileMapper, never()).insert(any(FileInfo.class));
    }

    /**
     * 合并后对象内容 hash 与会话声明不一致：删除对象且不落库。
     */
    @Test
    @DisplayName("mergeChunks：内容 hash 不一致则删除对象且不落库")
    void mergeChunks_rejectsContentHashMismatch() {
        ResumableUploadSession session = buildSession();
        when(storageFactory.getStorage()).thenReturn(resumableFileStorage);
        when(resumableFileStorage.getUploadSession(SESSION_ID)).thenReturn(session);
        when(resumableFileStorage.getUploadedChunks(SESSION_ID)).thenReturn(new int[]{0});
        when(resumableFileStorage.mergeChunks(SESSION_ID)).thenReturn(true);
        when(resumableFileStorage.getInputStream(RELATIVE_PATH))
                .thenReturn(new ByteArrayInputStream("not-empty".getBytes(StandardCharsets.UTF_8)));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> fileServiceImpl.mergeChunks(SESSION_ID, new ResumableMergeDTO()));
        assertTrue(ex.getMessage().contains("哈希"));
        verify(resumableFileStorage).delete(RELATIVE_PATH);
        verify(fileMapper, never()).insert(any(FileInfo.class));
    }

    /**
     * 请求体 fileHash 与会话不一致时应拒绝合并。
     */
    @Test
    @DisplayName("mergeChunks：冗余 fileHash 不一致则失败")
    void mergeChunks_rejectsMismatchedHash() {
        when(storageFactory.getStorage()).thenReturn(resumableFileStorage);
        when(resumableFileStorage.getUploadSession(SESSION_ID)).thenReturn(buildSession());

        ResumableMergeDTO dto = new ResumableMergeDTO();
        dto.setFileHash("deadbeef");

        assertThrows(BusinessException.class, () -> fileServiceImpl.mergeChunks(SESSION_ID, dto));
        verify(resumableFileStorage, never()).mergeChunks(anyString());
        verify(resumableFileStorage, never()).getUploadedChunks(anyString());
    }

    /**
     * init 时非法 hash（非 64 位 hex）应拒绝，避免路径 substring 异常。
     */
    @Test
    @DisplayName("initResumableUpload：非法 fileHash 格式拒绝")
    void initResumableUpload_rejectsInvalidHashFormat() {
        assertThrows(BusinessException.class, () ->
                fileServiceImpl.initResumableUpload("abc", "a.pdf", 100L, 1, null));
        verify(storageFactory, never()).getStorage();
    }

    /**
     * init 超过 resumable max 应拒绝。
     */
    @Test
    @DisplayName("initResumableUpload：超过 resumable.max.size 拒绝")
    void initResumableUpload_rejectsOversize() {
        FileStorageProperties.Upload upload = new FileStorageProperties.Upload();
        upload.setEnableResumableUpload(true);
        upload.setResumableMaxSize(1024L);
        when(storageProperties.getUpload()).thenReturn(upload);
        when(systemConfigCache.getConfig("file.upload.resumable.max.size")).thenReturn(null);

        assertThrows(BusinessException.class, () ->
                fileServiceImpl.initResumableUpload(SAMPLE_SHA256, "a.pdf", 2048L, 1, "application/pdf"));
        verify(storageFactory, never()).getStorage();
    }

    /**
     * Controller init 返回 sessionId 包装结构。
     */
    @Test
    @DisplayName("Controller init：返回 { sessionId }")
    void controllerInit_returnsSessionId() {
        ResumableInitDTO dto = new ResumableInitDTO();
        dto.setFileHash(SAMPLE_SHA256);
        dto.setFileName("a.pdf");
        dto.setTotalSize(100L);
        dto.setChunkCount(1);
        when(fileService.initResumableUpload(SAMPLE_SHA256, "a.pdf", 100L, 1, null))
                .thenReturn(SESSION_ID);

        Result<Map<String, String>> result = fileController.initResumableUpload(dto);

        assertEquals(ResultCode.SUCCESS.getCode(), result.getCode());
        assertNotNull(result.getData());
        assertEquals(SESSION_ID, result.getData().get("sessionId"));
    }

    /**
     * Controller chunks 查询返回 uploaded 数组。
     */
    @Test
    @DisplayName("Controller getUploadedChunks：返回 { uploaded }")
    void controllerGetUploadedChunks_returnsArray() {
        when(fileService.getUploadedChunks(SESSION_ID)).thenReturn(new int[]{0, 2});

        Result<Map<String, int[]>> result = fileController.getUploadedChunks(SESSION_ID);

        assertEquals(ResultCode.SUCCESS.getCode(), result.getCode());
        assertNotNull(result.getData());
        assertEquals(2, result.getData().get("uploaded").length);
        assertEquals(0, result.getData().get("uploaded")[0]);
        assertEquals(2, result.getData().get("uploaded")[1]);
    }

    /**
     * 构造含完整元数据的续传会话。
     *
     * @return 会话视图
     */
    private ResumableUploadSession buildSession() {
        ResumableUploadSession session = new ResumableUploadSession();
        session.setSessionId(SESSION_ID);
        session.setUploadId("upload-1");
        session.setRelativePath(RELATIVE_PATH);
        session.setTotalSize(2048L);
        session.setChunkCount(1);
        session.setFileHash(SAMPLE_SHA256);
        session.setFileName("report.pdf");
        session.setContentType("application/pdf");
        return session;
    }
}
