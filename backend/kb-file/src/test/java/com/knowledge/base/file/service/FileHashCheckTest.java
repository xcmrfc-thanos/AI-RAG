package com.knowledge.base.file.service;

import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.knowledge.base.common.config.SqlDialectHelper;
import com.knowledge.base.common.result.Result;
import com.knowledge.base.common.result.ResultCode;
import com.knowledge.base.file.config.FileStorageProperties;
import com.knowledge.base.file.controller.FileController;
import com.knowledge.base.file.entity.FileInfo;
import com.knowledge.base.file.mapper.FileMapper;
import com.knowledge.base.file.service.impl.FileServiceImpl;
import com.knowledge.base.file.storage.FileStorageFactory;
import com.knowledge.base.file.vo.FileInfoVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * 秒传预检（check-hash）单元测试。
 *
 * <p>覆盖：已存在 hash 返回 VO；不存在时 data 为 null。</p>
 */
@ExtendWith(MockitoExtension.class)
class FileHashCheckTest {

    private static final String SAMPLE_SHA256 =
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

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
    private FileService fileService;

    private FileServiceImpl fileServiceImpl;

    private FileController fileController;

    /**
     * 初始化被测 Service / Controller，并注入 FileMapper。
     */
    @BeforeEach
    void setUp() {
        fileServiceImpl = new FileServiceImpl(storageFactory, storageProperties, mediaService, rabbitTemplate,
                new SqlDialectHelper());
        ReflectionTestUtils.setField(fileServiceImpl, "fileMapper", fileMapper);
        fileController = new FileController(fileService);
    }

    /**
     * 给定库中已存在有效 hash，服务应返回对应 FileInfoVO。
     */
    @Test
    @DisplayName("findByHash：已存在 hash 返回 VO")
    @SuppressWarnings("unchecked")
    void findByHash_whenExists_returnsVo() {
        FileInfo exist = buildFileInfo(1001L, SAMPLE_SHA256);
        when(fileMapper.selectOne(any(Wrapper.class))).thenReturn(exist);

        Optional<FileInfoVO> result = fileServiceImpl.findByHash(SAMPLE_SHA256);

        assertTrue(result.isPresent());
        assertEquals(1001L, result.get().getId());
        assertEquals("demo.pdf", result.get().getOriginalName());
    }

    /**
     * 给定 hash 不存在，服务应返回 empty。
     */
    @Test
    @DisplayName("findByHash：不存在 hash 返回 empty")
    @SuppressWarnings("unchecked")
    void findByHash_whenMissing_returnsEmpty() {
        when(fileMapper.selectOne(any(Wrapper.class))).thenReturn(null);

        Optional<FileInfoVO> result = fileServiceImpl.findByHash(SAMPLE_SHA256);

        assertTrue(result.isEmpty());
    }

    /**
     * Controller：已存在时 Result.data 为文件 VO。
     */
    @Test
    @DisplayName("checkHash：已存在时 data 为 VO")
    void checkHash_whenExists_returnsVoInData() {
        FileInfoVO vo = FileInfoVO.builder().id(1001L).originalName("demo.pdf").build();
        when(fileService.findByHash(SAMPLE_SHA256)).thenReturn(Optional.of(vo));

        Result<FileInfoVO> result = fileController.checkHash(SAMPLE_SHA256);

        assertEquals(ResultCode.SUCCESS.getCode(), result.getCode());
        assertNotNull(result.getData());
        assertEquals(1001L, result.getData().getId());
    }

    /**
     * Controller：不存在时 Result.data 为 null。
     */
    @Test
    @DisplayName("checkHash：不存在时 data 为 null")
    void checkHash_whenMissing_returnsNullData() {
        when(fileService.findByHash(SAMPLE_SHA256)).thenReturn(Optional.empty());

        Result<FileInfoVO> result = fileController.checkHash(SAMPLE_SHA256);

        assertEquals(ResultCode.SUCCESS.getCode(), result.getCode());
        assertNull(result.getData());
    }

    /**
     * 构造可秒传的文件实体。
     *
     * @param id       文件 ID
     * @param fileHash SHA-256 摘要
     * @return 文件实体
     */
    private FileInfo buildFileInfo(Long id, String fileHash) {
        FileInfo info = new FileInfo();
        info.setId(id);
        info.setOriginalName("demo.pdf");
        info.setStoredName(fileHash + ".pdf");
        info.setFilePath("2026/07/18/e3/" + fileHash + ".pdf");
        info.setFileSize(1024L);
        info.setFileType("DOCUMENT");
        info.setMimeType("application/pdf");
        info.setFileHash(fileHash);
        info.setStorageType("S3");
        info.setUploaderId(1L);
        info.setAccessLevel(0);
        info.setDownloadCount(0);
        info.setStatus(1);
        info.setCreatedAt(LocalDateTime.now());
        info.setUpdatedAt(LocalDateTime.now());
        return info;
    }
}
