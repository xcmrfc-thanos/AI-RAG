-- =====================================================
-- kb-file 音视频功能扩展 — tb_file 表字段新增
-- 添加媒体元数据、转码状态、HLS路径、缩略图路径字段
-- =====================================================

ALTER TABLE tb_file
    ADD COLUMN duration         INT          COMMENT '时长(秒)',
    ADD COLUMN resolution       VARCHAR(20)  COMMENT '分辨率 如1920x1080',
    ADD COLUMN bitrate          INT          COMMENT '码率(kbps)',
    ADD COLUMN transcode_status VARCHAR(20)  DEFAULT NULL COMMENT '转码状态: PENDING/PROCESSING/DONE/FAILED',
    ADD COLUMN hls_path         VARCHAR(500) COMMENT 'HLS播放列表目录路径(相对于bucket)',
    ADD COLUMN thumbnail_path   VARCHAR(500) COMMENT '缩略图路径(相对于bucket)';

-- 为转码状态字段添加索引，加速前端轮询查询
CREATE INDEX idx_transcode_status ON tb_file(transcode_status);
