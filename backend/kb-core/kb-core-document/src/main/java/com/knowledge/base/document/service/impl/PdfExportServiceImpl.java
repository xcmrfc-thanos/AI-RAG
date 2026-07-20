package com.knowledge.base.document.service.impl;

import cn.hutool.core.io.FileUtil;
import cn.hutool.core.util.IdUtil;
import cn.hutool.http.HttpUtil;
import com.knowledge.base.common.exception.BusinessException;
import com.knowledge.base.document.entity.Category;
import com.knowledge.base.document.entity.Document;
import com.knowledge.base.document.entity.mongodb.DocumentContent;
import com.knowledge.base.document.mapper.CategoryMapper;
import com.knowledge.base.document.service.DocumentContentService;
import com.knowledge.base.document.service.DocumentService;
import com.knowledge.base.document.service.FileUploadService;
import com.knowledge.base.document.service.PdfExportService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.apache.fontbox.ttf.TrueTypeCollection;
import org.apache.fontbox.ttf.TrueTypeFont;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.Closeable;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * PDF导出服务实现类
 *
 * <p>使用Apache PDFBox将文档内容转换为PDF格式</p>
 *
 * @author 苏三
 * @since 1.0.0
 */
@Slf4j
@Service
public class PdfExportServiceImpl implements PdfExportService {

    @Resource
    private DocumentService documentService;

    @Resource
    private DocumentContentService documentContentService;

    @Resource
    private FileUploadService fileUploadService;

    @Resource
    private CategoryMapper categoryMapper;

    @Value("${file.upload.path:/data/knowledge-base/uploads}")
    private String uploadPath;

    private static final float MARGIN = 50;
    private static final float LINE_HEIGHT = 20;
    private static final float FONT_SIZE = 12;
    private static final float TITLE_FONT_SIZE = 18;
    private static final float SUBTITLE_FONT_SIZE = 10;
    private static final float CODE_FONT_SIZE = 9;
    private static final float CODE_LINE_HEIGHT = 14;
    // One Dark Pro code editor colors
    private static final Color CODE_BG = new Color(40, 44, 52);
    private static final Color CODE_BORDER = new Color(62, 68, 81);
    private static final Color CODE_HEADER_BG = new Color(33, 37, 43);
    private static final Color CODE_TEXT = new Color(171, 178, 191);
    private static final Color TABLE_HEADER_BG = new Color(240, 242, 245);
    private static final Color TABLE_BORDER = new Color(200, 200, 200);

    private static final Pattern MARKDOWN_HEADING = Pattern.compile("^(#{1,6})\\s+(.+)$");
    private static final Pattern MARKDOWN_CODE = Pattern.compile("^```(\\w*)\\s*$");
    private static final Pattern MARKDOWN_BOLD = Pattern.compile("\\*\\*(.+?)\\*\\*");
    private static final Pattern MARKDOWN_ITALIC = Pattern.compile("\\*(.+?)\\*");
    private static final Pattern MARKDOWN_LINK = Pattern.compile("\\[(.+?)\\]\\((.+?)\\)");
    private static final Pattern MARKDOWN_LIST = Pattern.compile("^[-*+]\\s+(.+)$");
    private static final Pattern MARKDOWN_NUMBER_LIST = Pattern.compile("^\\d+\\.\\s+(.+)$");
    private static final Pattern MARKDOWN_IMAGE = Pattern.compile("!\\[([^\\]]*)\\]\\(([^)]+)\\)");
    private static final Pattern MARKDOWN_IMAGE_TITLE = Pattern.compile("!\\[([^\\]]*)\\]\\(([^)]+)\\s+\"([^\"]+)\"\\)");

    private static final float DEFAULT_IMAGE_WIDTH = 400;
    private static final float DEFAULT_IMAGE_HEIGHT = 300;

    /**
     * 系统中文字体路径（按优先级排序）
     */
    private static final String[] CHINESE_FONT_PATHS = {
            // Windows：优先独立 TTF（PDFBox 子集化安全）；TTC 须在 document.save 后再 close
            "C:\\Windows\\Fonts\\simhei.ttf",
            "C:\\Windows\\Fonts\\simkai.ttf",
            "C:\\Windows\\Fonts\\msyh.ttc",
            "C:\\Windows\\Fonts\\msyhbd.ttc",
            "C:\\Windows\\Fonts\\msjh.ttc",
            "C:\\Windows\\Fonts\\simsun.ttc",
            // macOS
            "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
            "/Library/Fonts/Arial Unicode.ttf",
            "/Library/Fonts/Songti.ttc",
            "/Library/Fonts/STSong.ttf",
            "/Library/Fonts/Hiragino Sans GB W3.ttc",
            // Linux
            "/usr/share/fonts/wqy/wqy-zenhei.ttc",
            "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
            "/usr/share/fonts/truetype/simsun/simsun.ttc",
            "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
            "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc"
    };

    @Override
    public String exportDocumentToPdf(Long documentId) {
        log.info("导出文档为PDF：documentId={}", documentId);

        Document document = documentService.getById(documentId);
        if (document == null) {
            throw new BusinessException("文档不存在");
        }

        String content = resolveExportContent(document);

        String categoryName = resolveCategoryName(document.getCategoryId());
        byte[] pdfBytes = generatePdf(document.getTitle(), content, document.getAuthorName(),
                categoryName, document.getSummary(), document.getPublishTime());

        String fileName = generatePdfFileName(documentId, document.getTitle());

        String pdfUrl = fileUploadService.uploadBytes(pdfBytes, fileName, "application/pdf");
        log.info("PDF导出成功：documentId={}, pdfUrl={}", documentId, pdfUrl);

        return pdfUrl;
    }

    @Override
    public byte[] exportDocumentToPdfBytes(Long documentId) {
        log.info("导出文档为PDF字节数组：documentId={}", documentId);

        Document document = documentService.getById(documentId);
        if (document == null) {
            throw new BusinessException("文档不存在");
        }

        String content = resolveExportContent(document);

        String categoryName = resolveCategoryName(document.getCategoryId());
        return generatePdf(document.getTitle(), content, document.getAuthorName(),
                categoryName, document.getSummary(), document.getPublishTime());
    }

    @Override
    public byte[] batchExportDocuments(List<String> documentIds, String format) {
        log.info("批量导出文档：documentIds={}, format={}", documentIds, format);

        // 将String ID转为Long，避免JavaScript精度丢失
        List<Long> longIds = documentIds.stream()
                .map(Long::parseLong)
                .collect(Collectors.toList());

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {

            List<Document> documents = documentService.listByIds(longIds);
            log.info("查询到{}个文档（请求{}个）", documents.size(), documentIds.size());
            for (Document document : documents) {
                String content = resolveExportContent(document);
                if (content == null) content = "";

                String fileName;
                byte[] fileBytes;

                if ("markdown".equalsIgnoreCase(format)) {
                    fileName = sanitizeFileName(document.getTitle()) + ".md";
                    fileBytes = content.getBytes(StandardCharsets.UTF_8);
                } else {
                    String categoryName = resolveCategoryName(document.getCategoryId());
                    byte[] pdfBytes = generatePdf(document.getTitle(), content,
                            document.getAuthorName(), categoryName, document.getSummary(),
                            document.getPublishTime());
                    fileName = generatePdfFileName(document.getId(), document.getTitle());
                    fileBytes = pdfBytes;
                }

                ZipEntry entry = new ZipEntry(fileName);
                zos.putNextEntry(entry);
                zos.write(fileBytes);
                zos.closeEntry();
            }

            zos.finish();
        } catch (IOException e) {
            log.error("批量导出失败", e);
            throw new RuntimeException("批量导出失败：" + e.getMessage());
        }

        log.info("批量导出成功：共{}个文档", documentIds.size());
        return baos.toByteArray();
    }

    /**
     * 解析导出正文：优先 contentId → Mongo 按文档ID → MySQL content → getDocumentById 同源解析。
     *
     * @param document 文档实体
     * @return 正文，永不为 null
     */
    private String resolveExportContent(Document document) {
        if (document == null) {
            return "";
        }
        if (document.getContentId() != null && !document.getContentId().isBlank()) {
            try {
                DocumentContent byId = documentContentService.getContentById(document.getContentId());
                if (byId != null && byId.getContent() != null && !byId.getContent().isEmpty()) {
                    return byId.getContent();
                }
            } catch (Exception e) {
                log.warn("按 contentId 取正文失败：documentId={}, contentId={}, err={}",
                        document.getId(), document.getContentId(), e.getMessage());
            }
        }
        if (document.getId() != null) {
            try {
                DocumentContent byDoc = documentContentService.getContentByDocumentId(document.getId());
                if (byDoc != null && byDoc.getContent() != null && !byDoc.getContent().isEmpty()) {
                    return byDoc.getContent();
                }
            } catch (Exception e) {
                log.warn("按 documentId 取正文失败：documentId={}, err={}", document.getId(), e.getMessage());
            }
        }
        if (document.getContent() != null && !document.getContent().isEmpty()) {
            return document.getContent();
        }
        // 与详情页同源：可能 MySQL content 空但 VO 层能解析到正文
        try {
            var vo = documentService.getDocumentById(document.getId());
            if (vo != null && vo.getContent() != null && !vo.getContent().isEmpty()) {
                return vo.getContent();
            }
        } catch (Exception e) {
            log.warn("getDocumentById 取正文失败：documentId={}, err={}", document.getId(), e.getMessage());
        }
        return "";
    }

    private String sanitizeFileName(String title) {
        if (title == null || title.isEmpty()) {
            return "untitled";
        }
        return title.replaceAll("[\\\\/:*?\"<>|]", "_").trim();
    }

    @Override
    public String generatePdfFileName(Long documentId, String title) {
        String safeTitle = FileUtil.mainName(FileUtil.cleanInvalid(title));
        if (safeTitle == null || safeTitle.isEmpty()) {
            safeTitle = "document";
        }
        if (safeTitle.length() > 50) {
            safeTitle = safeTitle.substring(0, 50);
        }

        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        return String.format("%s_%s.pdf", safeTitle, timestamp);
    }

    private byte[] generatePdf(String title, String content, String author,
            String categoryName, String summary, LocalDateTime publishTime) {

        // 移除PDF字体不支持的字符（Emoji等）
        title = stripUnsupportedCharacters(title);
        content = stripUnsupportedCharacters(content);
        author = stripUnsupportedCharacters(author);
        categoryName = stripUnsupportedCharacters(categoryName);
        summary = stripUnsupportedCharacters(summary);

        List<Closeable> fontResources = new ArrayList<>();
        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {

            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            float yPosition = page.getMediaBox().getHeight() - MARGIN;
            float pageWidth = page.getMediaBox().getWidth() - 2 * MARGIN;
            boolean isFirstPage = true;

            // 加载中文字体（中文文档必须成功，禁止回退 Helvetica）
            PDType0Font chineseFont;
            try {
                chineseFont = loadChineseFont(document, fontResources);
                log.info("成功加载中文字体");
            } catch (Exception e) {
                log.error("无法加载中文字体", e);
                throw new BusinessException("无法加载中文字体，请确认系统已安装宋体/黑体/微软雅黑：" + e.getMessage());
            }

            PDPageContentStream contentStream = null;
            try {
                contentStream = new PDPageContentStream(document, page,
                        PDPageContentStream.AppendMode.OVERWRITE, true, true);

                if (isFirstPage) {
                    // ===== 标题（支持自动换行）=====
                    String displayTitle = title != null ? title : "无标题文档";
                    List<String> wrappedTitle = wrapTextByWidth(displayTitle, pageWidth,
                            chineseFont, TITLE_FONT_SIZE);
                    for (String titleLine : wrappedTitle) {
                        contentStream.beginText();
                        if (chineseFont != null) {
                            contentStream.setFont(chineseFont, TITLE_FONT_SIZE);
                        } else {
                            contentStream.setFont(PDType1Font.HELVETICA_BOLD, TITLE_FONT_SIZE);
                        }
                        contentStream.newLineAtOffset(MARGIN, yPosition);
                        showSafeText(contentStream, chineseFont, titleLine);
                        contentStream.endText();
                        yPosition -= LINE_HEIGHT * 1.5f;
                    }
                    yPosition -= LINE_HEIGHT * 0.5f;

                    // ===== 副标题（作者 + 发布时间，支持自动换行）=====
                    String subtitle = buildSubtitle(author, categoryName, publishTime);
                    List<String> wrappedSubtitle = wrapTextByWidth(subtitle, pageWidth,
                            chineseFont, SUBTITLE_FONT_SIZE);
                    for (String subLine : wrappedSubtitle) {
                        contentStream.beginText();
                        if (chineseFont != null) {
                            contentStream.setFont(chineseFont, SUBTITLE_FONT_SIZE);
                        } else {
                            contentStream.setFont(PDType1Font.HELVETICA, SUBTITLE_FONT_SIZE);
                        }
                        contentStream.newLineAtOffset(MARGIN, yPosition);
                        showSafeText(contentStream, chineseFont, subLine);
                        contentStream.endText();
                        yPosition -= LINE_HEIGHT;
                    }
                    yPosition -= LINE_HEIGHT;

                    // ===== 摘要 =====
                    if (summary != null && !summary.isEmpty()) {
                        String shortSummary = summary.length() > 200 ? summary.substring(0, 200) + "..." : summary;
                        // 摘要按宽度自动换行，防止溢出页面
                        List<String> wrappedSummary = wrapTextByWidth(shortSummary, pageWidth,
                                chineseFont, SUBTITLE_FONT_SIZE);
                        for (String summaryLine : wrappedSummary) {
                            if (yPosition < MARGIN + LINE_HEIGHT) {
                                contentStream.close();
                                page = new PDPage(PDRectangle.A4);
                                document.addPage(page);
                                contentStream = new PDPageContentStream(document, page,
                                        PDPageContentStream.AppendMode.OVERWRITE, true, true);
                                yPosition = page.getMediaBox().getHeight() - MARGIN;
                            }
                            contentStream.beginText();
                            if (chineseFont != null) {
                                contentStream.setFont(chineseFont, SUBTITLE_FONT_SIZE);
                            } else {
                                contentStream.setFont(PDType1Font.HELVETICA_OBLIQUE, SUBTITLE_FONT_SIZE);
                            }
                            contentStream.newLineAtOffset(MARGIN, yPosition);
                            showSafeText(contentStream, chineseFont, summaryLine);
                            contentStream.endText();
                            yPosition -= LINE_HEIGHT;
                        }
                        yPosition -= LINE_HEIGHT;
                    }

                    yPosition -= LINE_HEIGHT;

                    isFirstPage = false;
                }

                String[] lines = content.split("\n");
                for (int i = 0; i < lines.length; i++) {
                    String line = lines[i];

                    // ===== 代码块检测 =====
                    if (line.trim().startsWith("```")) {
                        String codeLang = line.trim().substring(3).trim();
                        List<String> codeLines = new ArrayList<>();
                        i++;
                        while (i < lines.length && !lines[i].trim().startsWith("```")) {
                            codeLines.add(lines[i]);
                            i++;
                        }
                        // 渲染代码块
                        if (!codeLines.isEmpty()) {
                            RenderResult result = renderCodeBlock(
                                    contentStream, document, page, codeLines, codeLang,
                                    chineseFont, yPosition, pageWidth, MARGIN);
                            yPosition = result.yPosition;
                            contentStream = result.contentStream;
                            page = result.page;
                        }
                        continue;
                    }

                    // ===== 表格检测 =====
                    if (i + 2 < lines.length && isTableRow(line.trim()) && isTableSeparator(lines[i + 1].trim())) {
                        List<String[]> tableData = new ArrayList<>();
                        tableData.add(parseTableRow(line.trim())); // 表头
                        i++; // 跳过分隔符行
                        i++; // 移到第一行数据
                        while (i < lines.length && isTableRow(lines[i].trim())) {
                            tableData.add(parseTableRow(lines[i].trim()));
                            i++;
                        }
                        i--; // 回退一行
                        // 渲染表格
                        RenderResult result = renderTable(
                                contentStream, document, page, tableData,
                                chineseFont, yPosition, pageWidth, MARGIN);
                        yPosition = result.yPosition;
                        contentStream = result.contentStream;
                        page = result.page;
                        continue;
                    }

                    // ===== 翻页检测 =====
                    if (yPosition < MARGIN + LINE_HEIGHT * 2) {
                        contentStream.close();
                        page = new PDPage(PDRectangle.A4);
                        document.addPage(page);
                        contentStream = new PDPageContentStream(document, page,
                                PDPageContentStream.AppendMode.OVERWRITE, true, true);
                        yPosition = page.getMediaBox().getHeight() - MARGIN;
                        isFirstPage = false;
                    }

                    Matcher headingMatcher = MARKDOWN_HEADING.matcher(line.trim());
                    if (headingMatcher.matches()) {
                        int level = headingMatcher.group(1).length();
                        float headingFontSize = TITLE_FONT_SIZE - (level - 1) * 2;
                        String headingText = headingMatcher.group(2);

                        // 标题也按宽度自动换行，防止长标题溢出页面
                        List<String> wrappedHeading = wrapTextByWidth(headingText, pageWidth,
                                chineseFont, headingFontSize);
                        for (String headingLine : wrappedHeading) {
                            // 标题换行时检查是否需要翻页
                            if (yPosition < MARGIN + LINE_HEIGHT * 1.5f) {
                                contentStream.close();
                                page = new PDPage(PDRectangle.A4);
                                document.addPage(page);
                                contentStream = new PDPageContentStream(document, page,
                                        PDPageContentStream.AppendMode.OVERWRITE, true, true);
                                yPosition = page.getMediaBox().getHeight() - MARGIN;
                                isFirstPage = false;
                            }
                            contentStream.beginText();
                            if (chineseFont != null) {
                                contentStream.setFont(chineseFont, headingFontSize);
                            } else {
                                contentStream.setFont(PDType1Font.HELVETICA_BOLD, headingFontSize);
                            }
                            contentStream.newLineAtOffset(MARGIN, yPosition);
                            showSafeText(contentStream, chineseFont, headingLine);
                            contentStream.endText();
                            yPosition -= LINE_HEIGHT * 1.3f;
                        }
                        yPosition -= LINE_HEIGHT * 0.2f; // 标题与正文额外间距
                        continue;
                    }

                    Matcher imageMatcher = MARKDOWN_IMAGE.matcher(line);
                    if (imageMatcher.find()) {
                        String imageUrl = imageMatcher.group(2);
                        String imageAlt = imageMatcher.group(1);
                        log.info("发现图片：alt={}, url={}", imageAlt, imageUrl);

                        RenderResult result = renderImage(
                                contentStream, document, page, imageUrl, imageAlt,
                                yPosition, pageWidth, MARGIN);
                        yPosition = result.yPosition;
                        contentStream = result.contentStream;
                        page = result.page;

                        String remainingText = MARKDOWN_IMAGE.matcher(line).replaceAll("").trim();
                        if (!remainingText.isEmpty()) {
                            List<String> wrappedLines = wrapTextByWidth(remainingText, pageWidth, chineseFont, FONT_SIZE);
                            for (String wrappedLine : wrappedLines) {
                                if (yPosition < MARGIN + LINE_HEIGHT) {
                                    contentStream.close();
                                    page = new PDPage(PDRectangle.A4);
                                    document.addPage(page);
                                    contentStream = new PDPageContentStream(document, page,
                                            PDPageContentStream.AppendMode.OVERWRITE, true, true);
                                    yPosition = page.getMediaBox().getHeight() - MARGIN;
                                }

                                contentStream.beginText();
                                if (chineseFont != null) {
                                    contentStream.setFont(chineseFont, FONT_SIZE);
                                } else {
                                    contentStream.setFont(PDType1Font.HELVETICA, FONT_SIZE);
                                }
                                contentStream.newLineAtOffset(MARGIN, yPosition);
                                showSafeText(contentStream, chineseFont, wrappedLine);
                                contentStream.endText();
                                yPosition -= LINE_HEIGHT;
                            }
                        }
                        continue;
                    }

                    if (line.trim().matches("^[-*+]\\s.*") || line.trim().matches("^\\d+\\.\\s.*")) {
                        // 使用 ASCII 前缀，避免 SimHei 等字体无 U+2022(•) 字形导致导出失败
                        String trimmed = line.trim();
                        Matcher numMatcher = MARKDOWN_NUMBER_LIST.matcher(trimmed);
                        Matcher bulletMatcher = MARKDOWN_LIST.matcher(trimmed);
                        String itemText;
                        if (numMatcher.matches()) {
                            int dotIdx = trimmed.indexOf('.');
                            String numberPrefix = trimmed.substring(0, dotIdx + 1) + " ";
                            itemText = numberPrefix + extractPlainText(numMatcher.group(1));
                        } else if (bulletMatcher.matches()) {
                            itemText = "- " + extractPlainText(bulletMatcher.group(1));
                        } else {
                            itemText = "- " + extractPlainText(trimmed.substring(Math.min(2, trimmed.length())));
                        }
                        // 列表项按宽度自动换行，防止溢出页面
                        float listMaxWidth = pageWidth - 20; // 减去列表缩进
                        List<String> wrappedList = wrapTextByWidth(itemText, listMaxWidth,
                                chineseFont, FONT_SIZE);
                        for (String listLine : wrappedList) {
                            if (yPosition < MARGIN + LINE_HEIGHT) {
                                contentStream.close();
                                page = new PDPage(PDRectangle.A4);
                                document.addPage(page);
                                contentStream = new PDPageContentStream(document, page,
                                        PDPageContentStream.AppendMode.OVERWRITE, true, true);
                                yPosition = page.getMediaBox().getHeight() - MARGIN;
                            }
                            contentStream.beginText();
                            if (chineseFont != null) {
                                contentStream.setFont(chineseFont, FONT_SIZE);
                            } else {
                                contentStream.setFont(PDType1Font.HELVETICA, FONT_SIZE);
                            }
                            contentStream.newLineAtOffset(MARGIN + 20, yPosition);
                            showSafeText(contentStream, chineseFont, listLine);
                            contentStream.endText();
                            yPosition -= LINE_HEIGHT;
                        }
                        continue;
                    }

                    if (line.trim().isEmpty()) {
                        yPosition -= LINE_HEIGHT * 0.5f;
                        continue;
                    }

                    String plainText = extractPlainText(line);
                    if (plainText.length() > 0) {
                        // 按实际字体宽度分行，避免中文字符溢出页面
                        List<String> wrappedLines = wrapTextByWidth(plainText, pageWidth,
                                chineseFont, FONT_SIZE);
                        for (String wrappedLine : wrappedLines) {
                            if (yPosition < MARGIN + LINE_HEIGHT) {
                                contentStream.close();
                                page = new PDPage(PDRectangle.A4);
                                document.addPage(page);
                                contentStream = new PDPageContentStream(document, page,
                                        PDPageContentStream.AppendMode.OVERWRITE, true, true);
                                yPosition = page.getMediaBox().getHeight() - MARGIN;
                            }

                            contentStream.beginText();
                            if (chineseFont != null) {
                                contentStream.setFont(chineseFont, FONT_SIZE);
                            } else {
                                contentStream.setFont(PDType1Font.HELVETICA, FONT_SIZE);
                            }
                            contentStream.newLineAtOffset(MARGIN, yPosition);
                            showSafeText(contentStream, chineseFont, wrappedLine);
                            contentStream.endText();
                            yPosition -= LINE_HEIGHT;
                        }
                    }
                }
            } finally {
                if (contentStream != null) {
                    contentStream.close();
                }
            }

            document.save(outputStream);
            return outputStream.toByteArray();

        } catch (IOException e) {
            log.error("生成PDF失败", e);
            throw new BusinessException("生成PDF失败：" + e.getMessage());
        } finally {
            // TTC 必须在 save 完成后再关闭，否则子集化时报 raf is null
            for (Closeable resource : fontResources) {
                try {
                    resource.close();
                } catch (Exception ignored) {
                    // ignore
                }
            }
        }
    }

    /**
     * 尝试加载系统中文字体（优先 classpath，再按路径逐个尝试；TTC 用 TrueTypeCollection）。
     *
     * @param document PDF 文档
     * @param fontResources 需延迟关闭的字体资源（如 TTC），在 document.save 后关闭
     * @return 已嵌入的中文字体
     * @throws IOException 全部候选均不可用
     */
    private PDType0Font loadChineseFont(PDDocument document, List<Closeable> fontResources) throws IOException {
        // 优先从classpath资源文件加载（保证部署到任何服务器都能正常工作）
        try (InputStream is = getClass().getResourceAsStream("/fonts/Arial Unicode.ttf")) {
            if (is != null) {
                log.info("从classpath资源加载中文字体：Arial Unicode.ttf");
                return PDType0Font.load(document, is);
            }
        } catch (Exception e) {
            log.warn("classpath Arial Unicode 加载失败：{}", e.getMessage());
        }
        try {
            InputStream is = getClass().getResourceAsStream("/fonts/simsun.ttc");
            if (is != null) {
                log.info("从classpath资源加载中文字体：simsun.ttc");
                return loadFontFromTtcStream(document, is, "classpath:/fonts/simsun.ttc", fontResources);
            }
        } catch (Exception e) {
            log.warn("classpath simsun.ttc 加载失败：{}", e.getMessage());
        }

        // 回退：逐个尝试系统字体，单个失败不中断
        IOException lastError = null;
        for (String fontPath : CHINESE_FONT_PATHS) {
            Path path = Paths.get(fontPath);
            if (!Files.exists(path)) {
                continue;
            }
            try {
                log.info("从系统路径加载中文字体：{}", fontPath);
                return loadFontFromFile(document, path.toFile(), fontResources);
            } catch (Exception e) {
                lastError = e instanceof IOException ? (IOException) e : new IOException(e);
                log.warn("加载字体失败 {}：{}", fontPath, e.getMessage());
            }
        }

        if (lastError != null) {
            throw lastError;
        }
        throw new IOException("未找到可用的中文字体");
    }

    /**
     * 从本地字体文件加载 PDF 字体（TTC/TTF）。
     *
     * @param document PDF 文档
     * @param file 字体文件
     * @param fontResources 延迟关闭列表
     * @return PDType0Font
     * @throws IOException 加载失败
     */
    private PDType0Font loadFontFromFile(PDDocument document, File file, List<Closeable> fontResources)
            throws IOException {
        String lowerName = file.getName().toLowerCase();
        if (lowerName.endsWith(".ttc")) {
            // 不可在此 try-with-resources 关闭：子集化需在 save 时仍打开 RAF
            TrueTypeCollection collection = new TrueTypeCollection(file);
            fontResources.add(collection);
            return loadFirstFontFromCollection(document, collection, file.getAbsolutePath());
        }
        return PDType0Font.load(document, file);
    }

    /**
     * 从 TTC 输入流加载首个可用字体。
     *
     * @param document PDF 文档
     * @param inputStream TTC 流
     * @param sourceLabel 日志标识
     * @param fontResources 延迟关闭列表
     * @return PDType0Font
     * @throws IOException 加载失败
     */
    private PDType0Font loadFontFromTtcStream(PDDocument document, InputStream inputStream, String sourceLabel,
                                              List<Closeable> fontResources) throws IOException {
        TrueTypeCollection collection = new TrueTypeCollection(inputStream);
        fontResources.add(collection);
        fontResources.add(inputStream);
        return loadFirstFontFromCollection(document, collection, sourceLabel);
    }

    /**
     * 从 TrueTypeCollection 取第一个可嵌入字体。
     *
     * @param document PDF 文档
     * @param collection 字体集合
     * @param sourceLabel 来源标识
     * @return PDType0Font
     * @throws IOException 集合为空或加载失败
     */
    private PDType0Font loadFirstFontFromCollection(PDDocument document, TrueTypeCollection collection,
                                                    String sourceLabel) throws IOException {
        AtomicReference<PDType0Font> loaded = new AtomicReference<>();
        AtomicReference<IOException> error = new AtomicReference<>();
        collection.processAllFonts((TrueTypeFont ttf) -> {
            if (loaded.get() != null) {
                return;
            }
            try {
                loaded.set(PDType0Font.load(document, ttf, true));
            } catch (IOException e) {
                error.set(e);
            }
        });
        if (loaded.get() != null) {
            return loaded.get();
        }
        if (error.get() != null) {
            throw error.get();
        }
        throw new IOException("TTC 中无可用字体: " + sourceLabel);
    }

    private String buildSubtitle(String author, String categoryName, LocalDateTime publishTime) {
        StringBuilder sb = new StringBuilder();
        if (author != null && !author.isEmpty()) {
            sb.append("作者：").append(author);
        }
        if (categoryName != null && !categoryName.isEmpty()) {
            if (sb.length() > 0) {
                sb.append("  |  ");
            }
            sb.append("分类：").append(categoryName);
        }
        if (sb.length() > 0) {
            sb.append("  |  ");
        }
        sb.append("发布时间：").append(publishTime != null
                ? publishTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
                : "未知");
        return sb.toString();
    }

    /**
     * 通过分类ID查询分类名称
     */
    private String resolveCategoryName(Long categoryId) {
        if (categoryId == null) {
            return null;
        }
        try {
            Category category = categoryMapper.selectById(categoryId);
            return category != null ? category.getCategoryName() : null;
        } catch (Exception e) {
            log.warn("查询分类名称失败：categoryId={}", categoryId, e);
            return null;
        }
    }

    /**
     * 渲染结果：封装 contentStream、page、yPosition
     */
    private static class RenderResult {
        final PDPageContentStream contentStream;
        final PDPage page;
        final float yPosition;

        RenderResult(PDPageContentStream contentStream, PDPage page, float yPosition) {
            this.contentStream = contentStream;
            this.page = page;
            this.yPosition = yPosition;
        }
    }

    // ==================== 代码块渲染 ====================

    /**
     * 渲染代码块：One Dark Pro 风格深色背景
     */
    private RenderResult renderCodeBlock(PDPageContentStream contentStream, PDDocument document,
             PDPage page, List<String> codeLines, String language, PDType0Font chineseFont,
             float yPosition, float pageWidth, float marginX) throws IOException {

        float headerHeight = 28;
        float paddingTop = 8;
        float paddingBottom = 12;
        float lineHeight = CODE_LINE_HEIGHT;
        
        // 计算实际需要的行数（考虑换行）
        float codeMaxWidth = pageWidth - 24;
        int totalLines = 0;
        for (String codeLine : codeLines) {
            String replacedLine = codeLine.replace("\t", "    ");
            List<String> wrapped = wrapTextByWidth(replacedLine, codeMaxWidth, chineseFont, CODE_FONT_SIZE);
            totalLines += wrapped.size();
        }
        
        float totalHeight = headerHeight + paddingTop + (totalLines * lineHeight) + paddingBottom;

        // 代码块放不下则换页
        if (yPosition - totalHeight < marginX) {
            contentStream.close();
            page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            contentStream = new PDPageContentStream(document, page,
                    PDPageContentStream.AppendMode.OVERWRITE, true, true);
            yPosition = page.getMediaBox().getHeight() - marginX;
        }

        float blockBottom = yPosition - totalHeight;

        // 深色背景
        contentStream.setNonStrokingColor(CODE_BG);
        contentStream.addRect(marginX, blockBottom, pageWidth, totalHeight);
        contentStream.fill();

        // 边框
        contentStream.setStrokingColor(CODE_BORDER);
        contentStream.setLineWidth(0.5f);
        contentStream.addRect(marginX, blockBottom, pageWidth, totalHeight);
        contentStream.stroke();

        // 顶部语言标签栏
        contentStream.setNonStrokingColor(CODE_HEADER_BG);
        contentStream.addRect(marginX, yPosition - headerHeight, pageWidth, headerHeight);
        contentStream.fill();

        String langLabel = (language != null && !language.isEmpty()) ? language.toUpperCase() : "CODE";
        contentStream.beginText();
        contentStream.setNonStrokingColor(CODE_TEXT);
        if (chineseFont != null) {
            contentStream.setFont(chineseFont, 8);
        } else {
            contentStream.setFont(PDType1Font.HELVETICA, 8);
        }
        contentStream.newLineAtOffset(marginX + 12, yPosition - 19);
        showSafeText(contentStream, chineseFont, langLabel);
        contentStream.endText();

        // 代码行（支持自动换行）
        float textY = yPosition - headerHeight - paddingTop - lineHeight;
        for (String codeLine : codeLines) {
            String replacedLine = codeLine.replace("\t", "    ");
            List<String> wrappedLines = wrapTextByWidth(replacedLine, codeMaxWidth, chineseFont, CODE_FONT_SIZE);
            
            for (String wrappedLine : wrappedLines) {
                contentStream.beginText();
                contentStream.setNonStrokingColor(CODE_TEXT);
                if (chineseFont != null) {
                    contentStream.setFont(chineseFont, CODE_FONT_SIZE);
                } else {
                    contentStream.setFont(PDType1Font.COURIER, CODE_FONT_SIZE);
                }
                contentStream.newLineAtOffset(marginX + 12, textY);
                showSafeText(contentStream, chineseFont, wrappedLine);
                contentStream.endText();
                textY -= lineHeight;
            }
        }

        contentStream.setStrokingColor(0, 0, 0);
        contentStream.setNonStrokingColor(0, 0, 0);

        return new RenderResult(contentStream, page, blockBottom - 8);
    }

    // ==================== 表格渲染 ====================

    /**
     * 渲染表格：动态行高 + 单元格自动换行，保证全部内容显示
     */
    private RenderResult renderTable(PDPageContentStream contentStream, PDDocument document,
             PDPage page, List<String[]> rows, PDType0Font chineseFont,
             float yPosition, float pageWidth, float marginX) throws IOException {

        if (rows.isEmpty()) {
            return new RenderResult(contentStream, page, yPosition);
        }

        int colCount = rows.get(0).length;
        float colWidth = pageWidth / colCount;
        float cellMaxWidth = colWidth - 10;
        float cellFontSize = FONT_SIZE - 1;
        float cellLineHeight = LINE_HEIGHT - 2;
        float cellPaddingTop = 5;
        float cellPaddingBottom = 5;

        // ---- 第一遍：计算每行换行后的文本和各行的实际高度 ----
        List<List<List<String>>> allWrappedRows = new ArrayList<>();
        List<Float> rowHeights = new ArrayList<>();

        for (String[] row : rows) {
            List<List<String>> wrappedRow = new ArrayList<>();
            int maxLines = 1;
            for (int col = 0; col < Math.min(row.length, colCount); col++) {
                String cell = row[col] != null ? row[col].trim() : "";
                List<String> wrappedLines = wrapTextByWidth(cell, cellMaxWidth, chineseFont, cellFontSize);
                if (wrappedLines.isEmpty()) {
                    wrappedLines = new ArrayList<>();
                    wrappedLines.add("");
                }
                wrappedRow.add(wrappedLines);
                maxLines = Math.max(maxLines, wrappedLines.size());
            }
            allWrappedRows.add(wrappedRow);
            rowHeights.add(maxLines * cellLineHeight + cellPaddingTop + cellPaddingBottom);
        }

        // 计算总高度
        float totalHeight = 0;
        for (float h : rowHeights) {
            totalHeight += h;
        }

        // 整个表格放不下则换页
        if (yPosition - totalHeight < marginX) {
            contentStream.close();
            page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            contentStream = new PDPageContentStream(document, page,
                    PDPageContentStream.AppendMode.OVERWRITE, true, true);
            yPosition = page.getMediaBox().getHeight() - marginX;
        }

        float tableBottom = yPosition - totalHeight;
        float currentY = yPosition;

        // ---- 第二遍：逐行绘制 ----
        for (int r = 0; r < rows.size(); r++) {
            List<List<String>> wrappedRow = allWrappedRows.get(r);
            float rowHeight = rowHeights.get(r);
            boolean isHeader = (r == 0);

            // 行背景
            if (isHeader) {
                contentStream.setNonStrokingColor(TABLE_HEADER_BG);
                contentStream.addRect(marginX, currentY - rowHeight, pageWidth, rowHeight);
                contentStream.fill();
            }

            // 画单元格文字
            for (int col = 0; col < wrappedRow.size(); col++) {
                List<String> lines = wrappedRow.get(col);
                float textY = currentY - cellPaddingTop - cellLineHeight;
                for (String line : lines) {
                    contentStream.beginText();
                    contentStream.setNonStrokingColor(0, 0, 0);
                    if (chineseFont != null) {
                        contentStream.setFont(chineseFont, cellFontSize);
                    } else {
                        if (isHeader) {
                            contentStream.setFont(PDType1Font.HELVETICA_BOLD, cellFontSize);
                        } else {
                            contentStream.setFont(PDType1Font.HELVETICA, cellFontSize);
                        }
                    }
                    contentStream.newLineAtOffset(marginX + col * colWidth + 5, textY);
                    showSafeText(contentStream, chineseFont, line);
                    contentStream.endText();
                    textY -= cellLineHeight;
                }
            }

            currentY -= rowHeight;
        }

        // ---- 绘制网格线 ----
        contentStream.setStrokingColor(TABLE_BORDER);
        contentStream.setLineWidth(0.5f);
        // 横线
        float lineY = yPosition;
        for (float h : rowHeights) {
            contentStream.moveTo(marginX, lineY);
            contentStream.lineTo(marginX + pageWidth, lineY);
            lineY -= h;
        }
        // 底部封口线
        contentStream.moveTo(marginX, lineY);
        contentStream.lineTo(marginX + pageWidth, lineY);
        // 竖线
        for (int col = 0; col <= colCount; col++) {
            contentStream.moveTo(marginX + col * colWidth, yPosition);
            contentStream.lineTo(marginX + col * colWidth, tableBottom);
        }
        contentStream.stroke();

        contentStream.setStrokingColor(0, 0, 0);
        contentStream.setNonStrokingColor(0, 0, 0);

        return new RenderResult(contentStream, page, tableBottom - 12);
    }

    // ==================== 图片渲染 ====================

    /**
     * 渲染图片：从URL下载并嵌入PDF
     */
    private RenderResult renderImage(PDPageContentStream contentStream, PDDocument document,
             PDPage page, String imageUrl, String imageAlt,
             float yPosition, float pageWidth, float marginX) throws IOException {

        float maxImageWidth = pageWidth - 20;
        float maxImageHeight = 400;
        float imageY = yPosition;

        try {
            byte[] imageBytes = downloadImage(imageUrl);
            if (imageBytes == null || imageBytes.length == 0) {
                log.warn("图片下载失败或为空：url={}", imageUrl);
                return new RenderResult(contentStream, page, yPosition - LINE_HEIGHT);
            }

            BufferedImage bufferedImage = ImageIO.read(new ByteArrayInputStream(imageBytes));
            if (bufferedImage == null) {
                log.warn("无法解析图片格式：url={}", imageUrl);
                return new RenderResult(contentStream, page, yPosition - LINE_HEIGHT);
            }

            int imgWidth = bufferedImage.getWidth();
            int imgHeight = bufferedImage.getHeight();

            float ratio = Math.min(maxImageWidth / imgWidth, maxImageHeight / imgHeight);
            float drawWidth = imgWidth * ratio;
            float drawHeight = imgHeight * ratio;

            if (imageY - drawHeight < marginX) {
                contentStream.close();
                page = new PDPage(PDRectangle.A4);
                document.addPage(page);
                contentStream = new PDPageContentStream(document, page,
                        PDPageContentStream.AppendMode.OVERWRITE, true, true);
                imageY = page.getMediaBox().getHeight() - marginX;
            }

            float imageX = marginX + (pageWidth - drawWidth) / 2;
            PDImageXObject pdImage = PDImageXObject.createFromByteArray(document, imageBytes, imageAlt);

            contentStream.drawImage(pdImage, imageX, imageY - drawHeight, drawWidth, drawHeight);

            log.info("图片渲染成功：url={}, width={}, height={}", imageUrl, drawWidth, drawHeight);

            return new RenderResult(contentStream, page, imageY - drawHeight - LINE_HEIGHT);

        } catch (Exception e) {
            log.error("图片渲染失败：url={}, error={}", imageUrl, e.getMessage());
            return new RenderResult(contentStream, page, yPosition - LINE_HEIGHT);
        }
    }

    /**
     * 从URL下载图片字节数组
     */
    private byte[] downloadImage(String imageUrl) {
        if (imageUrl == null || imageUrl.isEmpty()) {
            return null;
        }

        try {
            if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
                return HttpUtil.downloadBytes(imageUrl);
            } else {
                Path localPath = Paths.get(imageUrl);
                if (Files.exists(localPath)) {
                    return Files.readAllBytes(localPath);
                }
            }
        } catch (Exception e) {
            log.error("下载图片失败：url={}", imageUrl, e);
        }

        return null;
    }

    // ==================== 表格检测辅助方法 ====================

    private boolean isTableRow(String line) {
        return line.startsWith("|") && line.endsWith("|") && line.length() > 2;
    }

    private boolean isTableSeparator(String line) {
        return line.matches("^\\|[\\s\\-:]+\\|([\\s\\-:]+\\|)+$");
    }

    private String[] parseTableRow(String line) {
        // 去除首尾的 |，按 | 分割
        String inner = line.substring(1, line.length() - 1);
        return inner.split("\\|");
    }

    private String truncateText(String text, float maxWidth, PDType0Font chineseFont, float fontSize) {
        if (text == null || text.isEmpty()) {
            return "";
        }
        // 测量实际宽度
        float textWidth = measureTextWidth(text, chineseFont, fontSize);
        if (textWidth <= maxWidth) {
            return text;
        }
        // 从后往前逐步缩减直到宽度合适
        int len = text.length();
        while (len > 0 && measureTextWidth(text.substring(0, len) + "…", chineseFont, fontSize) > maxWidth) {
            len--;
        }
        return len > 0 ? text.substring(0, len) + "…" : "";
    }

    /**
     * 按实际字体宽度将文本分行，确保每行不超出 pageWidth。
     * 换行符作为硬换行；控制字符不会送入字体测量。
     *
     * @param text 原始文本
     * @param maxWidth 最大行宽（pt）
     * @param chineseFont 中文字体
     * @param fontSize 字号
     * @return 分行结果
     */
    private List<String> wrapTextByWidth(String text, float maxWidth, PDType0Font chineseFont, float fontSize) {
        List<String> result = new ArrayList<>();
        if (text == null || text.isEmpty()) {
            return result;
        }

        text = text.replace("\t", "    ").replace("\r\n", "\n").replace('\r', '\n');

        for (String paragraph : text.split("\n", -1)) {
            paragraph = sanitizeForPdfText(paragraph, chineseFont);
            if (paragraph.isEmpty()) {
                result.add("");
                continue;
            }
            StringBuilder currentLine = new StringBuilder();
            for (int i = 0; i < paragraph.length(); i++) {
                char c = paragraph.charAt(i);
                if (c < 0x20) {
                    continue;
                }
                String testLine = currentLine.toString() + c;
                float lineWidth = measureTextWidth(testLine, chineseFont, fontSize);

                if (lineWidth > maxWidth && currentLine.length() > 0) {
                    result.add(currentLine.toString());
                    currentLine = new StringBuilder();
                    if (c == ' ') {
                        continue;
                    }
                }
                currentLine.append(c);
            }
            if (currentLine.length() > 0) {
                result.add(currentLine.toString());
            }
        }

        return result;
    }

    /**
     * 使用字体实际测量文本宽度（单位：pt）。
     * 测量前剔除控制字符，避免 SimHei 等字体对换行符报 No glyph。
     *
     * @param text 文本
     * @param chineseFont 中文字体（可空）
     * @param fontSize 字号
     * @return 宽度 pt
     */
    private float measureTextWidth(String text, PDType0Font chineseFont, float fontSize) {
        if (text == null || text.isEmpty()) {
            return 0;
        }
        text = sanitizeForPdfText(text, chineseFont);
        if (text.isEmpty()) {
            return 0;
        }
        try {
            if (chineseFont != null) {
                return chineseFont.getStringWidth(text) / 1000f * fontSize;
            }
            float totalWidth = 0;
            for (int i = 0; i < text.length(); i++) {
                char c = text.charAt(i);
                if (isCJKCharacter(c)) {
                    totalWidth += fontSize;
                } else {
                    try {
                        totalWidth += PDType1Font.HELVETICA.getStringWidth(String.valueOf(c)) / 1000f * fontSize;
                    } catch (IOException e2) {
                        totalWidth += fontSize * 0.55f;
                    }
                }
            }
            return totalWidth;
        } catch (IOException e) {
            float width = 0;
            for (int i = 0; i < text.length(); i++) {
                width += isCJKCharacter(text.charAt(i)) ? fontSize : fontSize * 0.55f;
            }
            return width;
        }
    }

    /**
     * 清洗即将写入 PDF showText / 测宽 的字符串。
     * 去掉控制字符，替换常见缺字形符号，并按字体实际可编码字形过滤（避免 No glyph）。
     *
     * @param text 原始文本
     * @param font 当前中文字体，可为 null
     * @return 可安全渲染的文本
     */
    private String sanitizeForPdfText(String text, PDType0Font font) {
        if (text == null || text.isEmpty()) {
            return "";
        }
        // 多字符替换先于逐字扫描
        text = text
                .replace("\u2026", "...")
                .replace("\u2022", "-")
                .replace("\u2023", "-")
                .replace("\u2043", "-")
                .replace("\u2219", "-")
                .replace("\u25CF", "-")
                .replace("\u25E6", "-")
                .replace("\u00B7", "-");

        StringBuilder sb = new StringBuilder(text.length());
        for (int i = 0; i < text.length(); ) {
            int cp = text.codePointAt(i);
            int charCount = Character.charCount(cp);
            i += charCount;

            if (cp == '\t') {
                sb.append("    ");
                continue;
            }
            if (cp < 0x20 || cp == 0x7F) {
                continue;
            }

            String candidate;
            if (cp <= 0xFFFF) {
                char mapped = mapPdfSafeChar((char) cp);
                candidate = String.valueOf(mapped);
            } else {
                candidate = new String(Character.toChars(cp));
            }

            if (font == null || canEncode(font, candidate)) {
                sb.append(candidate);
            } else {
                String fallback = fallbackGlyph(cp);
                if (fallback != null && canEncode(font, fallback)) {
                    sb.append(fallback);
                }
                // 字体仍无法编码则丢弃，避免 No glyph 中断导出
            }
        }
        return sb.toString();
    }

    /**
     * 兼容旧调用：无字体时仅做静态符号替换。
     *
     * @param text 原始文本
     * @return 清洗后文本
     */
    private String sanitizeForPdfText(String text) {
        return sanitizeForPdfText(text, null);
    }

    /**
     * 判断字体能否编码该字符串。
     *
     * @param font PDF 字体
     * @param s 单字或短串
     * @return true 可编码
     */
    private boolean canEncode(PDType0Font font, String s) {
        if (font == null || s == null || s.isEmpty()) {
            return false;
        }
        try {
            font.encode(s);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * 为缺字形码点提供 ASCII 回退。
     *
     * @param codePoint Unicode 码点
     * @return 回退串，无法回退则 null
     */
    private String fallbackGlyph(int codePoint) {
        // 几何图形 / 箭头 / 方框绘制等
        if (codePoint == 0x25C4 || codePoint == 0x25C0 || codePoint == 0x2190 || codePoint == 0x21E6) {
            return "<";
        }
        if (codePoint == 0x25BA || codePoint == 0x25B6 || codePoint == 0x2192 || codePoint == 0x21E8) {
            return ">";
        }
        if (codePoint == 0x25B2 || codePoint == 0x25B3 || codePoint == 0x2191) {
            return "^";
        }
        if (codePoint == 0x25BC || codePoint == 0x25BD || codePoint == 0x2193) {
            return "v";
        }
        if ((codePoint >= 0x2190 && codePoint <= 0x21FF)
                || (codePoint >= 0x25A0 && codePoint <= 0x25FF)
                || (codePoint >= 0x2500 && codePoint <= 0x257F)
                || (codePoint >= 0x2580 && codePoint <= 0x259F)) {
            return "*";
        }
        if (codePoint == 0x2022 || codePoint == 0x2023 || codePoint == 0x25CF) {
            return "-";
        }
        return null;
    }

    /**
     * 将单个字符映射为 PDF 常用中文字体可渲染的替代字符。
     *
     * @param c 原字符
     * @return 安全字符
     */
    private char mapPdfSafeChar(char c) {
        // 几何图形区统一走 fallback（由 sanitize 再按字体过滤）
        if (c >= 0x25A0 && c <= 0x25FF) {
            String fb = fallbackGlyph(c);
            return fb != null && !fb.isEmpty() ? fb.charAt(0) : '*';
        }
        if (c >= 0x2190 && c <= 0x21FF) {
            String fb = fallbackGlyph(c);
            return fb != null && !fb.isEmpty() ? fb.charAt(0) : '*';
        }
        if (c >= 0x2500 && c <= 0x257F) {
            return '-';
        }
        return switch (c) {
            case '\u2022', '\u2023', '\u2043', '\u2219', '\u25CF', '\u25E6', '\u00B7' -> '-';
            case '\u2013', '\u2014', '\u2015' -> '-'; // en/em dash
            case '\u00A0', '\u2002', '\u2003', '\u2009', '\u202F', '\u200B' -> ' ';
            case '\u2018', '\u2019', '\u201A' -> '\'';
            case '\u201C', '\u201D', '\u201E' -> '"';
            case '\u00D7' -> 'x';
            default -> c;
        };
    }

    /**
     * 安全写入文本（按字体字形过滤后再 showText）。
     *
     * @param contentStream PDF 内容流
     * @param font 中文字体
     * @param text 原始文本
     * @throws IOException 写入失败
     */
    private void showSafeText(PDPageContentStream contentStream, PDType0Font font, String text) throws IOException {
        String safe = sanitizeForPdfText(text, font);
        if (!safe.isEmpty()) {
            contentStream.showText(safe);
        }
    }

    /**
     * 判断字符是否为CJK（中日韩）全角字符
     */
    private boolean isCJKCharacter(char c) {
        // CJK Radicals Supplement
        if (c >= 0x2E80 && c <= 0x2EFF) return true;
        // Kangxi Radicals
        if (c >= 0x2F00 && c <= 0x2FDF) return true;
        // CJK Symbols and Punctuation
        if (c >= 0x3000 && c <= 0x303F) return true;
        // CJK Unified Ideographs Extension A
        if (c >= 0x3400 && c <= 0x4DBF) return true;
        // CJK Unified Ideographs
        if (c >= 0x4E00 && c <= 0x9FFF) return true;
        // CJK Compatibility Ideographs
        if (c >= 0xF900 && c <= 0xFAFF) return true;
        // Fullwidth Forms
        if (c >= 0xFF00 && c <= 0xFFEF) return true;
        // Halfwidth and Fullwidth Forms (fullwidth)
        if (c >= 0xFF01 && c <= 0xFF60) return true;
        // CJK Extension B-F ranges (supplementary, check char not surrogate)
        // 中文标点
        if (c == '\u2018' || c == '\u2019' || c == '\u201c' || c == '\u201d') return true; // 中文引号
        if (c == '\u2014' || c == '\u2015') return true; // em dash
        return false;
    }

    /**
     * 移除PDF字体不支持的字符（Emoji、特殊符号等）
     * 保留常用中文、英文、数字、标点符号
     */
    private String stripUnsupportedCharacters(String text) {
        if (text == null || text.isEmpty()) {
            return text;
        }
        // 常见缺字形符号先替换（SimHei/雅黑常缺 • ◄ 等）
        text = text
                .replace("\u2026", "...")
                .replace("\u2022", "-")
                .replace("\u2023", "-")
                .replace("\u2043", "-")
                .replace("\u2219", "-")
                .replace("\u25CF", "-")
                .replace("\u25E6", "-")
                .replace("\u00B7", "-")
                .replace("\u2013", "-")
                .replace("\u2014", "-")
                .replace("\u2015", "-")
                .replace("\u25C4", "<")
                .replace("\u25C0", "<")
                .replace("\u25BA", ">")
                .replace("\u25B6", ">");
        StringBuilder sb = new StringBuilder(text.length());
        for (int i = 0; i < text.length(); i++) {
            int codePoint = text.codePointAt(i);
            // 跳过代理对的高位（已经在codepoint处理过了）
            if (Character.isSupplementaryCodePoint(codePoint)) {
                i++; // 跳过低代理
                continue; // 跳过所有补充平面字符（包括Emoji U+1Fxxx）
            }
            // 跳过常见不支持的符号范围：杂项符号(U+2600-27BF)、装饰符号(U+2700-27BF)
            if (codePoint >= 0x2600 && codePoint <= 0x27BF) {
                continue;
            }
            // 几何图形 / 箭头 / 盒线：雅黑也可能缺字，导出前剔除（sanitize 会再做回退）
            if ((codePoint >= 0x25A0 && codePoint <= 0x25FF)
                    || (codePoint >= 0x2190 && codePoint <= 0x21FF)
                    || (codePoint >= 0x2500 && codePoint <= 0x257F)
                    || (codePoint >= 0x2580 && codePoint <= 0x259F)) {
                String fb = fallbackGlyph(codePoint);
                if (fb != null) {
                    sb.append(fb);
                }
                continue;
            }
            // 跳过其他特殊符号：U+2300-23FF（杂项技术符号）
            if (codePoint >= 0x2300 && codePoint <= 0x23FF) {
                continue;
            }
            sb.append((char) codePoint);
        }
        return sb.toString();
    }

    private String extractPlainText(String markdown) {
        if (markdown == null || markdown.isEmpty()) {
            return "";
        }

        String text = markdown;

        text = MARKDOWN_LINK.matcher(text).replaceAll("$1: $2");

        text = MARKDOWN_BOLD.matcher(text).replaceAll("$1");

        text = MARKDOWN_ITALIC.matcher(text).replaceAll("$1");

        text = text.replaceAll("`([^`]+)`", "$1");

        text = text.replaceAll("#+\\s*", "");

        text = text.replaceAll("!\\[.*?\\]\\(.*?\\)", "");

        text = text.replaceAll("\\s*[-*_]{3,}\\s*", "\n");

        text = text.trim();

        return text;
    }
}