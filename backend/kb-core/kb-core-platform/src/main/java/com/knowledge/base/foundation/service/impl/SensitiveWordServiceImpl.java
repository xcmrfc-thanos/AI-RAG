package com.knowledge.base.foundation.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.knowledge.base.common.utils.SnowflakeIdGenerator;
import com.knowledge.base.foundation.dto.SensitiveCheckResult;
import com.knowledge.base.foundation.entity.SensitiveHomophone;
import com.knowledge.base.foundation.entity.SensitiveRegex;
import com.knowledge.base.foundation.entity.SensitiveWord;
import com.knowledge.base.foundation.mapper.SensitiveHomophoneMapper;
import com.knowledge.base.foundation.mapper.SensitiveRegexMapper;
import com.knowledge.base.foundation.mapper.SensitiveWordMapper;
import com.knowledge.base.foundation.sensitive.AhoCorasickMatcher;
import com.knowledge.base.foundation.sensitive.SensitiveTextNormalizer;
import com.knowledge.base.foundation.service.SensitiveWordService;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 敏感词服务实现：词库 CRUD + 内存 AC/正则检测。
 */
@Slf4j
@Service
public class SensitiveWordServiceImpl implements SensitiveWordService {

    @Resource
    private SensitiveWordMapper wordMapper;
    @Resource
    private SensitiveRegexMapper regexMapper;
    @Resource
    private SensitiveHomophoneMapper homophoneMapper;

    private final AtomicReference<RuntimeEngine> engineRef = new AtomicReference<>(RuntimeEngine.empty());

    /**
     * 启动加载词库到内存。
     */
    /**
     * 初始化。
     */
    @PostConstruct
    public void init() {
        try {
            reload();
        } catch (Exception e) {
            log.warn("敏感词引擎初始化跳过（表可能尚未创建）: {}", e.getMessage());
        }
    }

    /**
     * 分页查询Words。
     */
    @Override
    public IPage<SensitiveWord> pageWords(long current, long size, String keyword, String category, Integer enabled) {
        LambdaQueryWrapper<SensitiveWord> q = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(keyword)) {
            q.like(SensitiveWord::getWord, keyword.trim());
        }
        if (StringUtils.hasText(category)) {
            q.eq(SensitiveWord::getCategory, category.trim());
        }
        if (enabled != null) {
            q.eq(SensitiveWord::getEnabled, enabled);
        }
        q.orderByDesc(SensitiveWord::getUpdatedAt);
        return wordMapper.selectPage(new Page<>(current, size), q);
    }

    /**
     * 创建Word。
     */
    @Override
    public boolean createWord(SensitiveWord word) {
        if (word == null || !StringUtils.hasText(word.getWord())) {
            throw new IllegalArgumentException("词条不能为空");
        }
        word.setId(SnowflakeIdGenerator.getInstance().nextId());
        word.setWord(word.getWord().trim());
        if (!StringUtils.hasText(word.getCategory())) {
            word.setCategory("custom");
        }
        if (!StringUtils.hasText(word.getAction())) {
            word.setAction("block");
        }
        if (word.getEnabled() == null) {
            word.setEnabled(1);
        }
        boolean ok = wordMapper.insert(word) > 0;
        if (ok) {
            reload();
        }
        return ok;
    }

    /**
     * 更新Word。
     */
    @Override
    public boolean updateWord(Long id, SensitiveWord word) {
        SensitiveWord db = wordMapper.selectById(id);
        if (db == null) {
            throw new IllegalArgumentException("词条不存在");
        }
        if (StringUtils.hasText(word.getWord())) {
            db.setWord(word.getWord().trim());
        }
        if (StringUtils.hasText(word.getCategory())) {
            db.setCategory(word.getCategory());
        }
        if (StringUtils.hasText(word.getAction())) {
            db.setAction(word.getAction());
        }
        db.setReplaceTo(word.getReplaceTo());
        if (word.getEnabled() != null) {
            db.setEnabled(word.getEnabled());
        }
        db.setRemark(word.getRemark());
        boolean ok = wordMapper.updateById(db) > 0;
        if (ok) {
            reload();
        }
        return ok;
    }

    /**
     * 删除Word。
     */
    @Override
    public boolean deleteWord(Long id) {
        boolean ok = wordMapper.deleteById(id) > 0;
        if (ok) {
            reload();
        }
        return ok;
    }

    /**
     * 导入Words。
     */
    @Override
    public int importWords(List<String> lines, String category, String action) {
        if (lines == null || lines.isEmpty()) {
            return 0;
        }
        String cat = StringUtils.hasText(category) ? category : "custom";
        String act = StringUtils.hasText(action) ? action : "block";
        int n = 0;
        for (String line : lines) {
            if (!StringUtils.hasText(line)) {
                continue;
            }
            String w = line.trim();
            if (w.startsWith("#")) {
                continue;
            }
            Long exists = wordMapper.selectCount(new LambdaQueryWrapper<SensitiveWord>().eq(SensitiveWord::getWord, w));
            if (exists != null && exists > 0) {
                continue;
            }
            SensitiveWord row = new SensitiveWord();
            row.setId(SnowflakeIdGenerator.getInstance().nextId());
            row.setWord(w);
            row.setCategory(cat);
            row.setAction(act);
            row.setEnabled(1);
            row.setRemark("批量导入");
            if (wordMapper.insert(row) > 0) {
                n++;
            }
        }
        if (n > 0) {
            reload();
        }
        return n;
    }

    /**
     * 列表查询Regex。
     */
    @Override
    public List<SensitiveRegex> listRegex() {
        return regexMapper.selectList(new LambdaQueryWrapper<SensitiveRegex>().orderByAsc(SensitiveRegex::getId));
    }

    /**
     * 保存Regex。
     */
    @Override
    public boolean saveRegex(SensitiveRegex regex) {
        if (regex == null || !StringUtils.hasText(regex.getPattern())) {
            throw new IllegalArgumentException("正则不能为空");
        }
        Pattern.compile(regex.getPattern());
        boolean ok;
        if (regex.getId() == null) {
            regex.setId(SnowflakeIdGenerator.getInstance().nextId());
            if (!StringUtils.hasText(regex.getName())) {
                regex.setName("规则");
            }
            if (!StringUtils.hasText(regex.getCategory())) {
                regex.setCategory("privacy");
            }
            if (!StringUtils.hasText(regex.getAction())) {
                regex.setAction("block");
            }
            if (regex.getEnabled() == null) {
                regex.setEnabled(1);
            }
            ok = regexMapper.insert(regex) > 0;
        } else {
            ok = regexMapper.updateById(regex) > 0;
        }
        if (ok) {
            reload();
        }
        return ok;
    }

    /**
     * 删除Regex。
     */
    @Override
    public boolean deleteRegex(Long id) {
        boolean ok = regexMapper.deleteById(id) > 0;
        if (ok) {
            reload();
        }
        return ok;
    }

    /**
     * 列表查询Homophones。
     */
    @Override
    public List<SensitiveHomophone> listHomophones() {
        return homophoneMapper.selectList(new LambdaQueryWrapper<SensitiveHomophone>().orderByAsc(SensitiveHomophone::getId));
    }

    /**
     * 保存Homophone。
     */
    @Override
    public boolean saveHomophone(SensitiveHomophone row) {
        if (row == null || !StringUtils.hasText(row.getSrc()) || !StringUtils.hasText(row.getDst())) {
            throw new IllegalArgumentException("谐音映射 src/dst 不能为空");
        }
        boolean ok;
        if (row.getId() == null) {
            row.setId(SnowflakeIdGenerator.getInstance().nextId());
            if (row.getEnabled() == null) {
                row.setEnabled(1);
            }
            ok = homophoneMapper.insert(row) > 0;
        } else {
            ok = homophoneMapper.updateById(row) > 0;
        }
        if (ok) {
            reload();
        }
        return ok;
    }

    /**
     * 删除Homophone。
     */
    @Override
    public boolean deleteHomophone(Long id) {
        boolean ok = homophoneMapper.deleteById(id) > 0;
        if (ok) {
            reload();
        }
        return ok;
    }

    /**
     * 从库重载词库、正则、谐音到内存引擎。
     */
    /**
     * 重载。
     */
    @Override
    public synchronized void reload() {
        List<SensitiveWord> words = wordMapper.selectList(new LambdaQueryWrapper<SensitiveWord>()
                .eq(SensitiveWord::getEnabled, 1));
        List<SensitiveRegex> regexes = regexMapper.selectList(new LambdaQueryWrapper<SensitiveRegex>()
                .eq(SensitiveRegex::getEnabled, 1));
        List<SensitiveHomophone> homes = homophoneMapper.selectList(new LambdaQueryWrapper<SensitiveHomophone>()
                .eq(SensitiveHomophone::getEnabled, 1));

        Map<String, String> homo = new HashMap<>();
        for (SensitiveHomophone h : homes) {
            homo.put(h.getSrc(), h.getDst());
        }

        List<String> acWords = new ArrayList<>();
        Map<String, SensitiveWord> wordByNorm = new HashMap<>();
        for (SensitiveWord w : words) {
            String norm = SensitiveTextNormalizer.normalize(w.getWord(), homo);
            if (!StringUtils.hasText(norm)) {
                continue;
            }
            acWords.add(norm);
            wordByNorm.put(norm, w);
        }
        AhoCorasickMatcher matcher = new AhoCorasickMatcher(acWords);

        List<CompiledRegex> compiled = new ArrayList<>();
        for (SensitiveRegex r : regexes) {
            try {
                compiled.add(new CompiledRegex(r, Pattern.compile(r.getPattern())));
            } catch (Exception ex) {
                log.warn("跳过非法正则 {}: {}", r.getName(), ex.getMessage());
            }
        }
        engineRef.set(new RuntimeEngine(matcher, wordByNorm, compiled, homo));
        log.info("敏感词引擎已重载: words={}, regex={}, homophone={}", words.size(), compiled.size(), homo.size());
    }

    /**
     * 对文本执行 L1（AC）+ L1.5（正则）检测，并按策略生成替换结果。
     *
     * @param text 待检测原文
     * @return 检测结果（是否拦截、命中明细、替换后文本）
     */
    /**
     * 检测。
     */
    @Override
    public SensitiveCheckResult check(String text) {
        String raw = text == null ? "" : text;
        RuntimeEngine eng = engineRef.get();
        String normalized = SensitiveTextNormalizer.normalize(raw, eng.homophones());

        List<SensitiveCheckResult.HitItem> hits = new ArrayList<>();
        boolean blocked = false;
        String filtered = raw;

        for (AhoCorasickMatcher.Hit hit : eng.matcher().findAll(normalized)) {
            SensitiveWord w = eng.wordByNorm().get(hit.word());
            if (w == null) {
                continue;
            }
            hits.add(SensitiveCheckResult.HitItem.builder()
                    .type("word")
                    .word(w.getWord())
                    .category(w.getCategory())
                    .action(w.getAction())
                    .start(hit.start())
                    .end(hit.end())
                    .build());
            if ("block".equalsIgnoreCase(w.getAction())) {
                blocked = true;
            } else if ("replace".equalsIgnoreCase(w.getAction())) {
                String rep = StringUtils.hasText(w.getReplaceTo()) ? w.getReplaceTo() : "***";
                filtered = filtered.replace(w.getWord(), rep);
            }
        }

        for (CompiledRegex cr : eng.regexes()) {
            Matcher m = cr.pattern().matcher(raw);
            while (m.find()) {
                hits.add(SensitiveCheckResult.HitItem.builder()
                        .type("regex")
                        .word(cr.rule().getName() + ":" + m.group())
                        .category(cr.rule().getCategory())
                        .action(cr.rule().getAction())
                        .start(m.start())
                        .end(m.end())
                        .build());
                if ("block".equalsIgnoreCase(cr.rule().getAction())) {
                    blocked = true;
                } else if ("replace".equalsIgnoreCase(cr.rule().getAction())) {
                    String rep = StringUtils.hasText(cr.rule().getReplaceTo()) ? cr.rule().getReplaceTo() : "***";
                    filtered = filtered.replace(m.group(), rep);
                }
            }
        }

        return SensitiveCheckResult.builder()
                .blocked(blocked)
                .hit(!hits.isEmpty())
                .filteredText(filtered)
                .hits(hits)
                .build();
    }

    /**
     * 已编译的正则规则。
     *
     * @param rule    库表规则
     * @param pattern 编译后的 Pattern
     */
    private record CompiledRegex(SensitiveRegex rule, Pattern pattern) {
    }

    /**
     * 运行时引擎快照（不可变，通过 AtomicReference 整体替换）。
     *
     * @param matcher     AC 自动机
     * @param wordByNorm  归一化词 → 词条
     * @param regexes     已编译正则
     * @param homophones  谐音表
     */
    private record RuntimeEngine(
            AhoCorasickMatcher matcher,
            Map<String, SensitiveWord> wordByNorm,
            List<CompiledRegex> regexes,
            Map<String, String> homophones
    ) {
        /**
         * 空引擎（表未就绪或初始化失败时使用）。
         *
         * @return 空快照
         */
        static RuntimeEngine empty() {
            return new RuntimeEngine(new AhoCorasickMatcher(List.of()), Map.of(), List.of(), Map.of());
        }
    }
}
