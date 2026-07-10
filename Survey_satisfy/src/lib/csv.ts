import type { SurveyResponseRow } from "@/lib/supabase/database.types";

function escapeCsvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function downloadResponsesCsv(rows: SurveyResponseRow[], filename: string) {
  const headers = [
    "응답ID",
    "설문ID",
    "본부",
    "사업",
    "세부사업",
    "사업유형",
    "휴대폰뒤4자리",
    "제출일시",
    "답변JSON",
  ];

  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      [
        row.id,
        row.survey_id,
        row.division,
        row.business,
        row.sub_business,
        row.program_type,
        row.phone_last4 ?? "",
        row.submitted_at,
        JSON.stringify(row.answers),
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ];

  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
