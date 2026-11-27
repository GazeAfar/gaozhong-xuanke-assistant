"""
将官方《2027年拟在江苏招生的普通高校专业选考科目要求汇总表.xlsx》转换为标准化 JSON。
零第三方依赖（仅使用 Python 标准库 zipfile + xml.etree.ElementTree），
严格遵循 docs/03_rules_data.md 规则：
- 仅读取 Sheet 1（普通高校专业选考科目要求），不混入 Sheet 2 军队院校专项。
- 记录原始文件 SHA-256 哈希以供来源追溯。
- 解析所有选考科目要求为结构化 firstSubject + requirementTree（NONE / ALL / ANY / UNKNOWN）。
- 任何无法明确识别的表达式标为 UNKNOWN + reviewStatus='unknown'，不静默丢弃或猜错。
"""

import argparse
import hashlib
import json
import os
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from collections import Counter

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

SUBJECT_MAP = [
    ("思想政治", "POLITICS"),
    ("政治", "POLITICS"),
    ("生物学", "BIOLOGY"),
    ("生物", "BIOLOGY"),
    ("物理", "PHYSICS"),
    ("历史", "HISTORY"),
    ("化学", "CHEMISTRY"),
    ("地理", "GEOGRAPHY"),
]


def col_to_idx(col_ref: str) -> int:
    letters = "".join(ch for ch in col_ref if ch.isalpha())
    idx = 0
    for ch in letters:
        idx = idx * 26 + (ord(ch.upper()) - ord("A") + 1)
    return idx - 1


def parse_requirement(raw_text: str):
    raw = (raw_text or "").strip()
    if not raw:
        return "UNKNOWN", {"type": "UNKNOWN", "reason": "选科要求原文为空"}, "unknown"

    if raw == "不提科目要求" or "不提科目要求" in raw:
        return "ANY", {"type": "NONE"}, "approved"

    subjects = []
    scan = raw
    for label, code in SUBJECT_MAP:
        if label in scan:
            if code not in subjects:
                subjects.append(code)
            scan = scan.replace(label, " ")

    if not subjects:
        return "UNKNOWN", {"type": "UNKNOWN", "reason": f"无法识别科目: {raw}"}, "unknown"

    is_or = bool(re.search(r"或|任选|选考其一|选考其中\s*1\s*门", raw))
    first_subject = "ANY"
    if not is_or:
        has_phy = "PHYSICS" in subjects
        has_his = "HISTORY" in subjects
        if has_phy and not has_his:
            first_subject = "PHYSICS"
        elif has_his and not has_phy:
            first_subject = "HISTORY"

    tree = {"type": "ANY" if is_or else "ALL", "subjects": subjects}
    return first_subject, tree, "approved"


def read_sheet1_rows(xlsx_path: str):
    with zipfile.ZipFile(xlsx_path, "r") as z:
        shared = []
        if "xl/sharedStrings.xml" in z.namelist():
            ss_root = ET.fromstring(z.read("xl/sharedStrings.xml"))
            for si in ss_root.findall("m:si", NS):
                shared.append("".join(t.text or "" for t in si.findall(".//m:t", NS)))

        rows = []
        with z.open("xl/worksheets/sheet1.xml") as sf:
            for _, elem in ET.iterparse(sf, events=("end",)):
                if elem.tag.endswith("}row"):
                    row_vals = {}
                    max_c = -1
                    for c in elem:
                        if not c.tag.endswith("}c"):
                            continue
                        ref = c.attrib.get("r", "")
                        ci = col_to_idx(ref) if ref else (max_c + 1)
                        max_c = max(max_c, ci)
                        ctype = c.attrib.get("t", "")
                        val = ""
                        if ctype == "s":
                            v = c.find("m:v", NS)
                            if v is not None and v.text is not None:
                                val = shared[int(v.text)]
                        elif ctype == "inlineStr":
                            val = "".join(t.text or "" for t in c.findall(".//m:t", NS))
                        else:
                            v = c.find("m:v", NS)
                            if v is not None and v.text is not None:
                                val = v.text
                        row_vals[ci] = val.strip()
                    if max_c >= 0:
                        rows.append([row_vals.get(i, "") for i in range(max_c + 1)])
                    elem.clear()
        return rows


def main():
    parser = argparse.ArgumentParser(description="将官方选考科目要求 Excel 转为标准 JSON")
    parser.add_argument(
        "--input",
        default=os.path.join("data", "raw", "2027年拟在江苏招生的普通高校专业选考科目要求汇总表.xlsx"),
        help="原始官方 xlsx 文件路径",
    )
    parser.add_argument(
        "--output",
        default=os.path.join("data", "normalized", "js-2027.json"),
        help="输出标准化 JSON 路径",
    )
    parser.add_argument("--province", default="JS")
    parser.add_argument("--year", type=int, default=2027)
    parser.add_argument("--version", default="JS-2027.1")
    parser.add_argument("--source-id", default="S01")
    parser.add_argument("--scope-note", default="")
    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(f"[import-official-xlsx] 找不到输入文件: {args.input}", file=sys.stderr)
        sys.exit(1)

    with open(args.input, "rb") as f:
        sha256 = hashlib.sha256(f.read()).hexdigest()

    rows = read_sheet1_rows(args.input)

    def find_col(hdrs, candidates):
        for name in candidates:
            if name in hdrs:
                return hdrs.index(name)
        return -1

    hdr_idx = -1
    for i in range(min(10, len(rows))):
        if (
            find_col(rows[i], ["院校代码"]) >= 0
            and find_col(rows[i], ["专业名称", "招生专业名称"]) >= 0
            and find_col(rows[i], ["选考科目要求", "考试科目要求"]) >= 0
        ):
            hdr_idx = i
            break

    if hdr_idx < 0:
        print("[import-official-xlsx] 未找到有效表头行（需包含 院校代码、专业名称、选考科目要求）", file=sys.stderr)
        sys.exit(1)

    headers = rows[hdr_idx]
    idx_level = find_col(headers, ["层次"])
    idx_inst_code = find_col(headers, ["院校代码"])
    idx_inst_name = find_col(headers, ["院校名称"])
    idx_major_code = find_col(headers, ["专业代码", "招生专业代码"])
    idx_major_name = find_col(headers, ["专业名称", "招生专业名称"])
    idx_req = find_col(headers, ["选考科目要求", "考试科目要求"])

    dataset_id = f"ds-{args.province.lower()}-{args.year}-{re.sub(r'[^a-z0-9]+', '-', args.version.lower()).strip('-')}"

    offerings = []
    seen_keys = set()
    dup_count = 0
    unknown_count = 0
    expr_counter = Counter()
    level_counter = Counter()

    for row_num, r in enumerate(rows[hdr_idx + 1 :], start=1):
        if len(r) <= max(idx_level, idx_inst_code, idx_inst_name, idx_major_code, idx_major_name, idx_req):
            continue
        raw_level = r[idx_level].strip()
        level = "专科" if "专科" in raw_level or "高职" in raw_level else raw_level
        inst_code = r[idx_inst_code].strip()
        inst_name = r[idx_inst_name].strip()
        major_code = r[idx_major_code].strip() or None
        major_name = r[idx_major_name].strip()
        req_raw = r[idx_req].strip()

        if not inst_name or not major_name:
            continue

        biz_key = f"{inst_code}::{major_code or ''}::{major_name}::{level}"
        if biz_key in seen_keys:
            dup_count += 1
            continue
        seen_keys.add(biz_key)

        first_subject, req_tree, review_status = parse_requirement(req_raw)
        if review_status == "unknown":
            unknown_count += 1

        expr_counter[req_raw] += 1
        level_counter[level] += 1

        offerings.append(
            {
                "id": f"{args.province.lower()}_{args.year}_{row_num:06d}",
                "datasetId": dataset_id,
                "institutionCode": inst_code,
                "institutionName": inst_name,
                "majorCode": major_code,
                "majorName": major_name,
                "majorId": major_name,
                "level": level,
                "firstSubject": first_subject,
                "requirementTree": req_tree,
                "requirementRaw": req_raw,
                "reviewStatus": review_status,
            }
        )

    scope_note = args.scope_note.strip() or (
        f"依据官方公布的《{os.path.basename(args.input)}》整理（共 {len(offerings)} 条）。"
        f"实际招生计划以 {args.year} 年官方公布为准。"
    )

    bundle = {
        "dataset": {
            "id": dataset_id,
            "provinceCode": args.province,
            "dataYear": args.year,
            "applicableYears": [args.year],
            "kind": "subject_requirements",
            "level": "本科/专科（普通高校）",
            "version": args.version,
            "status": "published",
            "sourceIds": [args.source_id],
            "completeness": "full",
            "scopeNote": scope_note,
            "rawSha256": sha256,
        },
        "offerings": offerings,
    }

    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(bundle, f, ensure_ascii=False, separators=(",", ":"))

    print(f"[import-official-xlsx] 转换成功 -> {args.output}")
    print(f"  原始文件 SHA-256: {sha256}")
    print(f"  去重后总条目数: {len(offerings)} (跳过重复业务键: {dup_count})")
    print(f"  学历层次分布: {dict(level_counter)}")
    print(f"  不同要求表达式种类: {len(expr_counter)}，待复核 unknown: {unknown_count}")


if __name__ == "__main__":
    main()
