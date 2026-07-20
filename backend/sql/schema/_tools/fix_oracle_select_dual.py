# -*- coding: utf-8 -*-
"""为 Oracle 脚本中的 SELECT message 补 FROM dual。"""

from __future__ import annotations

import re
from pathlib import Path

ORA = Path(__file__).resolve().parents[1] / "oracle"


def main() -> None:
    """批量修补 SELECT ... AS message。"""
    pat = re.compile(r"(?im)^(SELECT\s+'[^']*'\s+AS\s+message)\s*;\s*$")
    for path in ORA.glob("kb_*.sql"):
        text = path.read_text(encoding="utf-8")
        new = pat.sub(r"\1 FROM dual;", text)
        if new != text:
            path.write_text(new, encoding="utf-8")
            print(f"fixed {path.name}")


if __name__ == "__main__":
    main()
