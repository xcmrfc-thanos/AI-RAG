package com.knowledge.base.file.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.knowledge.base.file.entity.FileInfo;

/**
 * 文件Mapper接口
 *
 * @author 苏三
 * @since 1.0.0
 */
public interface FileMapper extends BaseMapper<FileInfo> {

    /**
     * 统计未删除且有效文件总字节数。
     *
     * @return 总大小，无记录时为 0
     */
    Long sumTotalFileSize();
}
