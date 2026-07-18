package com.knowledge.base.document.service;

import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.knowledge.base.common.config.SystemConfigCache;
import com.knowledge.base.common.exception.BusinessException;
import com.knowledge.base.common.result.Result;
import com.knowledge.base.common.utils.UserContextUtil;
import com.knowledge.base.document.dto.FileUploadResponse;
import com.knowledge.base.document.dto.RegisterStoredDTO;
import com.knowledge.base.document.entity.FileMetadata;
import com.knowledge.base.document.feign.FileServiceFeignClient;
import com.knowledge.base.document.mapper.FileMetadataMapper;
import com.knowledge.base.document.service.impl.FileManagementServiceImpl;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * registerStored 单元测试：服务端 check-hash 解析 URL，忽略客户端 fileUrl。
 */
@ExtendWith(MockitoExtension.class)
class FileRegisterStoredTest {

    private static final String SAMPLE_SHA256 =
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    private static final Long USER_ID = 1001L;
    private static final String SERVER_FILE_URL = "/api/file/files/download/99.pdf";
    private static final String MALICIOUS_FILE_URL = "https://evil.example/steal";
    private static final long SERVER_FILE_SIZE = 1024L;

    @Mock
    private FileMetadataMapper fileMetadataMapper;

    @Mock
    private FileUploadService fileUploadService;

    @Mock
    private FileServiceFeignClient fileServiceFeignClient;

    @Mock
    private SystemConfigCache systemConfigCache;

    private FileManagementServiceImpl fileManagementService;

    /**
     * 注入依赖并设置用户上下文。
     */
    @BeforeEach
    void setUp() {
        fileManagementService = new FileManagementServiceImpl();
        ReflectionTestUtils.setField(fileManagementService, "fileMetadataMapper", fileMetadataMapper);
        ReflectionTestUtils.setField(fileManagementService, "fileUploadService", fileUploadService);
        ReflectionTestUtils.setField(fileManagementService, "fileServiceFeignClient", fileServiceFeignClient);
        ReflectionTestUtils.setField(fileManagementService, "systemConfigCache", systemConfigCache);
        UserContextUtil.setUserId(USER_ID);
        UserContextUtil.setUsername("tester");
    }

    /**
     * 清理 ThreadLocal 用户上下文。
     */
    @AfterEach
    void tearDown() {
        UserContextUtil.clear();
    }

    /**
     * 同一用户同一 SHA-256 已存在时，直接返回原记录且不 insert。
     */
    @Test
    @DisplayName("registerStored：已有 sha256 幂等返回")
    @SuppressWarnings("unchecked")
    void registerStored_existingBySha256_returnsSame() {
        stubCheckHashHit();
        FileMetadata existing = new FileMetadata();
        existing.setId(42L);
        existing.setUploaderId(USER_ID);
        existing.setFileSha256(SAMPLE_SHA256);
        existing.setAccessUrl(SERVER_FILE_URL);

        when(fileMetadataMapper.selectOne(any(Wrapper.class))).thenReturn(existing);

        FileMetadata result = fileManagementService.registerStored(buildDto(MALICIOUS_FILE_URL), USER_ID);

        assertSame(existing, result);
        assertEquals(42L, result.getId());
        verify(fileMetadataMapper, never()).insert(any(FileMetadata.class));
        verify(fileUploadService, never()).uploadFile(any());
        verify(fileServiceFeignClient).checkHash(eq(SAMPLE_SHA256));
    }

    /**
     * 新建时使用 Feign check-hash 的 URL，而非客户端 fileUrl。
     */
    @Test
    @DisplayName("registerStored：使用 check-hash URL，忽略客户端 fileUrl")
    @SuppressWarnings("unchecked")
    void registerStored_usesFeignUrl_notClientUrl() {
        stubCheckHashHit();
        when(fileMetadataMapper.selectOne(any(Wrapper.class))).thenReturn(null);
        when(systemConfigCache.getConfig("file.upload.allowed.types")).thenReturn(null);
        when(fileMetadataMapper.insert(any(FileMetadata.class))).thenReturn(1);

        FileMetadata result = fileManagementService.registerStored(buildDto(MALICIOUS_FILE_URL), USER_ID);

        assertNotNull(result.getId());
        assertEquals(SERVER_FILE_URL, result.getAccessUrl());
        assertEquals(SERVER_FILE_URL, result.getStoragePath());
        assertEquals(SERVER_FILE_SIZE, result.getFileSize());
        assertEquals("application/pdf", result.getContentType());

        ArgumentCaptor<FileMetadata> captor = ArgumentCaptor.forClass(FileMetadata.class);
        verify(fileMetadataMapper).insert(captor.capture());
        assertEquals(SERVER_FILE_URL, captor.getValue().getAccessUrl());
        assertTrue(!MALICIOUS_FILE_URL.equals(captor.getValue().getAccessUrl()));
        verify(fileUploadService, never()).uploadFile(any());
    }

    /**
     * kb-file 无此 hash 时拒绝登记。
     */
    @Test
    @DisplayName("registerStored：check-hash miss 抛业务异常")
    void registerStored_missingHashInKbFile_throws() {
        when(fileServiceFeignClient.checkHash(SAMPLE_SHA256)).thenReturn(Result.success(null));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> fileManagementService.registerStored(buildDto(null), USER_ID));

        assertEquals("文件不存在，无法登记", ex.getMessage());
        verify(fileMetadataMapper, never()).insert(any(FileMetadata.class));
    }

    /**
     * 客户端恶意外链不得写入 storagePath / accessUrl。
     */
    @Test
    @DisplayName("registerStored：恶意 fileUrl 不得落库")
    @SuppressWarnings("unchecked")
    void registerStored_maliciousClientUrl_notStored() {
        stubCheckHashHit();
        when(fileMetadataMapper.selectOne(any(Wrapper.class))).thenReturn(null);
        when(systemConfigCache.getConfig("file.upload.allowed.types")).thenReturn(null);
        when(fileMetadataMapper.insert(any(FileMetadata.class))).thenReturn(1);

        fileManagementService.registerStored(buildDto(MALICIOUS_FILE_URL), USER_ID);

        ArgumentCaptor<FileMetadata> captor = ArgumentCaptor.forClass(FileMetadata.class);
        verify(fileMetadataMapper).insert(captor.capture());
        FileMetadata saved = captor.getValue();
        assertEquals(SERVER_FILE_URL, saved.getAccessUrl());
        assertEquals(SERVER_FILE_URL, saved.getStoragePath());
        assertTrue(!saved.getAccessUrl().contains("evil.example"));
    }

    /**
     * 客户端 fileSize 与 kb-file 不一致时拒绝。
     */
    @Test
    @DisplayName("registerStored：fileSize 不一致拒绝")
    void registerStored_sizeMismatch_rejects() {
        stubCheckHashHit();
        RegisterStoredDTO dto = buildDto(null);
        dto.setFileSize(9999L);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> fileManagementService.registerStored(dto, USER_ID));

        assertEquals("文件大小与已存文件不一致", ex.getMessage());
        verify(fileMetadataMapper, never()).insert(any(FileMetadata.class));
    }

    /**
     * Stub kb-file check-hash 命中。
     */
    private void stubCheckHashHit() {
        FileUploadResponse vo = FileUploadResponse.builder()
                .id(99L)
                .fileUrl(SERVER_FILE_URL)
                .fileSize(SERVER_FILE_SIZE)
                .mimeType("application/pdf")
                .originalName("server-demo.pdf")
                .build();
        when(fileServiceFeignClient.checkHash(SAMPLE_SHA256)).thenReturn(Result.success(vo));
    }

    /**
     * 构造登记 DTO（可附带恶意 fileUrl 以验证忽略）。
     *
     * @param fileUrl 客户端 fileUrl（可为恶意外链）
     * @return RegisterStoredDTO
     */
    private RegisterStoredDTO buildDto(String fileUrl) {
        return RegisterStoredDTO.builder()
                .fileUrl(fileUrl)
                .originalFileName("demo.pdf")
                .fileSize(SERVER_FILE_SIZE)
                .contentType("application/octet-stream")
                .fileSha256(SAMPLE_SHA256)
                .isPublic(false)
                .build();
    }
}
