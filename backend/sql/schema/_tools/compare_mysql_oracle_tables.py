# -*- coding: utf-8 -*-
"""对照 MySQL / Oracle DDL 表名。"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
MYSQL = ROOT / "backend/sql/schema/mysql"
ORA = ROOT / "backend/sql/schema/oracle"


def main() -> None:
    """打印表差集。"""
    mt: set[str] = set()
    for path in MYSQL.glob("*.sql"):
        for m in re.finditer(
            r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`\"]?(\w+)",
            path.read_text(encoding="utf-8"),
            re.I,
        ):
            mt.add(m.group(1).lower())
    ot: set[str] = set()
    for path in ORA.glob("kb_*.sql"):
        for m in re.finditer(
            r"CREATE\s+TABLE\s+(?:\w+\.)?(\w+)",
            path.read_text(encoding="utf-8"),
            re.I,
        ):
            ot.add(m.group(1).lower())
    print(f"mysql={len(mt)} oracle={len(ot)}")
    print("only_mysql", sorted(mt - ot))
    print("only_oracle", sorted(ot - mt))
    dn = 0
    for path in ORA.glob("*.sql"):
        for line in path.read_text(encoding="utf-8").splitlines():
            if re.search(r"DEFAULT\s+NULL", line, re.I):
                dn += 1
    print(f"default_null_lines={dn}")


if __name__ == "__main__":
    main()
