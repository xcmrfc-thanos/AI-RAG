/**
 * Markdown 工具函数
 */

/**
 * 标准化 Markdown 标题：在 # 号后没有空格时自动补一个空格。
 *
 * <p>CommonMark/GFM 规范要求 # 号后必须有一个空格才能被识别为标题。
 * LLM 输出中文 Markdown 时常出现 `###标题` 这种写法，导致渲染为普通段落。</p>
 *
 * @param text 原始 Markdown 文本
 * @returns 标题语法标准化后的 Markdown 文本
 */
export const normalizeHeadings = (text: string): string => {
  if (!text) return text;
  // 行首 1-6 个 #，紧接着非空格、非 # 的字符 → 在之间插入空格
  return text.replace(/^(#{1,6})([^\s#])/gm, '$1 $2');
};

/**
 * 标准化 Markdown 内容，防止因粘贴缩进内容导致标题被误解析为代码块。
 *
 * <p>当用户从网页、IDE 或文档中复制内容粘贴到编辑器时，可能附带缩进。
 * CommonMark 规范将 4 个及以上空格开头的行视为缩进代码块，
 * 导致标题（#）等 Markdown 语法被渲染为代码而非标题。</p>
 *
 * <p>原理：找出所有非空行的最小公共缩进，将其从每行开头移除
 * （类似 Python textwrap.dedent）。如果任一非空行没有前导空白字符，
 * 则不做任何修改。</p>
 *
 * @param text 原始 Markdown 文本
 * @returns 去除公共缩进后的 Markdown 文本
 */
export const normalizeMarkdown = (text: string): string => {
  if (!text) return text;
  const lines = text.split('\n');

  // 找到所有非空行的最小缩进
  let minIndent = Infinity;
  for (const line of lines) {
    if (line.trim().length === 0) continue;
    const match = line.match(/^[ \t]*/);
    if (match) minIndent = Math.min(minIndent, match[0].length);
  }

  // 没有缩进或无内容，无需处理
  if (minIndent === Infinity || minIndent === 0) return text;

  // 移除公共缩进
  return lines
    .map(line => {
      if (line.trim().length === 0) return line;
      return line.slice(Math.min(minIndent, line.length));
    })
    .join('\n');
};

/**
 * 自动将目录树结构包裹进 Markdown 代码块。
 *
 * <p>LLM 输出的目录结构如 {@code com.example.demo ├──controller/ │ └── User.java}
 * 使用了制表符（├└│─）但没有用 ``` 包裹，导致 Markdown 将其渲染为普通段落，
 * 空格被折叠、换行丢失，完全不可读。</p>
 *
 * <p>本函数检测连续 2 行以上包含制表符的行，自动为其包裹 ``` 代码块。</p>
 *
 * @param text 原始 Markdown 文本
 * @returns 目录树自动包裹后的 Markdown 文本
 */
export const normalizeDirTree = (text: string): string => {
  if (!text) return text;
  if (/```|<pre>/.test(text)) return text; // 已有代码块，跳过

  const TREE = /[├└│─]/;
  const lines = text.split('\n');
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    // 非制表符行 → 原样输出
    if (!TREE.test(lines[i])) {
      out.push(lines[i]);
      i++;
      continue;
    }

    // 收集连续含制表符的行
    const start = i;
    while (i < lines.length && TREE.test(lines[i])) i++;

    // 在空白符紧接 ├ 或 └ 之前插入换行，把挤在一行的条目拆开
    const expanded = lines
      .slice(start, i)
      .map((l) => l.replace(/[ \t]+([├└])/g, '\n$1'))
      .join('\n');

    out.push(
      '\n\n<pre style="background:#1e1e1e;color:#d4d4d4;padding:10px 14px;border-radius:6px;overflow-x:auto;font-size:13px;line-height:1.55;font-family:monospace;">\n' +
      expanded +
      '\n</pre>\n\n',
    );
  }

  return out.join('\n');
};

/**
 * 对 AI 流式输出做一站式 Markdown 标准化处理。
 *
 * <p>串联 normalizeHeadings + normalizeDirTree，确保 AI 输出的中文标题、
 * 目录结构等都能被正确渲染。</p>
 */
export const prepareStreamingMarkdown = (text: string): string => {
  if (!text) return text;
  return normalizeDirTree(normalizeHeadings(text));
};
