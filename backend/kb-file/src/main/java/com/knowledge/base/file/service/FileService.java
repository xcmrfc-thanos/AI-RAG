package com.knowledge.base.file.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.knowledge.base.common.result.PageResult;
import com.knowledge.base.file.dto.FileQueryDTO;
import com.knowledge.base.file.dto.FileUploadDTO;
import com.knowledge.base.file.dto.ResumableMergeDTO;
import com.knowledge.base.file.entity.FileInfo;
import com.knowledge.base.file.vo.FileInfoVO;
import com.knowledge.base.file.vo.UrlConvertResponse;
import com.knowledge.base.file.vo.BatchConvertResponse;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Optional;

/**
 * 文件Service接口
 *
 * @author 苏三
 * @since 1.0.0
 */
public interface FileService extends IService<FileInfo> {

    /**
     * 上传文件
     *
     * @param file 文件
     * @param dto  上传参数
     * @return 文件信息
     */
    FileInfoVO uploadFile(MultipartFile file, FileUploadDTO dto);

    /**
     * 批量上传文件
     *
     * @param files 文件列表
     * @param dto   上传参数
     * @return 文件信息列表
     */
    List<FileInfoVO> uploadFiles(MultipartFile[] files, FileUploadDTO dto);

    /**
     * 下载文件
     *
     * @param fileId     文件ID
     * @param response   HTTP响应
     */
    void downloadFile(Long fileId, HttpServletResponse response) throws IOException;

    /**
     * 获取文件流
     *
     * @param fileId 文件ID
     * @return 文件流
     */
    InputStream getFileStream(Long fileId) throws IOException;

    /**
     * 删除文件
     *
     * @param fileId 文件ID
     * @return 是否成功
     */
    Boolean deleteFile(Long fileId);

    /**
     * 批量删除文件
     *
     * @param fileIds 文件ID列表
     * @return 是否成功
     */
    Boolean batchDeleteFiles(List<Long> fileIds);

    /**
     * 获取文件详情
     *
     * @param fileId 文件ID
     * @return 文件信息
     */
    FileInfoVO getFileInfo(Long fileId);

    /**
     * 分页查询文件
     *
     * @param dto 查询参数
     * @return 分页结果
     */
    PageResult<FileInfoVO> pageFiles(FileQueryDTO dto);

    /**
     * 获取文件预览URL
     *
     * @param fileId 文件ID
     * @return 预览URL
     */
    String getPreviewUrl(Long fileId);

    /**
     * 预览文件（直接返回文件内容）
     *
     * @param fileId 文件ID
     * @param response HTTP响应
     */
    void previewFile(Long fileId, HttpServletResponse response) throws IOException;

    /**
     * 根据文件哈希解析文件 ID（兼容历史 RustFS 直链）。
     *
     * @param hashWithExt 哈希值，可带扩展名
     * @return 文件 ID
     */
    Long resolveFileIdByHash(String hashWithExt);

    /**
     * 按文件哈希查询可秒传文件（status=1）。
     *
     * <p>哈希算法与上传侧一致：整文件 SHA-256，十六进制小写字符串（非 MD5）。
     * 前端应对齐使用 {@code crypto.subtle.digest('SHA-256', ...)}，禁止混用 spark-md5。</p>
     *
     * @param fileHash 文件内容 SHA-256 十六进制摘要
     * @return 已存在且有效的文件信息；不存在则为 empty
     */
    Optional<FileInfoVO> findByHash(String fileHash);

    /**
     * 文件格式转换
     *
     * @param fileId      文件ID
     * @param targetFormat 目标格式
     * @return 转换后的文件ID
     */
    Long convertFileFormat(Long fileId, String targetFormat);

    /**
     * 初始化断点续传会话。
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
    String initResumableUpload(String fileHash, String fileName, long totalSize, int chunkCount, String contentType);

    /**
     * 上传单个分片。
     *
     * @param sessionId  会话 ID
     * @param chunkIndex 分片索引（从 0 开始）
     * @param chunkFile  分片数据
     * @return 是否成功
     */
    Boolean uploadChunk(String sessionId, int chunkIndex, MultipartFile chunkFile);

    /**
     * 查询已上传分片索引列表。
     *
     * @param sessionId 会话 ID
     * @return 已上传分片索引数组
     */
    int[] getUploadedChunks(String sessionId);

    /**
     * 合并分片并落库文件元数据。
     *
     * <p>从会话读取 fileHash/fileName/relativePath/totalSize，禁止用 sessionId 伪造哈希。</p>
     *
     * @param sessionId 会话 ID
     * @param dto       合并参数（含可选 fileHash/fileName 冗余校验）
     * @return 文件信息
     */
    FileInfoVO mergeChunks(String sessionId, ResumableMergeDTO dto);

    /**
     * 从URL转换图片（下载并上传到系统）
     *
     * @param imageUrl 外部图片URL
     * @return 转换结果
     */
    UrlConvertResponse convertFromUrl(String imageUrl);

    /**
     * 批量转换图片URL
     *
     * @param imageUrls 外部图片URL列表
     * @return 批量转换结果
     */
    BatchConvertResponse batchConvertUrls(List<String> imageUrls);

    /**
     * 流式播放HLS master播放列表
     *
     * @param fileId 文件ID
     * @param response HTTP响应
     */
    void streamMasterPlaylist(Long fileId, HttpServletResponse response) throws IOException;

    /**
     * 流式播放HLS TS分片
     *
     * @param fileId 文件ID
     * @param segment TS分片文件名
     * @param response HTTP响应
     */
    void streamSegment(Long fileId, String segment, HttpServletResponse response) throws IOException;

    /**
     * 获取缩略图
     *
     * @param fileId 文件ID
     * @param response HTTP响应
     */
    void getThumbnail(Long fileId, HttpServletResponse response) throws IOException;

    /**
     * 对象存储用量（优先 S3 ListObjects；失败回退 kb_file 表求和）。
     *
     * @return usedBytes / source / objectDbBytes 等
     */
    java.util.Map<String, Object> getStorageUsage();
}
