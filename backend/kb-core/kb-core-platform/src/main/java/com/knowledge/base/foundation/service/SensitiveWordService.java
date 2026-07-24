package com.knowledge.base.foundation.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.knowledge.base.foundation.dto.SensitiveCheckResult;
import com.knowledge.base.foundation.entity.SensitiveHomophone;
import com.knowledge.base.foundation.entity.SensitiveRegex;
import com.knowledge.base.foundation.entity.SensitiveWord;

import java.util.List;

/**
 * 敏感词管理与检测（L1 AC + L1.5 归一化/正则）。
 */
public interface SensitiveWordService {

    /**
     * 分页查询词条。
     */
    IPage<SensitiveWord> pageWords(long current, long size, String keyword, String category, Integer enabled);

    /**
     * 创建词条。
     */
    boolean createWord(SensitiveWord word);

    /**
     * 更新词条。
     */
    boolean updateWord(Long id, SensitiveWord word);

    /**
     * 删除词条。
     */
    boolean deleteWord(Long id);

    /**
     * 批量导入词条（按行，已存在则跳过）。
     */
    int importWords(List<String> lines, String category, String action);

    /**
     * 正则规则列表。
     */
    List<SensitiveRegex> listRegex();

    /**
     * 保存正则（新建或更新）。
     */
    boolean saveRegex(SensitiveRegex regex);

    /**
     * 删除正则。
     */
    boolean deleteRegex(Long id);

    /**
     * 谐音列表。
     */
    List<SensitiveHomophone> listHomophones();

    /**
     * 保存谐音。
     */
    boolean saveHomophone(SensitiveHomophone row);

    /**
     * 删除谐音。
     */
    boolean deleteHomophone(Long id);

    /**
     * 重载内存自动机。
     */
    void reload();

    /**
     * 检测文本。
     */
    SensitiveCheckResult check(String text);
}
