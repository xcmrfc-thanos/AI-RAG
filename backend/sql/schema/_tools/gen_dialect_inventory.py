# -*- coding: utf-8 -*-
from pathlib import Path
import re
from collections import defaultdict

root = Path("backend")
patterns = [
    ("IFNULL", re.compile(r"IFNULL", re.I)),
    ("ON_DUPLICATE", re.compile(r"ON DUPLICATE KEY", re.I)),
    ("ON_CONFLICT", re.compile(r"ON CONFLICT", re.I)),
    ("DATE_SUB", re.compile(r"DATE_SUB", re.I)),
    ("DATE_FUNC", re.compile(r"DATE\s*\(")),
    ("LIMIT_XML", re.compile(r"LIMIT\s+#\{")),
    ("LIMIT_ANNOT", re.compile(r"LIMIT\s+#\{")),
    ("LIMIT_LAST_RAW", re.compile(r'\.last\(\s*"LIMIT')),
    ("LIMIT_HELPER", re.compile(r"limitClause\s*\(")),
    ("FETCH_FIRST", re.compile(r"FETCH FIRST", re.I)),
    ("CONCAT", re.compile(r"CONCAT\s*\(")),
    ("GROUP_CONCAT", re.compile(r"GROUP_CONCAT", re.I)),
]

rows = []
for p in root.rglob("*"):
    if not p.is_file():
        continue
    if "_archive" in p.parts or "target" in p.parts:
        continue
    if p.suffix not in {".java", ".xml"}:
        continue
    text = p.read_text(encoding="utf-8", errors="replace")
    rel = p.as_posix()
    is_test = "/src/test/" in rel
    for name, pat in patterns:
        for i, line in enumerate(text.splitlines(), 1):
            if not pat.search(line):
                continue
            status = "待改"
            if is_test:
                status = "测试"
            elif "SqlDialectHelper" in rel:
                status = "已helper定义"
            elif "limitClause" in line or "dateOf(" in line or "ifNull(" in line:
                status = "已helper"
            elif "onDuplicateKeyUpdate" in line or "timestampDaysAgo" in line:
                status = "已helper"
            elif name == "ON_CONFLICT":
                status = "已PG分支"
            elif name == "FETCH_FIRST":
                status = "已Oracle分支"
            elif name == "LIMIT_HELPER":
                status = "已helper"
            elif name == "ON_DUPLICATE" and "onDuplicateKeyUpdate" in text:
                status = "已helper组装"
            rows.append((name, status, rel, i, line.strip()[:140]))

by = defaultdict(list)
for r in rows:
    by[(r[0], r[1], r[2])].append((r[3], r[4]))

out = []
out.append("# 方言 SQL 风险清单（活跃代码，排除 _archive）\n")
out.append("> 生成自扫描；生产交付计划 Task 1。\n")
out.append("## 汇总\n")
out.append("| 状态 | 模式 | 文件数 |\n|------|------|--------|\n")
summ = defaultdict(int)
for (name, status, rel) in by:
    summ[(status, name)] += 1
for (status, name), cnt in sorted(summ.items()):
    out.append(f"| {status} | {name} | {cnt} |\n")

out.append("\n## 优先级约定\n\n")
out.append("- **P0**：登录鉴权、主链路文档/文件 CRUD、网关相关\n")
out.append("- **P1**：统计聚合/投影 Mapper 与 JDBC\n")
out.append("- **P2**：管理端冷路径、Tag/Team 模糊查询等\n\n")

out.append("## 明细（按状态）\n\n")
for status in ["待改", "已helper", "已helper组装", "已helper定义", "已PG分支", "已Oracle分支", "测试"]:
    items = [(k, v) for k, v in by.items() if k[1] == status]
    if not items:
        continue
    out.append(f"### {status}\n\n")
    out.append("| 优先级 | 模式 | 文件 | 行 |\n|--------|------|------|----|\n")
    for (name, st, rel), hits in sorted(items, key=lambda x: x[0][2]):
        pri = "P2"
        if "statistics" in rel or "Statistics" in rel:
            pri = "P1"
        if any(x in rel for x in ("userauth", "iam", "DocumentService", "FileService", "AgentJwt", "gateway")):
            pri = "P0"
        if "SearchHistory" in rel or "intelligence" in rel:
            pri = "P0" if name in ("ON_DUPLICATE", "LIMIT_XML", "CONCAT") else "P1"
        lines = ",".join(str(h[0]) for h in hits[:8])
        if len(hits) > 8:
            lines += ",..."
        out.append(f"| {pri} | {name} | `{rel}` | {lines} |\n")
    out.append("\n")

out.append("## 下一步（对应计划）\n\n")
out.append("- Task 2：Oracle MERGE（统计 JDBC `ON_DUPLICATE`/`已helper组装` 在 Oracle 下接通）\n")
out.append("- Task 3：统计 Mapper 的 `DATE_FUNC`/`LIMIT_XML` 补 `databaseId=oracle`；SearchHistory `LIMIT`/`CONCAT`\n")
out.append("- P2：`TeamMapper`/`TagMapper`/`DocumentReview` 的 `CONCAT` 在 Oracle 验证\n")

Path("backend/sql/schema/dialect-sql-inventory.md").write_text("".join(out), encoding="utf-8")
print("wrote inventory", len(by), "groups", len(rows), "hits")
