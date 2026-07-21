package com.knowledge.base.file.controller;

import com.knowledge.base.common.annotation.OperationLog;
import com.knowledge.base.common.result.PageResult;
import com.knowledge.base.common.result.Result;
import com.knowledge.base.file.dto.FileQueryDTO;
import com.knowledge.base.file.dto.FileUploadDTO;
import com.knowledge.base.file.dto.ResumableInitDTO;
import com.knowledge.base.file.dto.ResumableMergeDTO;
import com.knowledge.base.file.service.FileService;
import com.knowledge.base.file.vo.BatchConvertResponse;
import com.knowledge.base.file.vo.FileInfoVO;
import com.knowledge.base.file.vo.UrlConvertResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 文件管理Controller
 *
 * <p>断点续传会话存 JVM 内存，服务重启或多实例部署时不可续传；后续可迁移至 Redis。</p>
 *
 * @author 苏三
 * @since 1.0.0
 */
@Slf4j
@RestController
@RequestMapping("/files")
@RequiredArgsConstructor
@Tag(name = "文件管理", description = "文件管理相关接口")
public class FileController {

    private final FileService fileService;

    /**
     * 上传文件
     */
    @PostMapping("/upload")
    @Operation(summary = "上传文件", description = "上传单个文件")
    @OperationLog(module = "文件管理", operation = "上传文件", description = "上传文件")
    public Result<FileInfoVO> uploadFile(
            @RequestPart("file") MultipartFile file,
            FileUploadDTO dto) {
        FileInfoVO fileInfo = fileService.uploadFile(file, dto);
        return Result.success(fileInfo);
    }

    /**
     * 批量上传文件
     */
    @PostMapping("/upload/batch")
    @Operation(summary = "批量上传文件", description = "批量上传文件")
    @OperationLog(module = "文件管理", operation = "批量上传", description = "批量上传文件")
    public Result<List<FileInfoVO>> uploadFiles(
            @RequestPart("files") MultipartFile[] files,
            FileUploadDTO dto) {
        List<FileInfoVO> fileInfos = fileService.uploadFiles(files, dto);
        return Result.success(fileInfos);
    }

    /**
     * 秒传预检：客户端先算整文件哈希再查询是否已存在。
     *
     * <p>哈希算法与服务端上传一致：SHA-256（十六进制小写），前端应对齐
     * {@code crypto.subtle.digest('SHA-256', ...)}，禁止混用 MD5/spark-md5。</p>
     * <p>网关路径：{@code GET /api/file/files/upload/check-hash?fileHash=...}</p>
     *
     * @param fileHash 文件内容 SHA-256 十六进制摘要
     * @return 已存在时 data 为文件信息；不存在时 data 为 null
     */
    @GetMapping("/upload/check-hash")
    @Operation(summary = "秒传预检", description = "按 SHA-256 文件哈希查询是否可秒传；不存在时 data 为 null")
    public Result<FileInfoVO> checkHash(@RequestParam("fileHash") String fileHash) {
        return fileService.findByHash(fileHash)
                .map(Result::success)
                .orElseGet(() -> Result.success((FileInfoVO) null));
    }

    /**
     * 初始化断点续传会话。
     *
     * <p>会话存 JVM 内存，重启/多实例不可续传（后续可 Redis）。
     * 网关路径：{@code POST /api/file/files/upload/resumable/init}</p>
     *
     * @param dto 初始化参数（fileHash/fileName/totalSize/chunkCount）
     * @return {@code { sessionId }}
     */
    @PostMapping("/upload/resumable/init")
    @Operation(summary = "初始化断点续传", description = "创建分片上传会话；会话存内存，重启/多实例不可续传")
    @OperationLog(module = "文件管理", operation = "初始化断点续传", description = "初始化断点续传")
    public Result<Map<String, String>> initResumableUpload(@RequestBody ResumableInitDTO dto) {
        if (dto == null) {
            dto = new ResumableInitDTO();
        }
        String sessionId = fileService.initResumableUpload(
                dto.getFileHash(),
                dto.getFileName(),
                dto.getTotalSize() != null ? dto.getTotalSize() : 0L,
                dto.getChunkCount() != null ? dto.getChunkCount() : 0,
                dto.getContentType());
        Map<String, String> data = new HashMap<>(2);
        data.put("sessionId", sessionId);
        return Result.success(data);
    }

    /**
     * 上传单个分片。
     *
     * <p>网关路径：{@code PUT /api/file/files/upload/resumable/{sessionId}/chunks/{chunkIndex}}</p>
     *
     * @param sessionId  会话 ID
     * @param chunkIndex 分片索引（从 0 开始）
     * @param chunk      分片数据（multipart 字段名 chunk）
     * @return 是否成功
     */
    @PutMapping("/upload/resumable/{sessionId}/chunks/{chunkIndex}")
    @Operation(summary = "上传分片", description = "上传指定索引的分片数据")
    public Result<Boolean> uploadChunk(
            @PathVariable String sessionId,
            @PathVariable int chunkIndex,
            @RequestPart("chunk") MultipartFile chunk) {
        Boolean ok = fileService.uploadChunk(sessionId, chunkIndex, chunk);
        return Result.success(ok);
    }

    /**
     * 查询已上传分片列表（用于断点续传跳过已传分片）。
     *
     * <p>网关路径：{@code GET /api/file/files/upload/resumable/{sessionId}/chunks}</p>
     *
     * @param sessionId 会话 ID
     * @return {@code { uploaded: int[] }}
     */
    @GetMapping("/upload/resumable/{sessionId}/chunks")
    @Operation(summary = "查询已上传分片", description = "返回已上传分片索引数组；会话存内存，重启后失效")
    public Result<Map<String, int[]>> getUploadedChunks(@PathVariable String sessionId) {
        int[] uploaded = fileService.getUploadedChunks(sessionId);
        Map<String, int[]> data = new HashMap<>(2);
        data.put("uploaded", uploaded);
        return Result.success(data);
    }

    /**
     * 合并分片并落库文件元数据。
     *
     * <p>网关路径：{@code POST /api/file/files/upload/resumable/{sessionId}/merge}</p>
     *
     * @param sessionId 会话 ID
     * @param dto       合并参数（可含 fileName/fileHash 冗余校验）
     * @return 文件信息
     */
    @PostMapping("/upload/resumable/{sessionId}/merge")
    @Operation(summary = "合并分片", description = "合并全部分片并写入文件元数据")
    @OperationLog(module = "文件管理", operation = "合并分片", description = "合并断点续传分片")
    public Result<FileInfoVO> mergeChunks(
            @PathVariable String sessionId,
            @RequestBody(required = false) ResumableMergeDTO dto) {
        FileInfoVO fileInfo = fileService.mergeChunks(sessionId, dto != null ? dto : new ResumableMergeDTO());
        return Result.success(fileInfo);
    }

    /**
     * 下载文件
     */
    @GetMapping("/download/{fileId}/**")
    @Operation(summary = "下载文件", description = "下载指定文件")
    @OperationLog(module = "文件管理", operation = "下载文件", description = "下载文件")
    public void downloadFile(
            @PathVariable String fileId,
            HttpServletResponse response) throws IOException {
        // 从fileId中提取真实的文件ID（去除扩展名）
        Long realFileId = extractFileId(fileId);
        fileService.downloadFile(realFileId, response);
    }

    /**
     * 删除文件
     */
    @DeleteMapping("/{fileId}")
    @Operation(summary = "删除文件", description = "删除指定文件")
    @OperationLog(module = "文件管理", operation = "删除文件", description = "删除文件")
    public Result<Boolean> deleteFile(@PathVariable Long fileId) {
        Boolean result = fileService.deleteFile(fileId);
        return Result.success(result);
    }

    /**
     * 批量删除文件
     */
    @DeleteMapping("/batch")
    @Operation(summary = "批量删除文件", description = "批量删除文件")
    @OperationLog(module = "文件管理", operation = "批量删除", description = "批量删除文件")
    public Result<Boolean> batchDeleteFiles(@RequestBody List<Long> fileIds) {
        Boolean result = fileService.batchDeleteFiles(fileIds);
        return Result.success(result);
    }

    /**
     * 获取文件详情
     */
    @GetMapping("/{fileId}")
    @Operation(summary = "获取文件详情", description = "根据ID获取文件详情")
    public Result<FileInfoVO> getFileInfo(@PathVariable Long fileId) {
        FileInfoVO fileInfo = fileService.getFileInfo(fileId);
        return Result.success(fileInfo);
    }

    /**
     * 分页查询文件
     */
    @PostMapping("/page")
    @Operation(summary = "分页查询文件", description = "分页查询文件列表")
    public Result<PageResult<FileInfoVO>> pageFiles(@RequestBody FileQueryDTO dto) {
        PageResult<FileInfoVO> pageResult = fileService.pageFiles(dto);
        return Result.success(pageResult);
    }

    /**
     * 获取文件预览URL
     */
    @GetMapping("/preview/{fileId}")
    @Operation(summary = "获取文件预览URL", description = "获取文件预览URL")
    public Result<String> getPreviewUrl(@PathVariable String fileId) {
        // 从fileId中提取真实的文件ID（去除扩展名）
        Long realFileId = extractFileId(fileId);
        String previewUrl = fileService.getPreviewUrl(realFileId);
        return Result.success(previewUrl);
    }

    /**
     * 预览文件（直接返回文件内容）
     */
    @GetMapping("/preview/{fileId}/**")
    @Operation(summary = "预览文件", description = "预览指定文件内容")
    public void previewFile(
            @PathVariable String fileId,
            HttpServletResponse response) throws IOException {
        // 从fileId中提取真实的文件ID（去除扩展名）
        Long realFileId = extractFileId(fileId);
        fileService.previewFile(realFileId, response);
    }

    /**
     * 按文件哈希预览（兼容历史 RustFS 直链头像）。
     */
    @GetMapping("/hash-preview/{hashWithExt}")
    @Operation(summary = "按哈希预览文件", description = "根据文件哈希预览图片，兼容历史对象存储直链")
    public void previewFileByHash(
            @PathVariable String hashWithExt,
            HttpServletResponse response) throws IOException {
        Long fileId = fileService.resolveFileIdByHash(hashWithExt);
        fileService.previewFile(fileId, response);
    }

    /**
     * 从URL转换图片（下载并上传到系统）
     */
    @PostMapping("/convert-url")
    @Operation(summary = "从URL转换图片", description = "下载外部图片并上传到系统")
    @OperationLog(module = "文件管理", operation = "URL转换", description = "从URL转换图片")
    public Result<UrlConvertResponse> convertFromUrl(@RequestParam String imageUrl) {
        UrlConvertResponse response = fileService.convertFromUrl(imageUrl);
        return Result.success(response);
    }

    /**
     * 批量转换图片URL
     */
    @PostMapping("/batch-convert")
    @Operation(summary = "批量转换图片URL", description = "批量下载外部图片并上传到系统")
    @OperationLog(module = "文件管理", operation = "批量转换", description = "批量转换图片URL")
    public Result<BatchConvertResponse> batchConvertUrls(@RequestBody List<String> imageUrls) {
        BatchConvertResponse response = fileService.batchConvertUrls(imageUrls);
        return Result.success(response);
    }

    /**
     * 文件格式转换
     */
    @PostMapping("/convert/{fileId}")
    @Operation(summary = "文件格式转换", description = "转换文件格式")
    @OperationLog(module = "文件管理", operation = "格式转换", description = "文件格式转换")
    public Result<Long> convertFileFormat(
            @PathVariable Long fileId,
            @RequestParam String targetFormat) {
        Long convertedFileId = fileService.convertFileFormat(fileId, targetFormat);
        return Result.success(convertedFileId);
    }

    /**
     * 流式播放HLS master播放列表
     */
    @GetMapping("/stream/{fileId}/master.m3u8")
    @Operation(summary = "HLS播放列表", description = "获取HLS master播放列表")
    public void streamMasterPlaylist(
            @PathVariable Long fileId,
            HttpServletResponse response) throws IOException {
        fileService.streamMasterPlaylist(fileId, response);
    }

    /**
     * 流式播放HLS TS分片
     */
    @GetMapping("/stream/{fileId}/{segment:.+\\.ts}")
    @Operation(summary = "HLS分片", description = "获取HLS TS分片")
    public void streamSegment(
            @PathVariable Long fileId,
            @PathVariable String segment,
            HttpServletResponse response) throws IOException {
        fileService.streamSegment(fileId, segment, response);
    }

    /**
     * 获取缩略图
     */
    @GetMapping("/thumbnail/{fileId}")
    @Operation(summary = "获取缩略图", description = "获取视频缩略图")
    public void getThumbnail(
            @PathVariable Long fileId,
            HttpServletResponse response) throws IOException {
        fileService.getThumbnail(fileId, response);
    }

    /**
     * 对象存储用量（S3 ListObjects 或 kb_file 元数据）。
     *
     * <p>网关：{@code GET /api/file/files/storage/usage}</p>
     *
     * @return usedBytes / source / dbBytes
     */
    @GetMapping("/storage/usage")
    @Operation(summary = "对象存储用量", description = "优先 ListObjects 累加；失败回退 kb_file 表 SUM(file_size)")
    public Result<Map<String, Object>> storageUsage() {
        return Result.success(fileService.getStorageUsage());
    }

    /**
     * 从文件ID中提取真实的文件ID（去除扩展名）
     *
     * @param fileId 可能包含扩展名的文件ID
     * @return 真实的文件ID
     */
    private Long extractFileId(String fileId) {
        if (fileId == null || fileId.isEmpty()) {
            throw new IllegalArgumentException("文件ID不能为空");
        }

        // 查找第一个点号，提取点号之前的部分作为真实的文件ID
        int dotIndex = fileId.indexOf('.');
        String realIdStr = dotIndex > 0 ? fileId.substring(0, dotIndex) : fileId;

        try {
            return Long.parseLong(realIdStr);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("无效的文件ID格式: " + fileId);
        }
    }
}
