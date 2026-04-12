"""
Markdown → HWPX 변환 스크립트
HWPX는 ZIP 기반 XML 포맷 (한컴오피스 한글 OWPML)
"""

import os
import re
import zipfile
import uuid
from datetime import datetime
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom.minidom import parseString


def md_to_hwpx(md_path: str, hwpx_path: str):
    with open(md_path, "r", encoding="utf-8") as f:
        md_content = f.read()

    lines = md_content.split("\n")
    paragraphs = parse_markdown(lines)

    with zipfile.ZipFile(hwpx_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("mimetype", "application/hwp+zip")
        zf.writestr("META-INF/manifest.xml", gen_manifest())
        zf.writestr("Contents/header.xml", gen_header())
        zf.writestr("Contents/section0.xml", gen_section(paragraphs))
        zf.writestr("settings.xml", gen_settings())
        zf.writestr("version.xml", gen_version())

    print(f"HWPX 생성 완료: {hwpx_path}")


def parse_markdown(lines):
    """마크다운을 파싱하여 단락 목록 반환"""
    paragraphs = []
    in_table = False
    table_rows = []
    in_code = False
    code_lines = []
    i = 0

    while i < len(lines):
        line = lines[i]

        # 코드 블록
        if line.strip().startswith("```"):
            if in_code:
                paragraphs.append({"type": "code", "text": "\n".join(code_lines)})
                code_lines = []
                in_code = False
            else:
                in_code = True
            i += 1
            continue

        if in_code:
            code_lines.append(line)
            i += 1
            continue

        # 빈 줄
        if not line.strip():
            if in_table and table_rows:
                paragraphs.append({"type": "table", "rows": table_rows})
                table_rows = []
                in_table = False
            i += 1
            continue

        # 구분선
        if line.strip() in ("---", "***", "___"):
            if in_table and table_rows:
                paragraphs.append({"type": "table", "rows": table_rows})
                table_rows = []
                in_table = False
            paragraphs.append({"type": "hr"})
            i += 1
            continue

        # 테이블
        if "|" in line and line.strip().startswith("|"):
            stripped = line.strip()
            # 구분선 행 건너뛰기
            if re.match(r"^\|[\s\-:|\s]+\|$", stripped):
                in_table = True
                i += 1
                continue
            cells = [c.strip() for c in stripped.split("|")[1:-1]]
            if cells:
                in_table = True
                table_rows.append(cells)
            i += 1
            continue

        # 테이블 끝
        if in_table and table_rows:
            paragraphs.append({"type": "table", "rows": table_rows})
            table_rows = []
            in_table = False

        # 제목
        m = re.match(r"^(#{1,6})\s+(.+)$", line)
        if m:
            level = len(m.group(1))
            text = clean_md(m.group(2))
            paragraphs.append({"type": f"h{level}", "text": text})
            i += 1
            continue

        # 인용
        if line.strip().startswith(">"):
            text = clean_md(line.strip().lstrip("> "))
            paragraphs.append({"type": "quote", "text": text})
            i += 1
            continue

        # 리스트
        m = re.match(r"^(\s*)[-*]\s+(.+)$", line)
        if m:
            indent = len(m.group(1)) // 2
            text = clean_md(m.group(2))
            # 체크박스 처리
            text = text.replace("[ ]", "☐").replace("[x]", "☑").replace("[X]", "☑")
            paragraphs.append({"type": "list", "text": text, "indent": indent})
            i += 1
            continue

        # 번호 리스트
        m = re.match(r"^(\s*)\d+\.\s+(.+)$", line)
        if m:
            indent = len(m.group(1)) // 2
            text = clean_md(m.group(2))
            paragraphs.append({"type": "olist", "text": text, "indent": indent})
            i += 1
            continue

        # 일반 텍스트
        text = clean_md(line.strip())
        if text:
            paragraphs.append({"type": "p", "text": text})
        i += 1

    # 마지막 테이블
    if in_table and table_rows:
        paragraphs.append({"type": "table", "rows": table_rows})

    return paragraphs


def clean_md(text):
    """마크다운 인라인 서식 제거"""
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)  # bold
    text = re.sub(r"\*(.+?)\*", r"\1", text)  # italic
    text = re.sub(r"`(.+?)`", r"\1", text)  # inline code
    text = re.sub(r"\[(.+?)\]\(.+?\)", r"\1", text)  # links
    text = re.sub(r"[☐☑]", lambda m: m.group(), text)
    return text.strip()


# ─── HWPX XML 생성 ───


HWPML_NS = "http://www.hancom.co.kr/hwpml/2011/paragraph"
HWPML_CORE = "http://www.hancom.co.kr/hwpml/2011/core"
HWPML_HEAD = "http://www.hancom.co.kr/hwpml/2011/head"


def gen_manifest():
    return """<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0">
  <manifest:file-entry manifest:full-path="/" manifest:media-type="application/hwp+zip"/>
  <manifest:file-entry manifest:full-path="Contents/header.xml" manifest:media-type="application/xml"/>
  <manifest:file-entry manifest:full-path="Contents/section0.xml" manifest:media-type="application/xml"/>
  <manifest:file-entry manifest:full-path="settings.xml" manifest:media-type="application/xml"/>
  <manifest:file-entry manifest:full-path="version.xml" manifest:media-type="application/xml"/>
</manifest:manifest>"""


def gen_version():
    return """<?xml version="1.0" encoding="UTF-8"?>
<owpml version="1.2"/>"""


def gen_settings():
    return """<?xml version="1.0" encoding="UTF-8"?>
<ha:HWPApplicationSetting xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app">
  <ha:CaretPosition list="0" para="0" pos="0"/>
</ha:HWPApplicationSetting>"""


def gen_header():
    """문서 헤더 (글꼴, 스타일 정의)"""
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<hh:head xmlns:hh="{HWPML_HEAD}" xmlns:hp="{HWPML_NS}" xmlns:hc="{HWPML_CORE}" version="1.2">
  <hh:beginNum page="1" footnote="1" endnote="1"/>
  <hh:refList>
    <hh:fontfaces>
      <hh:fontface lang="HANGUL">
        <hh:font id="0" face="함초롬돋움" type="TTF"/>
        <hh:font id="1" face="함초롬바탕" type="TTF"/>
      </hh:fontface>
      <hh:fontface lang="LATIN">
        <hh:font id="0" face="함초롬돋움" type="TTF"/>
        <hh:font id="1" face="함초롬바탕" type="TTF"/>
      </hh:fontface>
    </hh:fontfaces>
    <hh:borderFills>
      <hh:borderFill id="1">
        <hh:slash type="NONE"/>
        <hh:leftBorder type="SOLID" width="0.12mm" color="#000000"/>
        <hh:rightBorder type="SOLID" width="0.12mm" color="#000000"/>
        <hh:topBorder type="SOLID" width="0.12mm" color="#000000"/>
        <hh:bottomBorder type="SOLID" width="0.12mm" color="#000000"/>
        <hh:fillBrush>
          <hh:winBrush faceColor="#FFFFFF" hatchColor="#000000"/>
        </hh:fillBrush>
      </hh:borderFill>
      <hh:borderFill id="2">
        <hh:slash type="NONE"/>
        <hh:leftBorder type="SOLID" width="0.12mm" color="#000000"/>
        <hh:rightBorder type="SOLID" width="0.12mm" color="#000000"/>
        <hh:topBorder type="SOLID" width="0.12mm" color="#000000"/>
        <hh:bottomBorder type="SOLID" width="0.12mm" color="#000000"/>
        <hh:fillBrush>
          <hh:winBrush faceColor="#E8E8E8" hatchColor="#000000"/>
        </hh:fillBrush>
      </hh:borderFill>
    </hh:borderFills>
    <hh:charProperties>
      <hh:charPr id="0" height="1000" bold="false">
        <hh:fontRef hangul="1" latin="1"/>
      </hh:charPr>
      <hh:charPr id="1" height="2000" bold="true">
        <hh:fontRef hangul="0" latin="0"/>
      </hh:charPr>
      <hh:charPr id="2" height="1600" bold="true">
        <hh:fontRef hangul="0" latin="0"/>
      </hh:charPr>
      <hh:charPr id="3" height="1300" bold="true">
        <hh:fontRef hangul="0" latin="0"/>
      </hh:charPr>
      <hh:charPr id="4" height="1000" bold="false" italic="true">
        <hh:fontRef hangul="1" latin="1"/>
      </hh:charPr>
      <hh:charPr id="5" height="900" bold="false">
        <hh:fontRef hangul="0" latin="0"/>
      </hh:charPr>
    </hh:charProperties>
    <hh:paraProperties>
      <hh:paraPr id="0" align="JUSTIFY">
        <hh:spacing line="160" lineType="PERCENT"/>
        <hh:margin left="0" right="0" indent="0"/>
      </hh:paraPr>
      <hh:paraPr id="1" align="LEFT">
        <hh:spacing line="160" lineType="PERCENT" before="400"/>
        <hh:margin left="0" right="0" indent="0"/>
      </hh:paraPr>
      <hh:paraPr id="2" align="LEFT">
        <hh:spacing line="160" lineType="PERCENT" before="200"/>
        <hh:margin left="0" right="0" indent="0"/>
      </hh:paraPr>
      <hh:paraPr id="3" align="LEFT">
        <hh:spacing line="160" lineType="PERCENT" before="100"/>
        <hh:margin left="800" right="0" indent="-200"/>
      </hh:paraPr>
      <hh:paraPr id="4" align="LEFT">
        <hh:spacing line="150" lineType="PERCENT"/>
        <hh:margin left="400" right="400" indent="0"/>
      </hh:paraPr>
      <hh:paraPr id="5" align="LEFT">
        <hh:spacing line="140" lineType="PERCENT"/>
        <hh:margin left="200" right="0" indent="0"/>
      </hh:paraPr>
    </hh:paraProperties>
  </hh:refList>
  <hh:secProperties>
    <hh:secPr>
      <hh:pageSize width="59528" height="84188" landscape="false"/>
      <hh:pageMar left="4252" right="4252" top="5668" bottom="4252" header="4252" footer="4252" gutter="0"/>
    </hh:secPr>
  </hh:secProperties>
</hh:head>"""


def gen_section(paragraphs):
    """본문 생성"""
    parts = []
    parts.append(f"""<?xml version="1.0" encoding="UTF-8"?>
<hs:sec xmlns:hs="{HWPML_NS}" xmlns:hp="{HWPML_NS}" xmlns:hc="{HWPML_CORE}">""")

    for p in paragraphs:
        ptype = p["type"]

        if ptype == "h1":
            parts.append(make_para(p["text"], char_pr="1", para_pr="1"))
        elif ptype == "h2":
            parts.append(make_para(p["text"], char_pr="2", para_pr="1"))
        elif ptype in ("h3", "h4", "h5", "h6"):
            parts.append(make_para(p["text"], char_pr="3", para_pr="2"))
        elif ptype == "quote":
            parts.append(make_para(p["text"], char_pr="4", para_pr="4"))
        elif ptype == "list":
            indent_marker = "  " * p.get("indent", 0)
            parts.append(make_para(f"{indent_marker}• {p['text']}", char_pr="0", para_pr="3"))
        elif ptype == "olist":
            indent_marker = "  " * p.get("indent", 0)
            parts.append(make_para(f"{indent_marker}{p['text']}", char_pr="0", para_pr="3"))
        elif ptype == "code":
            for code_line in p["text"].split("\n"):
                parts.append(make_para(code_line if code_line else " ", char_pr="5", para_pr="5"))
        elif ptype == "table":
            parts.append(make_table(p["rows"]))
        elif ptype == "hr":
            parts.append(make_para("─" * 60, char_pr="0", para_pr="0"))
        elif ptype == "p":
            parts.append(make_para(p["text"], char_pr="0", para_pr="0"))

    parts.append("</hs:sec>")
    return "\n".join(parts)


def make_para(text, char_pr="0", para_pr="0"):
    escaped = escape_xml(text)
    return f"""  <hp:p paraPrIDRef="{para_pr}">
    <hp:run charPrIDRef="{char_pr}">
      <hp:t>{escaped}</hp:t>
    </hp:run>
  </hp:p>"""


def make_table(rows):
    """테이블 생성 (HWPX 테이블 구조)"""
    if not rows:
        return ""

    num_cols = max(len(r) for r in rows)
    num_rows = len(rows)
    col_width = 50000 // num_cols  # A4 기준 균등 분배

    parts = []

    # 테이블 헤더 행 (첫 번째 행)은 굵게 표시
    for ri, row in enumerate(rows):
        is_header = ri == 0
        for ci in range(num_cols):
            cell_text = row[ci] if ci < len(row) else ""
            char_id = "3" if is_header else "0"
            parts.append(make_para(
                f"{'| ' if ci == 0 else ''}{cell_text} | ",
                char_pr=char_id,
                para_pr="0"
            ))

    return "\n".join(parts)


def escape_xml(text):
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python md_to_hwpx.py <input.md> [output.hwpx]")
        sys.exit(1)

    md_file = sys.argv[1]
    hwpx_file = sys.argv[2] if len(sys.argv) > 2 else md_file.rsplit(".", 1)[0] + ".hwpx"

    md_to_hwpx(md_file, hwpx_file)
