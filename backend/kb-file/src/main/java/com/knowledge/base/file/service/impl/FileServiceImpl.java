package com.knowledge.base.file.service.impl;

import cn.hutool.core.io.FileUtil;
import cn.hutool.core.util.HexUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.knowledge.base.common.config.InstanceIdentifier;
import com.knowledge.base.common.exception.BusinessException;
import com.knowledge.base.common.result.PageResult;
import com.knowledge.base.common.utils.SnowflakeIdGenerator;
import com.knowledge.base.file.config.FileStorageProperties;
import com.knowledge.base.file.config.RabbitMQConfig;
import com.knowledge.base.file.dto.FileQueryDTO;
import com.knowledge.base.file.dto.FileUploadDTO;
import com.knowledge.base.file.dto.ResumableMergeDTO;
import com.knowledge.base.file.entity.FileInfo;
import com.knowledge.base.file.mapper.FileMapper;
import com.knowledge.base.file.message.TranscodeMessage;
import com.knowledge.base.file.service.FileService;
import com.knowledge.base.file.service.MediaService;
import com.knowledge.base.file.storage.FileStorage;
import com.knowledge.base.file.storage.FileStorageFactory;
import com.knowledge.base.file.storage.ResumableFileStorage;
import com.knowledge.base.file.storage.ResumableUploadSession;
import com.knowledge.base.file.vo.FileInfoVO;
import com.knowledge.base.file.vo.MediaMetadata;
import com.knowledge.base.file.vo.UrlConvertResponse;
import com.knowledge.base.file.vo.BatchConvertResponse;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import com.knowledge.base.common.config.SystemConfigCache;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.net.URL;
import java.net.HttpURLConnection;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

/**
 * 文件Service实现类
 *
 * <p>按照阿里巴巴Java开发规范设计，实现文件相关业务逻辑</p>
 * <p>支持多种存储后端，具备秒传、断点续传能力</p>
 *
 * @author 苏三
 * @since 1.0.0
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FileServiceImpl extends ServiceImpl<FileMapper, FileInfo> implements FileService {

    @Resource
    private FileMapper fileMapper;

    @Resource
    private SystemConfigCache systemConfigCache;

    @Resource
    private ThreadPoolTaskExecutor asyncTaskExecutor;

    @Resource
    private InstanceIdentifier instanceIdentifier;

    private final FileStorageFactory storageFactory;
    private final FileStorageProperties storageProperties;
    private final MediaService mediaService;
    private final RabbitTemplate rabbitTemplate;

    /**
     * 上传文件
     *
     * @param file 文件
     * @param dto  上传参数
     * @return 文件信息
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public FileInfoVO uploadFile(MultipartFile file, FileUploadDTO dto) {
        log.info("开始上传文件：originalName={}, size={}, contentType={}",
                file.getOriginalFilename(), file.getSize(), file.getContentType());

        // 1. 验证文件
        validateFile(file);

        String fileHash;
        try {
            // 2. 计算文件哈希（用于秒传）
            fileHash = storageProperties.getUpload().isCalculateHash()
                    ? calculateFileHash(file.getInputStream())
                    : UUID.randomUUID().toString();

            // 3. 检查文件是否已存在（秒传）
            if (storageProperties.getUpload().isEnableFastUpload()) {
                FileInfo existFile = fileMapper.selectOne(
                        new LambdaQueryWrapper<FileInfo>()
                                .eq(FileInfo::getFileHash, fileHash)
                                .eq(FileInfo::getStatus, 1)
                );

                if (existFile != null) {
                    log.info("文件已存在，使用秒传：fileId={}, hash={}", existFile.getId(), fileHash);
                    return convertToVO(existFile);
                }
            }

            // 4. 生成存储路径
            String relativePath = generateRelativePath(fileHash, file.getOriginalFilename());

            // 5. 上传文件到存储后端
            FileStorage storage = storageFactory.getStorage();
            boolean uploadSuccess = storage.upload(file.getInputStream(), relativePath, file.getSize());

            if (!uploadSuccess) {
                throw new BusinessException("文件上传失败");
            }

            // 6. 检测文件类型
            String fileType = detectFileType(FileUtil.extName(file.getOriginalFilename()), file.getContentType());

            // 7. 构建文件信息实体
            FileInfo fileInfo = buildFileInfo(file, fileHash, relativePath, fileType, dto);

            // 8. 保存文件信息到数据库
            int count = fileMapper.insert(fileInfo);
            if (count <= 0) {
                // 回滚：删除已上传的文件
                storage.delete(relativePath);
                throw new BusinessException("保存文件信息失败");
            }

            // 9. 音视频文件：异步提取元数据
            if (isMediaFile(fileInfo)) {
                try {
                    MediaMetadata metadata = mediaService.probeMediaInfo(fileInfo.getId());
                    if (metadata.getDuration() != null) {
                        fileInfo.setDuration(metadata.getDuration());
                    }
                    if (metadata.getResolution() != null) {
                        fileInfo.setResolution(metadata.getResolution());
                    }
                    if (metadata.getBitrate() != null) {
                        fileInfo.setBitrate(metadata.getBitrate());
                    }
                    fileMapper.updateById(fileInfo);
                    log.info("媒体元数据提取完成：fileId={}, duration={}, resolution={}, bitrate={}",
                            fileInfo.getId(), metadata.getDuration(), metadata.getResolution(), metadata.getBitrate());
                } catch (Exception e) {
                    log.warn("媒体元数据提取失败（不影响上传）：fileId={}, error={}", fileInfo.getId(), e.getMessage());
                }
            }

            log.info("文件上传成功：fileId={}, path={}", fileInfo.getId(), relativePath);
            return convertToVO(fileInfo);

        } catch (IOException e) {
            log.error("文件上传失败：originalName={}, error={}", file.getOriginalFilename(), e.getMessage(), e);
            throw new BusinessException("文件上传失败: " + e.getMessage());
        }
    }

    /**
     * 批量上传文件
     *
     * @param files 文件列表
     * @param dto   上传参数
     * @return 文件信息列表
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public List<FileInfoVO> uploadFiles(MultipartFile[] files, FileUploadDTO dto) {
        log.info("开始批量上传文件：fileCount={}", files.length);

        List<FileInfoVO> results = new ArrayList<>();
        List<Exception> errors = new ArrayList<>();

        for (MultipartFile file : files) {
            try {
                FileInfoVO fileInfoVO = uploadFile(file, dto);
                results.add(fileInfoVO);
            } catch (Exception e) {
                log.error("上传文件失败：originalName={}, error={}", file.getOriginalFilename(), e.getMessage());
                errors.add(e);
            }
        }

        if (!errors.isEmpty()) {
            log.warn("批量上传完成，成功={}, 失败={}", results.size(), errors.size());
        }

        return results;
    }

    /**
     * 下载文件
     *
     * @param fileId     文件ID
     * @param response   HTTP响应
     */
    @Override
    public void downloadFile(Long fileId, HttpServletResponse response) throws IOException {
        log.info("开始下载文件：fileId={}", fileId);

        // 1. 参数校验
        if (fileId == null) {
            throw new BusinessException("文件ID不能为空");
        }

        // 2. 查询文件信息
        FileInfo fileInfo = fileMapper.selectById(fileId);
        if (fileInfo == null) {
            throw new BusinessException("文件不存在");
        }

        if (fileInfo.getStatus() == 0) {
            throw new BusinessException("文件已被删除");
        }

        // 3. 获取存储实现
        FileStorage storage = storageFactory.getStorage();

        // 4. 检查文件是否存在
        if (!storage.exists(fileInfo.getFilePath())) {
            throw new BusinessException("文件不存在");
        }

        // 5. 设置响应头
        response.setContentType(fileInfo.getMimeType());
        response.setHeader("Content-Disposition", buildContentDisposition("attachment", fileInfo.getOriginalName()));
        response.setHeader("Content-Length", String.valueOf(fileInfo.getFileSize()));
        response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        response.setHeader("Pragma", "no-cache");
        response.setHeader("Expires", "0");

        // 6. 流式下载文件
        try (OutputStream outputStream = response.getOutputStream()) {
            storage.download(fileInfo.getFilePath(), outputStream);
        }

        // 7. 更新下载次数
        updateDownloadCount(fileId);

        log.info("文件下载成功：fileId={}, fileName={}", fileId, fileInfo.getOriginalName());
    }

    /**
     * 获取文件流
     *
     * @param fileId 文件ID
     * @return 文件流
     */
    @Override
    public InputStream getFileStream(Long fileId) throws IOException {
        log.info("获取文件流：fileId={}", fileId);

        if (fileId == null) {
            throw new BusinessException("文件ID不能为空");
        }

        FileInfo fileInfo = fileMapper.selectById(fileId);
        if (fileInfo == null) {
            throw new BusinessException("文件不存在");
        }

        FileStorage storage = storageFactory.getStorage();
        return storage.getInputStream(fileInfo.getFilePath());
    }

    /**
     * 删除文件
     *
     * @param fileId 文件ID
     * @return 是否成功
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public Boolean deleteFile(Long fileId) {
        log.info("删除文件：fileId={}", fileId);

        if (fileId == null) {
            throw new BusinessException("文件ID不能为空");
        }

        FileInfo fileInfo = fileMapper.selectById(fileId);
        if (fileInfo == null) {
            throw new BusinessException("文件不存在");
        }

        // 检查文件是否被其他文档引用（业务层校验）
        // TODO: 实现文件引用检查逻辑

        // 软删除文件信息
        fileInfo.setStatus(0);
        int count = fileMapper.updateById(fileInfo);

        // 删除物理文件
        if (count > 0) {
            try {
                FileStorage storage = storageFactory.getStorage();
                storage.delete(fileInfo.getFilePath());
                log.info("物理文件删除成功：path={}", fileInfo.getFilePath());
            } catch (Exception e) {
                log.warn("删除物理文件失败：path={}, error={}", fileInfo.getFilePath(), e.getMessage());
            }
        }

        return count > 0;
    }

    /**
     * 批量删除文件
     *
     * @param fileIds 文件ID列表
     * @return 是否成功
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public Boolean batchDeleteFiles(List<Long> fileIds) {
        log.info("批量删除文件：fileCount={}", fileIds.size());

        if (fileIds == null || fileIds.isEmpty()) {
            return true;
        }

        int count = 0;
        for (Long fileId : fileIds) {
            try {
                deleteFile(fileId);
                count++;
            } catch (Exception e) {
                log.error("删除文件失败：fileId={}, error={}", fileId, e.getMessage());
            }
        }

        return count > 0;
    }

    /**
     * 获取文件详情
     *
     * @param fileId 文件ID
     * @return 文件信息
     */
    @Override
    public FileInfoVO getFileInfo(Long fileId) {
        if (fileId == null) {
            throw new BusinessException("文件ID不能为空");
        }

        FileInfo fileInfo = fileMapper.selectById(fileId);
        if (fileInfo == null) {
            throw new BusinessException("文件不存在");
        }

        return convertToVO(fileInfo);
    }

    /**
     * 分页查询文件列表
     *
     * @param dto 查询参数
     * @return 分页结果
     */
    @Override
    public PageResult<FileInfoVO> pageFiles(FileQueryDTO dto) {
        LambdaQueryWrapper<FileInfo> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(FileInfo::getStatus, 1);

        if (StringUtils.hasText(dto.getOriginalName())) {
            wrapper.like(FileInfo::getOriginalName, dto.getOriginalName());
        }
        if (StringUtils.hasText(dto.getFileType())) {
            wrapper.eq(FileInfo::getFileType, dto.getFileType());
        }
        if (dto.getUploaderId() != null) {
            wrapper.eq(FileInfo::getUploaderId, dto.getUploaderId());
        }
        if (dto.getAccessLevel() != null) {
            wrapper.eq(FileInfo::getAccessLevel, dto.getAccessLevel());
        }

        wrapper.orderByDesc(FileInfo::getCreatedAt);

        Page<FileInfo> page = new Page<>(dto.getCurrent(), dto.getSize());
        IPage<FileInfo> filePage = fileMapper.selectPage(page, wrapper);

        IPage<FileInfoVO> voPage = filePage.convert(this::convertToVO);

        return PageResult.<FileInfoVO>builder()
                .records(voPage.getRecords())
                .total(voPage.getTotal())
                .current(voPage.getCurrent())
                .size(voPage.getSize())
                .build();
    }

    /**
     * 获取文件预览URL
     *
     * @param fileId 文件ID
     * @return 预览URL
     */
    @Override
    public String getPreviewUrl(Long fileId) {
        if (fileId == null) {
            throw new BusinessException("文件ID不能为空");
        }

        FileInfo fileInfo = fileMapper.selectById(fileId);
        if (fileInfo == null) {
            throw new BusinessException("文件不存在");
        }

        return buildApiPreviewUrl(fileInfo);
    }

    /**
     * 根据文件哈希解析文件 ID（兼容历史 RustFS 直链头像）。
     *
     * @param hashWithExt 哈希值，可带扩展名
     * @return 文件 ID
     */
    @Override
    public Long resolveFileIdByHash(String hashWithExt) {
        if (!StringUtils.hasText(hashWithExt)) {
            throw new BusinessException("文件哈希不能为空");
        }

        int dotIndex = hashWithExt.lastIndexOf('.');
        String fileHash = dotIndex > 0 ? hashWithExt.substring(0, dotIndex) : hashWithExt;

        FileInfo fileInfo = fileMapper.selectOne(
                new LambdaQueryWrapper<FileInfo>()
                        .eq(FileInfo::getFileHash, fileHash)
                        .eq(FileInfo::getStatus, 1)
                        .orderByDesc(FileInfo::getCreatedAt)
                        .last("LIMIT 1")
        );
        if (fileInfo == null) {
            throw new BusinessException("文件不存在");
        }
        return fileInfo.getId();
    }

    /**
     * 按文件哈希查询可秒传文件（status=1）。
     *
     * <p>算法锁定：SHA-256（与 {@link #calculateFileHash} 一致），十六进制小写；前端须用 Web Crypto SHA-256，禁止 MD5。</p>
     *
     * @param fileHash 文件内容 SHA-256 十六进制摘要
     * @return 可秒传文件 VO；不存在则为 empty
     */
    @Override
    public Optional<FileInfoVO> findByHash(String fileHash) {
        if (!StringUtils.hasText(fileHash)) {
            return Optional.empty();
        }

        FileInfo existFile = fileMapper.selectOne(
                new LambdaQueryWrapper<FileInfo>()
                        .eq(FileInfo::getFileHash, fileHash)
                        .eq(FileInfo::getStatus, 1)
                        .orderByDesc(FileInfo::getCreatedAt)
                        .last("LIMIT 1")
        );
        if (existFile == null) {
            return Optional.empty();
        }
        return Optional.of(convertToVO(existFile));
    }

    /**
     * 预览文件（直接返回文件内容）
     *
     * @param fileId 文件ID
     * @param response HTTP响应
     */
    @Override
    public void previewFile(Long fileId, HttpServletResponse response) throws IOException {
        log.info("预览文件：fileId={}", fileId);

        // 1. 参数校验
        if (fileId == null) {
            throw new BusinessException("文件ID不能为空");
        }

        // 2. 查询文件信息
        FileInfo fileInfo = fileMapper.selectById(fileId);
        if (fileInfo == null) {
            throw new BusinessException("文件不存在");
        }

        if (fileInfo.getStatus() == 0) {
            throw new BusinessException("文件已被删除");
        }

        // 3. 获取存储实现
        FileStorage storage = storageFactory.getStorage();

        // 4. 检查文件是否存在
        if (!storage.exists(fileInfo.getFilePath())) {
            throw new BusinessException("文件不存在");
        }

        // 5. 设置响应头（用于预览，不是下载）
        response.setContentType(fileInfo.getMimeType());
        response.setHeader("Content-Length", String.valueOf(fileInfo.getFileSize()));
        response.setHeader("Cache-Control", "max-age=31536000, public"); // 缓存1年
        response.setHeader("Pragma", "public");

        // 对于图片文件，不设置Content-Disposition为attachment，而是inline
        if ("IMAGE".equals(fileInfo.getFileType())) {
            response.setHeader("Content-Disposition", "inline");
        } else {
            response.setHeader("Content-Disposition", buildContentDisposition("inline", fileInfo.getOriginalName()));
        }

        // 6. 流式传输文件
        try (OutputStream outputStream = response.getOutputStream()) {
            storage.download(fileInfo.getFilePath(), outputStream);
        }

        log.info("文件预览成功：fileId={}, fileName={}", fileId, fileInfo.getOriginalName());
    }

    /**
     * 文件格式转换（音视频触发异步HLS转码）
     *
     * @param fileId       文件ID
     * @param targetFormat 目标格式
     * @return 转换后的文件ID
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long convertFileFormat(Long fileId, String targetFormat) {
        log.info("文件格式转换：fileId={}, targetFormat={}", fileId, targetFormat);

        if (fileId == null) {
            throw new BusinessException("文件ID不能为空");
        }

        FileInfo fileInfo = fileMapper.selectById(fileId);
        if (fileInfo == null) {
            throw new BusinessException("文件不存在");
        }

        // 仅音视频文件支持HLS转码
        if (!isMediaFile(fileInfo)) {
            throw new BusinessException("仅音视频文件支持格式转换");
        }

        // 发送异步转码消息到RabbitMQ
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.TRANSCODE_EXCHANGE,
                "transcode." + instanceIdentifier.getId(),
                new TranscodeMessage(fileId, targetFormat)
        );

        // 更新转码状态为等待中
        fileInfo.setTranscodeStatus("PENDING");
        fileMapper.updateById(fileInfo);

        log.info("转码任务已提交：fileId={}, targetFormat={}", fileId, targetFormat);
        return fileId;
    }

    /**
     * 初始化断点续传会话，并将 fileHash/fileName/contentType 写入存储会话。
     *
     * <p>会话存 JVM 内存，重启/多实例不可续传（后续可 Redis）。</p>
     *
     * @param fileHash    文件内容 SHA-256 十六进制摘要
     * @param fileName    原始文件名
     * @param totalSize   文件总大小（字节）
     * @param chunkCount  分片总数
     * @param contentType MIME 类型（可为 null）
     * @return 会话 ID
     */
    @Override
    public String initResumableUpload(String fileHash, String fileName, long totalSize, int chunkCount,
                                      String contentType) {
        log.info("初始化断点续传：fileHash={}, fileName={}, totalSize={}, chunkCount={}, contentType={}",
                fileHash, fileName, totalSize, chunkCount, contentType);

        String normalizedHash = normalizeAndValidateFileHash(fileHash);
        if (!StringUtils.hasText(fileName)) {
            throw new BusinessException("文件名不能为空");
        }
        if (totalSize <= 0) {
            throw new BusinessException("文件大小必须大于 0");
        }
        if (chunkCount <= 0) {
            throw new BusinessException("分片数量必须大于 0");
        }
        if (!storageProperties.getUpload().isEnableResumableUpload()) {
            throw new BusinessException("未启用断点续传");
        }

        long resumableMaxSize = getResumableMaxSizeFromConfig();
        if (totalSize > resumableMaxSize) {
            throw new BusinessException("文件大小超过分片上传上限：最大" + formatFileSize(resumableMaxSize));
        }

        String extension = FileUtil.extName(fileName).toLowerCase();
        List<String> allowedTypes = getAllowedFileTypesFromConfig();
        if (StringUtils.hasText(extension) && !allowedTypes.contains(extension)) {
            throw new BusinessException("不支持的文件类型：" + extension + "，支持的类型：" + String.join(", ", allowedTypes));
        }

        String sessionId = UUID.randomUUID().toString().replace("-", "");
        String relativePath = generateRelativePath(normalizedHash, fileName);

        ResumableFileStorage s3Storage = requireResumableStorage();
        s3Storage.initResumableUpload(sessionId, relativePath, totalSize, chunkCount,
                normalizedHash, fileName, contentType);

        return sessionId;
    }

    /**
     * 上传单个分片，并按配置分片大小做上限校验。
     *
     * @param sessionId  会话 ID
     * @param chunkIndex 分片索引（从 0 开始）
     * @param chunkFile  分片数据
     * @return 是否成功
     */
    @Override
    public Boolean uploadChunk(String sessionId, int chunkIndex, MultipartFile chunkFile) {
        log.debug("上传分块：sessionId={}, chunkIndex={}, size={}",
                sessionId, chunkIndex, chunkFile.getSize());

        if (chunkFile == null || chunkFile.isEmpty()) {
            throw new BusinessException("分片数据不能为空");
        }
        if (chunkIndex < 0) {
            throw new BusinessException("分片索引无效");
        }

        ResumableFileStorage s3Storage = requireResumableStorage();
        ResumableUploadSession session = s3Storage.getUploadSession(sessionId);
        if (chunkIndex >= session.getChunkCount()) {
            throw new BusinessException("分片索引超出范围：chunkIndex=" + chunkIndex
                    + ", chunkCount=" + session.getChunkCount());
        }

        long chunkSize = chunkFile.getSize();
        long configuredChunkSize = getChunkSizeFromConfig();
        // 非末片应接近配置分片大小；末片可更小。统一拒绝明显超过配置+容差的分片。
        long maxAllowed = configuredChunkSize + Math.max(configuredChunkSize / 10, 512 * 1024L);
        if (chunkSize > maxAllowed) {
            throw new BusinessException("分片大小超过限制：最大" + formatFileSize(maxAllowed)
                    + "（配置分片 " + formatFileSize(configuredChunkSize) + "）");
        }

        try {
            return s3Storage.uploadChunk(sessionId, chunkIndex, chunkFile.getInputStream(), chunkSize);
        } catch (IOException e) {
            log.error("上传分块失败：{}", e.getMessage(), e);
            throw new BusinessException("上传分块失败: " + e.getMessage());
        }
    }

    /**
     * 获取已上传分块索引列表。
     *
     * @param sessionId 会话 ID
     * @return 已上传分片索引数组
     */
    @Override
    public int[] getUploadedChunks(String sessionId) {
        return requireResumableStorage().getUploadedChunks(sessionId);
    }

    /**
     * 合并分片：校验分片齐全 → complete multipart → 校验内容 SHA-256 → 落库。
     *
     * @param sessionId 会话 ID
     * @param dto       合并参数（可选 fileHash/fileName 冗余校验）
     * @return 文件信息
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public FileInfoVO mergeChunks(String sessionId, ResumableMergeDTO dto) {
        log.info("合并分块：sessionId={}", sessionId);

        if (dto == null) {
            dto = new ResumableMergeDTO();
        }

        ResumableFileStorage s3Storage = requireResumableStorage();
        // 合并成功后会话会被移除，必须先取出元数据
        ResumableUploadSession session = s3Storage.getUploadSession(sessionId);
        String fileHash = session.getFileHash();
        String fileName = session.getFileName();
        String relativePath = session.getRelativePath();
        long totalSize = session.getTotalSize();
        int chunkCount = session.getChunkCount();

        if (!StringUtils.hasText(fileHash) || !StringUtils.hasText(fileName) || !StringUtils.hasText(relativePath)) {
            throw new BusinessException("续传会话元数据不完整，请重新初始化上传");
        }
        if (StringUtils.hasText(dto.getFileHash()) && !fileHash.equalsIgnoreCase(dto.getFileHash().trim())) {
            throw new BusinessException("合并校验失败：fileHash 与会话不一致");
        }
        if (StringUtils.hasText(dto.getFileName()) && !fileName.equals(dto.getFileName())) {
            throw new BusinessException("合并校验失败：fileName 与会话不一致");
        }

        // 合并前必须齐全：0..chunkCount-1，缺片则绝不 completeMultipart / 落库
        ensureAllChunksUploaded(sessionId, chunkCount, s3Storage);

        boolean success = s3Storage.mergeChunks(sessionId);
        if (!success) {
            throw new BusinessException("分块合并失败");
        }

        // 与普通上传一致：服务端对流式计算 SHA-256，与会话声明比对
        verifyMergedObjectHash(s3Storage, relativePath, fileHash);

        long fileSize = s3Storage.getFileSize(relativePath);
        if (fileSize < 0) {
            fileSize = totalSize;
        }

        String fileType = detectFileType(FileUtil.extName(fileName), null);
        FileInfo fileInfo = buildFileInfoForResumable(fileHash, fileName, relativePath, fileSize, fileType, dto);
        fileInfo.setMimeType(session.getContentType());

        int count = fileMapper.insert(fileInfo);
        if (count <= 0) {
            s3Storage.delete(relativePath);
            throw new BusinessException("保存文件信息失败");
        }

        log.info("分块合并成功：fileId={}, fileHash={}, path={}", fileInfo.getId(), fileHash, relativePath);
        return convertToVO(fileInfo);
    }

    /**
     * 校验已上传分片是否覆盖 0..chunkCount-1；不齐全则拒绝合并。
     *
     * @param sessionId  会话 ID
     * @param chunkCount 期望分片总数
     * @param storage    可续传存储
     */
    private void ensureAllChunksUploaded(String sessionId, int chunkCount, ResumableFileStorage storage) {
        if (chunkCount <= 0) {
            throw new BusinessException("会话分片数量无效");
        }
        int[] uploaded = storage.getUploadedChunks(sessionId);
        Set<Integer> uploadedSet = new HashSet<>();
        if (uploaded != null) {
            for (int index : uploaded) {
                uploadedSet.add(index);
            }
        }
        List<Integer> missing = new ArrayList<>();
        for (int i = 0; i < chunkCount; i++) {
            if (!uploadedSet.contains(i)) {
                missing.add(i);
            }
        }
        if (!missing.isEmpty()) {
            throw new BusinessException("分片未齐全，无法合并：缺失 " + missing
                    + "（已上传 " + uploadedSet.size() + "/" + chunkCount + "）");
        }
    }

    /**
     * 合并完成后对流式计算对象 SHA-256，与会话 fileHash 比对；不一致则删除对象并拒绝落库。
     *
     * @param storage      存储实现
     * @param relativePath 合并后对象路径
     * @param expectedHash 会话声明的 SHA-256（十六进制）
     */
    private void verifyMergedObjectHash(ResumableFileStorage storage, String relativePath, String expectedHash) {
        try (InputStream inputStream = storage.getInputStream(relativePath)) {
            if (inputStream == null) {
                storage.delete(relativePath);
                throw new BusinessException("合并后无法读取对象，内容校验失败");
            }
            String actualHash = calculateFileHash(inputStream);
            if (!expectedHash.equalsIgnoreCase(actualHash)) {
                log.warn("合并后内容哈希不一致：path={}, expected={}, actual={}",
                        relativePath, expectedHash, actualHash);
                storage.delete(relativePath);
                throw new BusinessException("合并后文件内容哈希与声明不一致，上传已取消");
            }
        } catch (BusinessException e) {
            throw e;
        } catch (IOException e) {
            log.error("合并后内容哈希校验失败：path={}, err={}", relativePath, e.getMessage(), e);
            storage.delete(relativePath);
            throw new BusinessException("合并后内容哈希校验失败: " + e.getMessage());
        }
    }

    /**
     * 规范化并校验 SHA-256 十六进制哈希（非空、长度 64、仅 hex）。
     *
     * @param fileHash 原始哈希
     * @return 小写规范化后的哈希
     */
    private String normalizeAndValidateFileHash(String fileHash) {
        if (!StringUtils.hasText(fileHash)) {
            throw new BusinessException("文件哈希不能为空");
        }
        String normalized = fileHash.trim().toLowerCase(Locale.ROOT);
        if (normalized.length() != 64 || !normalized.chars().allMatch(c ->
                (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f'))) {
            throw new BusinessException("文件哈希格式无效，需为 64 位 SHA-256 十六进制");
        }
        return normalized;
    }

    // ==================== 私有方法 ====================

    /**
     * 验证文件
     */
    private void validateFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new BusinessException("文件不能为空");
        }

        // 检查文件大小（从系统配置读取）
        long maxSize = getMaxFileSizeFromConfig();
        if (file.getSize() > maxSize) {
            throw new BusinessException("文件大小超过限制：最大" + formatFileSize(maxSize));
        }

        // 检查文件类型（从系统配置读取）
        String originalFilename = file.getOriginalFilename();
        if (!StringUtils.hasText(originalFilename)) {
            throw new BusinessException("文件名不能为空");
        }

        String extension = FileUtil.extName(originalFilename).toLowerCase();
        List<String> allowedTypes = getAllowedFileTypesFromConfig();

        if (!allowedTypes.contains(extension)) {
            throw new BusinessException("不支持的文件类型：" + extension + "，支持的类型：" + String.join(", ", allowedTypes));
        }
    }

    /**
     * 从 kb_system_config 读取最大文件大小
     */
    private long getMaxFileSizeFromConfig() {
        String value = systemConfigCache.getConfig("file.upload.max.size");
        if (value != null) {
            try {
                return Long.parseLong(value.trim());
            } catch (NumberFormatException ignored) {
            }
        }
        return 20971520L; // 默认20MB
    }

    /**
     * 读取分片路径文件大小上限（优先系统配置 file.upload.resumable.max.size）。
     *
     * @return 字节数，默认 500MB
     */
    private long getResumableMaxSizeFromConfig() {
        String value = systemConfigCache.getConfig("file.upload.resumable.max.size");
        if (value != null) {
            try {
                return Long.parseLong(value.trim());
            } catch (NumberFormatException ignored) {
            }
        }
        if (storageProperties.getUpload() != null && storageProperties.getUpload().getResumableMaxSize() > 0) {
            return storageProperties.getUpload().getResumableMaxSize();
        }
        return 524288000L;
    }

    /**
     * 读取单分片大小配置（优先系统配置 file.upload.chunk.size）。
     *
     * @return 字节数，默认 5MB
     */
    private long getChunkSizeFromConfig() {
        String value = systemConfigCache.getConfig("file.upload.chunk.size");
        if (value != null) {
            try {
                return Long.parseLong(value.trim());
            } catch (NumberFormatException ignored) {
            }
        }
        if (storageProperties.getUpload() != null && storageProperties.getUpload().getChunkSize() > 0) {
            return storageProperties.getUpload().getChunkSize();
        }
        return 5242880L;
    }

    /**
     * 图片类型扩展名（始终允许，用于 convertFromUrl 等场景）
     */
    private static final List<String> IMAGE_EXTENSIONS = List.of(
            "jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "ico"
    );

    /**
     * 从 kb_system_config 读取允许的文件类型列表
     * 注意：图片类型始终包含在内，确保 convertFromUrl 等图片下载上传场景不受配置限制
     */
    private List<String> getAllowedFileTypesFromConfig() {
        String value = systemConfigCache.getConfig("file.upload.allowed.types");
        if (value != null && !value.isBlank()) {
            // 合并配置的类型和图片类型，去重并保持顺序
            List<String> configTypes = new java.util.ArrayList<>(List.of(value.toLowerCase().split(",")));
            Set<String> configSet = new LinkedHashSet<>(configTypes);
            configSet.addAll(IMAGE_EXTENSIONS);
            return List.copyOf(configSet);
        }
        // 默认支持所有常见类型
        return List.of("pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "md",
                "jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "ico",
                "mp4", "avi", "mov", "wmv", "flv", "mkv", "webm",
                "mp3", "wav", "flac", "aac", "ogg", "m4a", "wma");
    }

    /**
     * 计算文件哈希（流式计算，避免大文件OOM）。
     *
     * <p>算法：SHA-256，输出十六进制小写字符串（Hutool HexUtil）。与秒传预检 {@code findByHash}、前端对齐，禁止改用 MD5。</p>
     *
     * @param inputStream 文件输入流
     * @return SHA-256 十六进制摘要
     */
    private String calculateFileHash(InputStream inputStream) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] buffer = new byte[8192];
            int read;
            while ((read = inputStream.read(buffer)) != -1) {
                digest.update(buffer, 0, read);
            }
            return HexUtil.encodeHexStr(digest.digest());
        } catch (Exception e) {
            log.error("计算文件哈希失败：{}", e.getMessage());
            throw new BusinessException("计算文件哈希失败");
        }
    }

    /**
     * 生成相对存储路径
     */
    private String generateRelativePath(String fileHash, String originalFilename) {
        String datePath = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy/MM/dd"));
        String hashPrefix = fileHash.substring(0, 2);
        String extension = FileUtil.extName(originalFilename);
        String storedName = fileHash + (StringUtils.hasText(extension) ? "." + extension : "");

        return datePath + "/" + hashPrefix + "/" + storedName;
    }

    /**
     * 构建文件信息实体
     */
    private FileInfo buildFileInfo(MultipartFile file, String fileHash, String relativePath,
                                    String fileType, FileUploadDTO dto) {
        FileInfo fileInfo = new FileInfo();
        fileInfo.setId(SnowflakeIdGenerator.getInstance().nextId());
        fileInfo.setOriginalName(file.getOriginalFilename());
        fileInfo.setStoredName(relativePath.substring(relativePath.lastIndexOf("/") + 1));
        fileInfo.setFilePath(relativePath);
        fileInfo.setFileSize(file.getSize());
        fileInfo.setFileType(fileType);
        fileInfo.setMimeType(file.getContentType());
        fileInfo.setFileHash(fileHash);
        fileInfo.setStorageType(storageFactory.getStorageType().toUpperCase());
        fileInfo.setUploaderId(dto.getUploaderId() != null ? dto.getUploaderId() : 1L);
        fileInfo.setAccessLevel(dto.getAccessLevel() != null ? dto.getAccessLevel() : 0);
        fileInfo.setDownloadCount(0);
        fileInfo.setStatus(1);
        fileInfo.setCreatedAt(LocalDateTime.now());
        fileInfo.setUpdatedAt(LocalDateTime.now());

        return fileInfo;
    }

    /**
     * 检测文件类型
     */
    private String detectFileType(String extension, String mimeType) {
        if (extension == null) {
            return "OTHER";
        }

        return switch (extension.toLowerCase()) {
            case "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "md" -> "DOCUMENT";
            case "png", "jpg", "jpeg", "gif", "bmp", "svg" -> "IMAGE";
            case "mp4", "avi", "mov", "wmv", "mkv", "webm", "flv" -> "VIDEO";
            case "mp3", "wav", "flac", "aac", "ogg" -> "AUDIO";
            default -> "OTHER";
        };
    }

    /**
     * 更新下载次数
     */
    private void updateDownloadCount(Long fileId) {
        try {
            FileInfo fileInfo = fileMapper.selectById(fileId);
            if (fileInfo != null) {
                fileInfo.setDownloadCount(fileInfo.getDownloadCount() + 1);
                fileMapper.updateById(fileInfo);
            }
        } catch (Exception e) {
            log.warn("更新下载次数失败：fileId={}, error={}", fileId, e.getMessage());
        }
    }

    /**
     * 转换为VO
     */
    private FileInfoVO convertToVO(FileInfo fileInfo) {
        String objectDirectUrl = buildApiAccessUrl(fileInfo);

        if (objectDirectUrl == null && fileInfo.getId() != null) {
            objectDirectUrl = String.format("/api/file/files/download/%d", fileInfo.getId());
            log.warn("使用文件ID构造下载URL：fileId={}", fileInfo.getId());
        }

        // 构建播放URL（仅转码完成的音视频文件）
        String playUrl = null;
        if ("DONE".equals(fileInfo.getTranscodeStatus()) && fileInfo.getHlsPath() != null) {
            playUrl = String.format("/files/stream/%d/master.m3u8", fileInfo.getId());
        }

        // 构建缩略图URL
        String thumbnailUrl = null;
        if (fileInfo.getThumbnailPath() != null) {
            thumbnailUrl = String.format("/api/file/files/thumbnail/%d", fileInfo.getId());
        }

        return FileInfoVO.builder()
                .id(fileInfo.getId())
                .originalName(fileInfo.getOriginalName())
                .fileSize(fileInfo.getFileSize())
                .fileSizeReadable(formatFileSize(fileInfo.getFileSize()))
                .fileType(fileInfo.getFileType())
                .mimeType(fileInfo.getMimeType())
                .fileUrl(objectDirectUrl)
                .previewUrl(objectDirectUrl)
                .uploaderId(fileInfo.getUploaderId())
                .uploaderName(null) // TODO: 查询用户名称
                .accessLevel(fileInfo.getAccessLevel())
                .downloadCount(fileInfo.getDownloadCount())
                .storageType(fileInfo.getStorageType())
                .createdAt(fileInfo.getCreatedAt())
                .duration(fileInfo.getDuration())
                .resolution(fileInfo.getResolution())
                .bitrate(fileInfo.getBitrate())
                .transcodeStatus(fileInfo.getTranscodeStatus())
                .playUrl(playUrl)
                .thumbnailUrl(thumbnailUrl)
                .build();
    }

    /**
     * 获取支持断点续传的 S3 存储实例
     *
     * @return ResumableFileStorage 实例
     */
    private ResumableFileStorage requireResumableStorage() {
        if (storageFactory.getStorage() instanceof ResumableFileStorage resumable) {
            return resumable;
        }
        throw new BusinessException("当前存储后端不支持断点续传");
    }

    /**
     * 构建经网关代理的文件访问 URL，避免浏览器直连 RustFS 返回 403。
     *
     * @param fileInfo 文件信息
     * @return 网关可访问的相对 URL
     */
    private String buildApiAccessUrl(FileInfo fileInfo) {
        if (fileInfo == null || fileInfo.getId() == null) {
            return null;
        }
        if ("IMAGE".equals(fileInfo.getFileType())) {
            return buildApiPreviewUrl(fileInfo);
        }
        return "/api/file/files/download/" + buildFileIdPath(fileInfo);
    }

    /**
     * 构建图片预览 URL。
     *
     * @param fileInfo 文件信息
     * @return 预览 URL
     */
    private String buildApiPreviewUrl(FileInfo fileInfo) {
        if (fileInfo == null || fileInfo.getId() == null) {
            return null;
        }
        return "/api/file/files/preview/" + buildFileIdPath(fileInfo);
    }

    /**
     * 拼接带扩展名的文件 ID 路径段。
     *
     * @param fileInfo 文件信息
     * @return 文件 ID 路径段
     */
    private String buildFileIdPath(FileInfo fileInfo) {
        String fileId = String.valueOf(fileInfo.getId());
        String extension = FileUtil.extName(fileInfo.getOriginalName());
        return StringUtils.hasText(extension) ? fileId + "." + extension : fileId;
    }

    /**
     * 构建 S3 兼容对象存储直接访问 URL
     *
     * @param filePath 文件相对路径
     * @return 对象直接访问 URL
     */
    private String buildS3DirectUrl(String filePath) {
        if (filePath == null || filePath.isEmpty()) {
            throw new IllegalArgumentException("文件路径不能为空");
        }

        FileStorageProperties.S3 s3 = storageProperties.getEffectiveS3();
        String endpoint = s3.getEndpoint();
        int port = s3.getPort();
        String bucketName = s3.getBucketName();
        boolean secure = s3.isSecure();

        String protocol = secure ? "https" : "http";
        // 移除文件路径前后的斜杠，确保URL格式正确
        String normalizedPath = filePath.startsWith("/") ? filePath.substring(1) : filePath;

        return String.format("%s://%s:%d/%s/%s", protocol, endpoint, port, bucketName, normalizedPath);
    }

    /**
     * 构建符合 RFC 5987 规范的 Content-Disposition 头值
     * 对非 ASCII 文件名使用 filename*=UTF-8''url-encoded 格式，避免 Tomcat 异常
     */
    private String buildContentDisposition(String disposition, String fileName) {
        if (fileName == null || fileName.isEmpty()) {
            return disposition + "; filename=\"file\"";
        }

        boolean isAscii = fileName.chars().allMatch(c -> c < 128);

        if (isAscii) {
            return disposition + "; filename=\"" + fileName + "\"";
        }

        String asciiFallback = fileName.replaceAll("[^\\x00-\\x7F]", "_");
        String encodedName = URLEncoder.encode(fileName, StandardCharsets.UTF_8)
                .replace("+", "%20");
        return disposition + "; filename=\"" + asciiFallback + "\"; filename*=UTF-8''" + encodedName;
    }

    /**
     * 格式化文件大小
     */
    private String formatFileSize(Long size) {
        if (size == null) {
            return "0 B";
        }

        if (size < 1024) {
            return size + " B";
        } else if (size < 1024 * 1024) {
            return String.format("%.2f KB", size / 1024.0);
        } else if (size < 1024 * 1024 * 1024) {
            return String.format("%.2f MB", size / 1024.0 / 1024);
        } else {
            return String.format("%.2f GB", size / 1024.0 / 1024 / 1024);
        }
    }

    /**
     * 构建断点续传文件信息实体。
     *
     * @param fileHash     文件 SHA-256 哈希
     * @param fileName     原始文件名
     * @param relativePath 对象存储相对路径
     * @param fileSize     文件大小
     * @param fileType     文件类型
     * @param dto          上传/合并参数
     * @return 待落库的文件实体
     */
    private FileInfo buildFileInfoForResumable(String fileHash, String fileName, String relativePath,
                                                long fileSize, String fileType, FileUploadDTO dto) {
        FileInfo fileInfo = new FileInfo();
        fileInfo.setId(SnowflakeIdGenerator.getInstance().nextId());
        fileInfo.setOriginalName(fileName);
        fileInfo.setStoredName(relativePath.substring(relativePath.lastIndexOf("/") + 1));
        fileInfo.setFilePath(relativePath);
        fileInfo.setFileSize(fileSize);
        fileInfo.setFileType(fileType);
        fileInfo.setMimeType(null);
        fileInfo.setFileHash(fileHash);
        fileInfo.setStorageType(storageFactory.getStorageType().toUpperCase());
        fileInfo.setUploaderId(dto.getUploaderId() != null ? dto.getUploaderId() : 1L);
        fileInfo.setAccessLevel(dto.getAccessLevel() != null ? dto.getAccessLevel() : 0);
        fileInfo.setDownloadCount(0);
        fileInfo.setStatus(1);
        fileInfo.setCreatedAt(LocalDateTime.now());
        fileInfo.setUpdatedAt(LocalDateTime.now());

        return fileInfo;
    }

    /**
     * 从URL转换图片（下载并上传到系统）
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public UrlConvertResponse convertFromUrl(String imageUrl) {
        log.info("从URL转换图片：imageUrl={}", imageUrl);

        try {
            // 下载图片
            URL url = new URL(imageUrl);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(30000);
            connection.setReadTimeout(30000);
            connection.setRequestProperty("User-Agent", "Mozilla/5.0");

            int responseCode = connection.getResponseCode();
            if (responseCode != 200) {
                return UrlConvertResponse.builder()
                        .originalUrl(imageUrl)
                        .newUrl(null)
                        .success(false)
                        .errorMessage("下载失败，HTTP响应码: " + responseCode)
                        .build();
            }

            // 获取文件名和扩展名
            String fileName = extractFileNameFromUrl(imageUrl);
            String extension = FileUtil.extName(fileName);

            // 读取图片数据
            try (InputStream inputStream = connection.getInputStream()) {
                // 创建MultipartFile对象
                MockMultipartFile mockFile = new MockMultipartFile(
                        "file",
                        fileName,
                        "image/" + extension,
                        inputStream
                );

                // 上传文件
                FileUploadDTO dto = new FileUploadDTO();
                dto.setUploaderId(1L);
                dto.setAccessLevel(0);

                FileInfoVO fileInfo = uploadFile(mockFile, dto);

                return UrlConvertResponse.builder()
                        .originalUrl(imageUrl)
                        .newUrl(fileInfo.getFileUrl())
                        .success(true)
                        .errorMessage(null)
                        .build();
            }
        } catch (Exception e) {
            log.error("从URL转换图片失败：imageUrl={}, error={}", imageUrl, e.getMessage(), e);
            return UrlConvertResponse.builder()
                    .originalUrl(imageUrl)
                    .newUrl(null)
                    .success(false)
                    .errorMessage("转换失败: " + e.getMessage())
                    .build();
        }
    }

    /**
     * 批量转换图片URL（并发处理）
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public BatchConvertResponse batchConvertUrls(List<String> imageUrls) {
        log.info("批量转换图片URL：urlCount={}", imageUrls.size());

        Map<String, String> urlMappings = new ConcurrentHashMap<>();
        Map<String, String> errorMappings = new ConcurrentHashMap<>();
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        // 创建并发任务列表
        List<CompletableFuture<Void>> futures = imageUrls.stream()
                .map(imageUrl -> CompletableFuture.runAsync(() -> {
                    try {
                        UrlConvertResponse response = convertFromUrl(imageUrl);
                        if (response.getSuccess()) {
                            urlMappings.put(imageUrl, response.getNewUrl());
                            successCount.incrementAndGet();
                        } else {
                            errorMappings.put(imageUrl, response.getErrorMessage());
                            failureCount.incrementAndGet();
                        }
                    } catch (Exception e) {
                        log.error("转换图片URL失败：imageUrl={}, error={}", imageUrl, e.getMessage(), e);
                        errorMappings.put(imageUrl, "转换失败: " + e.getMessage());
                        failureCount.incrementAndGet();
                    }
                }, asyncTaskExecutor))
                .toList();

        // 等待所有任务完成
        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

        log.info("批量转换完成：成功={}, 失败={}", successCount.get(), failureCount.get());

        return BatchConvertResponse.builder()
                .urlMappings(urlMappings)
                .errorMappings(errorMappings)
                .successCount(successCount.get())
                .failureCount(failureCount.get())
                .build();
    }

    /**
     * 流式播放HLS master播放列表
     */
    @Override
    public void streamMasterPlaylist(Long fileId, HttpServletResponse response) throws IOException {
        FileInfo fileInfo = fileMapper.selectById(fileId);
        if (fileInfo == null || fileInfo.getHlsPath() == null) {
            throw new BusinessException("HLS播放列表不存在");
        }

        String hlsKey = fileInfo.getHlsPath() + "/master.m3u8";
        FileStorage storage = storageFactory.getStorage();
        response.setContentType("application/vnd.apple.mpegurl");
        response.setHeader("Cache-Control", "no-cache");

        try (OutputStream os = response.getOutputStream()) {
            storage.download(hlsKey, os);
        }
    }

    /**
     * 流式播放HLS TS分片
     */
    @Override
    public void streamSegment(Long fileId, String segment, HttpServletResponse response) throws IOException {
        FileInfo fileInfo = fileMapper.selectById(fileId);
        if (fileInfo == null || fileInfo.getHlsPath() == null) {
            throw new BusinessException("HLS分片不存在");
        }

        // segment格式: "360p/000.ts" 或 "720p/000.ts"
        String hlsKey = fileInfo.getHlsPath() + "/" + segment;
        FileStorage storage = storageFactory.getStorage();
        response.setContentType("video/mp2t");
        response.setHeader("Cache-Control", "max-age=86400, public");

        try (OutputStream os = response.getOutputStream()) {
            storage.download(hlsKey, os);
        }
    }

    /**
     * 获取缩略图
     */
    @Override
    public void getThumbnail(Long fileId, HttpServletResponse response) throws IOException {
        FileInfo fileInfo = fileMapper.selectById(fileId);
        if (fileInfo == null || fileInfo.getThumbnailPath() == null) {
            throw new BusinessException("缩略图不存在");
        }

        FileStorage storage = storageFactory.getStorage();
        response.setContentType("image/jpeg");
        response.setHeader("Cache-Control", "max-age=86400, public");

        try (OutputStream os = response.getOutputStream()) {
            storage.download(fileInfo.getThumbnailPath(), os);
        }
    }

    /**
     * 判断是否为音视频文件
     */
    private boolean isMediaFile(FileInfo fileInfo) {
        if (fileInfo.getFileType() == null) {
            return false;
        }
        return "VIDEO".equals(fileInfo.getFileType()) || "AUDIO".equals(fileInfo.getFileType());
    }

    /**
     * 从URL提取文件名
     */
    private String extractFileNameFromUrl(String url) {
        try {
            String path = new URL(url).getPath();
            String fileName = path.substring(path.lastIndexOf('/') + 1);
            if (fileName.isEmpty() || !fileName.contains(".")) {
                return "image_" + System.currentTimeMillis() + ".jpg";
            }
            return fileName;
        } catch (Exception e) {
            return "image_" + System.currentTimeMillis() + ".jpg";
        }
    }

    /**
     * MockMultipartFile用于包装从URL下载的文件
     */
    private static class MockMultipartFile implements MultipartFile {
        private final String name;
        private final String originalFilename;
        private final String contentType;
        private final byte[] content;

        public MockMultipartFile(String name, String originalFilename, String contentType, InputStream inputStream) throws IOException {
            this.name = name;
            this.originalFilename = originalFilename;
            this.contentType = contentType;
            this.content = inputStream.readAllBytes();
        }

        @Override
        public String getName() {
            return name;
        }

        @Override
        public String getOriginalFilename() {
            return originalFilename;
        }

        @Override
        public String getContentType() {
            return contentType;
        }

        @Override
        public boolean isEmpty() {
            return content.length == 0;
        }

        @Override
        public long getSize() {
            return content.length;
        }

        @Override
        public byte[] getBytes() throws IOException {
            return content;
        }

        @Override
        public InputStream getInputStream() throws IOException {
            return new ByteArrayInputStream(content);
        }

        @Override
        public void transferTo(File dest) throws IOException, IllegalStateException {
            Files.write(dest.toPath(), content);
        }
    }
}
