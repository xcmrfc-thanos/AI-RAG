/**
 * 前端工具模块：document-preview-loaders。
 */
import type { WorkBook } from 'xlsx';

type MammothModule = typeof import('mammoth');
type XlsxModule = typeof import('xlsx');

let mammothModule: MammothModule | null = null;
let xlsxModule: XlsxModule | null = null;

/**
 * 按需加载 mammoth，避免文件管理页首包引入 Word 解析库。
 */
async function loadMammoth(): Promise<MammothModule> {
  if (!mammothModule) {
    mammothModule = await import('mammoth');
  }
  return mammothModule;
}

/**
 * 按需加载 xlsx，避免文件管理页首包引入 Excel 解析库。
 */
async function loadXlsx(): Promise<XlsxModule> {
  if (!xlsxModule) {
    xlsxModule = await import('xlsx');
  }
  return xlsxModule;
}

/**
 * 将 DOCX ArrayBuffer 转为 HTML 字符串。
 */
export async function convertDocxToHtml(arrayBuffer: ArrayBuffer): Promise<string> {
  const mammoth = await loadMammoth();
  const result = await mammoth.convertToHtml({ arrayBuffer }, {
    styleMap: [
      "p[style-name='Heading 1'] => h1:fresh",
      "p[style-name='Heading 2'] => h2:fresh",
      "p[style-name='Heading 3'] => h3:fresh",
      "p[style-name='Title'] => h1.title:fresh",
      "p[style-name='Subtitle'] => h2.subtitle:fresh",
      "r[style-name='Strong'] => strong",
      "r[style-name='Emphasis'] => em",
    ],
    convertImage: mammoth.images.imgElement((image: any) =>
      image.read().then((imageBuffer: ArrayBuffer) => ({
        src: `data:${image.contentType};base64,${btoa(String.fromCharCode(...new Uint8Array(imageBuffer)))}`,
      }))
    ),
  });
  return result.value;
}

/**
 * 将 Excel ArrayBuffer 解析为 WorkBook。
 */
export async function readExcelWorkbook(arrayBuffer: ArrayBuffer): Promise<WorkBook> {
  const XLSX = await loadXlsx();
  return XLSX.read(arrayBuffer, { type: 'array', cellStyles: true, cellNF: true, cellDates: true });
}

/**
 * 将 WorkBook 转为带样式的 HTML 表格（需先通过 readExcelWorkbook 加载 xlsx）。
 */
export function xlsxToStyledHtml(wb: WorkBook): string {
  if (!xlsxModule) {
    return '<p>表格加载中...</p>';
  }

  const XLSX = xlsxModule;
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const ref = ws['!ref'];
  if (!ref) return '<p>空表格</p>';

  const range = XLSX.utils.decode_range(ref);
  const merges = ws['!merges'] || [];
  const mergeMap = new Map<string, (typeof merges)[number]>();
  merges.forEach((m) => {
    for (let R = m.s.r; R <= m.e.r; R++) {
      for (let C = m.s.c; C <= m.e.c; C++) {
        mergeMap.set(XLSX.utils.encode_cell({ r: R, c: C }), m);
      }
    }
  });

  const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const colWidths: number[] = [];
  if (ws['!cols']) {
    ws['!cols'].forEach((col: { wch?: number }, i: number) => {
      colWidths[i] = col.wch ? Math.min(col.wch * 7, 300) : 80;
    });
  }

  let html = '<table style="border-collapse:collapse;font-size:13px;">';
  if (colWidths.length > 0) {
    html += '<colgroup>';
    colWidths.forEach((w) => { html += `<col style="width:${w}px;">`; });
    html += '</colgroup>';
  }

  for (let R = range.s.r; R <= range.e.r; R++) {
    html += '<tr>';
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[addr] as {
        s?: { patternType?: string; fgColor?: { rgb?: string } };
        t?: string;
        h?: string;
        w?: string;
        v?: unknown;
      } | undefined;
      const merge = mergeMap.get(addr);

      if (merge && (merge.s.r !== R || merge.s.c !== C)) continue;

      const css: string[] = [];
      css.push('border:1px solid #d1d5db;padding:6px 10px;');
      if (R === 0) css.push('font-weight:600;');

      if (cell?.s?.patternType === 'solid' && cell.s.fgColor?.rgb) {
        css.push(`background-color:#${cell.s.fgColor.rgb};`);
      }

      if (cell?.t === 'n') css.push('text-align:right;');

      const attrs: string[] = [];
      if (merge) {
        if (merge.e.r - merge.s.r + 1 > 1) attrs.push(`rowspan="${merge.e.r - merge.s.r + 1}"`);
        if (merge.e.c - merge.s.c + 1 > 1) attrs.push(`colspan="${merge.e.c - merge.s.c + 1}"`);
      }
      attrs.push(`style="${css.join(' ')}"`);

      let content = '';
      if (cell) {
        if (cell.h) {
          content = cell.h;
        } else {
          content = escapeHtml(cell.w ?? cell.v?.toString() ?? '');
        }
      }

      html += `<td ${attrs.join(' ')}>${content}</td>`;
    }
    html += '</tr>';
  }
  html += '</table>';
  return html;
}
