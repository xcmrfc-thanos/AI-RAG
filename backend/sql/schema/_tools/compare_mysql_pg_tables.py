# -*- coding: utf-8 -*-
"""对照 MySQL / PostgreSQL DDL 表名与残留类型。"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
MYSQL = ROOT / "backend/sql/schema/mysql"
PG = ROOT / "backend/sql/schema/postgresql"

CREATE_RE = re.compile(
    r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`\"]?(\w+)[`\"]?",
    re.IGNORECASE,
)


def tables(directory: Path) -> set[str]:
    """收集目录下 CREATE TABLE 表名（小写、去 schema）。"""
    found: set[str] = set()
    for path in directory.glob("*.sql"):
        text = path.read_text(encoding="utf-8")
        for match in CREATE_RE.finditer(text):
            name = match.group(1)
            found.add(name.lower())
    return found


def smells(directory: Path) -> list[tuple[str, int, str, str]]:
    """扫描非注释行中的 MySQL 专有残留。"""
    patterns = (
        "TINYINT",
        "MEDIUMTEXT",
        "LONGTEXT",
        "AUTO_INCREMENT",
        "UNSIGNED",
        "ENGINE=",
        "ON UPDATE CURRENT",
    )
    out: list[tuple[str, int, str, str]] = []
    for path in directory.glob("*.sql"):
        for i, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            stripped = line.strip()
            if stripped.startswith("--"):
                continue
            for pat in patterns:
                if pat in line:
                    out.append((path.name, i, pat, stripped[:100]))
    return out


def main() -> None:
    """打印表差集与类型残留。"""
    mt, pt = tables(MYSQL), tables(PG)
    print(f"mysql_tables={len(mt)} pg_tables={len(pt)}")
    only_m = sorted(mt - pt)
    only_p = sorted(pt - mt)
    print(f"only_mysql count={len(only_m)} sample={only_m[:25]}")
    print(f"only_pg count={len(only_p)} sample={only_p[:25]}")
    sm = smells(PG)
    print(f"pg_smells={len(sm)}")
    for item in sm[:20]:
        print(item)
    # 打印若干关键表是否在两侧都有
    keys = [
        "kb_user",
        "kb_document",
        "kb_search_history",
        "stat_document",
        "kb_file_info",
        "kb_file_metadata",
        "kb_agent_session",
        "kb_agent_run",
    ]
    for k in keys:
        print(f"key {k}: mysql={k in mt} pg={k in pt}")


if __name__ == "__main__":
    main()
