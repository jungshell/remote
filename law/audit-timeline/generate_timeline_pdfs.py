# -*- coding: utf-8 -*-
"""충남콘텐츠진흥원 감사 통보 일정 — PDF 2종 생성 (표형 / 인포그래픽형)"""

from pathlib import Path

from fpdf import FPDF
from fpdf.fonts import FontFace

FONT_CANDIDATES = [
    Path(r"C:\Windows\Fonts\malgun.ttf"),
    Path(r"C:\Windows\Fonts\malgunsl.ttf"),
]


def find_korean_font() -> Path:
    for p in FONT_CANDIDATES:
        if p.exists():
            return p
    raise FileNotFoundError(
        "한글 폰트를 찾을 수 없습니다. C:\\Windows\\Fonts\\malgun.ttf 경로를 확인하세요."
    )


class KoreanPDF(FPDF):
    def __init__(self, font_path: Path):
        super().__init__()
        self._font_path = font_path

    def footer(self):
        self.set_y(-12)
        self.set_font("Korean", "", 8)
        self.set_text_color(100, 100, 100)
        self.cell(0, 8, f"{self.page_no()}/{{nb}}", align="C")


def build_table_pdf(out: Path, font_path: Path) -> None:
    pdf = KoreanPDF(font_path)
    pdf.alias_nb_pages()
    pdf.add_page()
    pdf.add_font("Korean", "", str(font_path))
    pdf.set_auto_page_break(auto=True, margin=16)

    # 제목
    pdf.set_font("Korean", "", 15)
    pdf.set_text_color(22, 48, 105)
    pdf.multi_cell(0, 9, "충청남도 감사 심의결과 통보 — 일정·절차 총괄표 (표형)", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1)
    pdf.set_font("Korean", "", 9)
    pdf.set_text_color(55, 55, 55)
    pdf.multi_cell(
        0,
        5,
        "통보 수령일(D일): 2026년 4월 2일(목)  |  근거: 통보 공문 · 충청남도 자체감사 규칙 제24·28·30조 등",
        new_x="LMARGIN",
        new_y="NEXT",
    )
    pdf.ln(3)

    heading = FontFace(
        size_pt=9,
        color=(255, 255, 255),
        fill_color=(52, 78, 140),
        emphasis="",
    )
    data = [
        ["시한(목표)", "근거·유형", "이행·구비 사항"],
        [
            "D일\n2026. 4. 2.(목)",
            "수령",
            "공문·징계요구서 원본 편철, 수령 기록, 담당 지정(인사·법무), 내부 보고·개인정보 취급",
        ],
        [
            "D+즉시 ~ 4월 초",
            "전략",
            "재심의 검토 vs 징계 착수. 감사위에 1개월 기산·재심의 병행 시 해석 서면 문의 권장",
        ],
        [
            "~ 2026. 5. 2.(토) ※",
            "제24조②·공문\n(1개월)",
            "징계·징계부가금·문책: 징계의결 요구 + 의결 결과 지체 없이 제출. 토요일 → 익 영업일 접수 관행 확인",
        ],
        [
            "~ 2026. 5. 2.(토) ※",
            "제28조①·공문\n(1개월)",
            "재심의 신청(이유·증빙). 별지 제12호. 접수 후 원칙 2개월 이내 처리(제28조④)",
        ],
        [
            "재심의\n접수 후 ~ 2개월",
            "제28조④",
            "기각 또는 처분요구 취소·변경. 결과에 따라 징계·이행 일정 조정",
        ],
        [
            "~ 2026. 6. 1.(월) ※",
            "공문\n(60일)",
            "조치 이행 및 이행결과 제출. 미완 시 부분 이행·진행 통지를 감사위와 사전 협의",
        ],
        [
            "징계의결 후",
            "공문 나목",
            "중징계: 인사위가 경한 의결 시 집행 전 감사위에 징계의결 결과 통보",
        ],
    ]

    with pdf.table(
        width=182,
        col_widths=(32, 38, 112),
        text_align=("LEFT", "LEFT", "LEFT"),
        line_height=5.2,
        padding=(2, 2, 2, 2),
        borders_layout="ALL",
        first_row_as_headings=True,
        headings_style=heading,
        cell_fill_mode="ROWS",
        cell_fill_color=(245, 248, 255),
    ) as table:
        for i, row in enumerate(data):
            r = table.row()
            for j, text in enumerate(row):
                r.cell(text)

    pdf.ln(5)
    pdf.set_font("Korean", "", 9)
    pdf.set_text_color(80, 40, 40)
    pdf.multi_cell(0, 5, "【유의】 2026. 5. 2.는 토요일 — 감사위 접수 가능일·기산(통보 당일 포함 여부)은 법무·감사위로 확인.", new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(70, 70, 70)
    pdf.set_font("Korean", "", 8)
    pdf.ln(1)
    pdf.multi_cell(
        0,
        4,
        "※ 60일·1개월 말일은 민법 기간·휴일 적용에 따라 하루 차이가 날 수 있습니다. 본 표는 일정 관리용 참고이며 최종 확인은 담당 법무·감사위에 의합니다.",
        new_x="LMARGIN",
        new_y="NEXT",
    )

    out.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(out))


def build_infographic_pdf(out: Path, font_path: Path) -> None:
    pdf = KoreanPDF(font_path)
    pdf.alias_nb_pages()
    pdf.add_page()
    pdf.add_font("Korean", "", str(font_path))
    pdf.set_auto_page_break(auto=True, margin=14)

    W, margin = 210, 12

    # 헤더 띠
    pdf.set_fill_color(28, 58, 128)
    pdf.rect(0, 0, W, 30, "F")
    pdf.set_xy(margin, 7)
    pdf.set_font("Korean", "", 16)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 8, "감사 통보 일정 로드맵", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(margin)
    pdf.set_font("Korean", "", 11)
    pdf.cell(0, 7, "(재)충남콘텐츠진흥원 — 인포그래픽형", new_x="LMARGIN", new_y="NEXT")

    pdf.set_xy(margin, 34)
    pdf.set_font("Korean", "", 10)
    pdf.set_text_color(55, 55, 60)
    pdf.cell(0, 6, "D = 통보 수령일  |  2026년 4월 2일(목)", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    line_x = margin + 6
    y = pdf.get_y()

    cards = [
        ("2026. 4. 2. (목)", "D일 · 수령", "편철 · 담당 · 보고 · 기록", (72, 128, 205)),
        ("4월 초", "전략 · 감사위 문의", "재심의 vs 징계 · 1개월 기산 해석", (95, 158, 220)),
        ("~ 5. 2. ※", "듀얼 데드라인 (1개월)", "징계의결 요구  +  재심의(선택)", (0, 128, 90)),
        ("재심의 접수 후", "약 2개월 (원칙)", "제28조④ 심의 · 기각/취소·변경", (230, 126, 52)),
        ("~ 6. 1. ※", "이행 완료 목표 (60일)", "이행결과 제출 · 미완 시 협의", (120, 82, 180)),
    ]

    for i, (date_s, title, sub, rgb) in enumerate(cards):
        if i:
            pdf.set_draw_color(190, 198, 215)
            pdf.set_line_width(0.35)
            pdf.line(line_x, y - 1, line_x, y + 3)

        pdf.set_fill_color(*rgb)
        pdf.ellipse(line_x - 2.5, y + 5.5, 5, 5, "F")

        bx, by, bw, bh = margin + 10, y, W - 2 * margin - 8, 24
        pdf.set_fill_color(248, 250, 255)
        pdf.set_draw_color(175, 188, 215)
        pdf.rect(bx, by, bw, bh, style="DF", round_corners=True, corner_radius=2.5)

        pdf.set_xy(bx + 4, by + 3)
        pdf.set_font("Korean", "", 10)
        pdf.set_text_color(*rgb)
        w_date = 48
        pdf.cell(w_date, 6, date_s)
        pdf.set_font("Korean", "", 10)
        pdf.set_text_color(35, 45, 70)
        pdf.cell(0, 6, title, new_x="LMARGIN", new_y="NEXT")
        pdf.set_x(bx + 4)
        pdf.set_font("Korean", "", 9)
        pdf.set_text_color(75, 80, 90)
        pdf.cell(0, 5, sub, new_x="LMARGIN", new_y="NEXT")
        y += 28

    pdf.set_y(y + 6)

    # 하단 체크리스트 박스
    bx, by, bw, bh = margin, pdf.get_y(), W - 2 * margin, 48
    pdf.set_fill_color(242, 246, 254)
    pdf.set_draw_color(150, 170, 205)
    pdf.rect(bx, by, bw, bh, style="DF", round_corners=True, corner_radius=2.5)
    pdf.set_xy(bx + 5, by + 4)
    pdf.set_font("Korean", "", 11)
    pdf.set_text_color(28, 58, 128)
    pdf.cell(0, 7, "준비물 · 체크", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(bx + 5)
    pdf.set_font("Korean", "", 9)
    pdf.set_text_color(45, 50, 60)
    checklist = (
        "□ 징계: 인사규정 · 행동강령 · 징계규칙  |  징계안건·증거목록  |  위원회 일정·의결요구 공문\n"
        "□ 재심의: 별지 12호  |  이유서  |  증빙(과업·회계·품의 등)\n"
        "□ 이행: 결과보고 초안  |  중징계 시 통문 나목(경한 의결·사전 통보)\n"
        "□ ※ : 말일·휴일·기산은 법무·감사위 확인"
    )
    pdf.multi_cell(bw - 10, 5, checklist)

    pdf.set_y(by + bh + 8)
    pdf.set_font("Korean", "", 7)
    pdf.set_text_color(115, 115, 120)
    pdf.multi_cell(0, 4, "본 문서는 일정 관리용이며 법적 효력을 대체하지 않습니다.")

    out.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(out))


def main():
    base = Path(__file__).resolve().parent
    font = find_korean_font()
    # ASCII 파일명(환경 무관). PDF 안쪽 문서는 모두 한글.
    t1 = base / "audit_timeline_table.pdf"
    t2 = base / "audit_timeline_infographic.pdf"
    build_table_pdf(t1, font)
    build_infographic_pdf(t2, font)
    print("OK:", t1)
    print("OK:", t2)


if __name__ == "__main__":
    main()
