"""Generate executive / technical PDF reports for a campaign."""

from __future__ import annotations

from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)


MK_BLUE = colors.HexColor("#1F4E79")
MK_ACCENT = colors.HexColor("#2E7D32")
MK_LINE = colors.HexColor("#BFBFBF")
MK_CRIT = colors.HexColor("#B71C1C")
MK_HIGH = colors.HexColor("#E65100")
MK_MED = colors.HexColor("#F9A825")
MK_LOW = colors.HexColor("#1565C0")


def _styles(lang: str) -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "MKTitle",
            parent=base["Title"],
            fontSize=18,
            textColor=MK_BLUE,
            spaceAfter=6,
            alignment=TA_LEFT,
        ),
        "h2": ParagraphStyle(
            "MKH2",
            parent=base["Heading2"],
            fontSize=12,
            textColor=MK_BLUE,
            spaceBefore=12,
            spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "MKBody",
            parent=base["Normal"],
            fontSize=9,
            leading=12,
            alignment=TA_JUSTIFY,
        ),
        "small": ParagraphStyle(
            "MKSmall",
            parent=base["Normal"],
            fontSize=8,
            textColor=colors.HexColor("#555555"),
            leading=10,
        ),
        "mono": ParagraphStyle(
            "MKMono",
            parent=base["Code"],
            fontSize=7,
            leading=9,
            fontName="Courier",
        ),
    }


def _t(lang: str, es: str, en: str) -> str:
    return es if lang == "es" else en


def _sev_color(code: str):
    return {
        "critical": MK_CRIT,
        "high": MK_HIGH,
        "medium": MK_MED,
        "low": MK_LOW,
    }.get((code or "").lower(), colors.grey)


def build_report_pdf(
    *,
    report_type: str,
    language: str,
    campaign: dict[str, Any],
    findings: list[dict[str, Any]],
    organization_name: str,
) -> bytes:
    """Return PDF bytes for executive or technical report."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
        topMargin=1.6 * cm,
        bottomMargin=1.6 * cm,
        title=f"MK Service — {report_type}",
        author="MK Service",
    )
    styles = _styles(language)
    story: list[Any] = []
    lang = language if language in ("es", "en") else "es"

    # Header
    story.append(Paragraph("MK Service", styles["title"]))
    story.append(
        Paragraph(
            _t(
                lang,
                "Auditoría de vulnerabilidades en sistemas RAG",
                "RAG vulnerability audit",
            ),
            styles["small"],
        )
    )
    story.append(HRFlowable(width="100%", thickness=1, color=MK_BLUE, spaceAfter=8))

    kind = _t(
        lang,
        "Informe ejecutivo" if report_type == "executive" else "Informe técnico",
        "Executive report" if report_type == "executive" else "Technical report",
    )
    story.append(Paragraph(kind, styles["h2"]))
    story.append(
        Paragraph(
            f"<b>{_t(lang, 'Organización', 'Organization')}:</b> {organization_name}<br/>"
            f"<b>{_t(lang, 'Campaña', 'Campaign')}:</b> #{campaign.get('campaign_id')} — {campaign.get('name')}<br/>"
            f"<b>{_t(lang, 'Estado', 'Status')}:</b> {campaign.get('status')}<br/>"
            f"<b>{_t(lang, 'Generado', 'Generated')}:</b> {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
            styles["body"],
        )
    )

    # Summary counts
    by_sev: dict[str, int] = {}
    for f in findings:
        s = (f.get("severity") or "unknown").lower()
        by_sev[s] = by_sev.get(s, 0) + 1

    story.append(Paragraph(_t(lang, "Resumen", "Summary"), styles["h2"]))
    story.append(
        Paragraph(
            _t(
                lang,
                f"Se registraron <b>{len(findings)}</b> hallazgos en esta campaña. "
                f"Critical: {by_sev.get('critical', 0)}, High: {by_sev.get('high', 0)}, "
                f"Medium: {by_sev.get('medium', 0)}, Low: {by_sev.get('low', 0)}.",
                f"<b>{len(findings)}</b> findings were recorded in this campaign. "
                f"Critical: {by_sev.get('critical', 0)}, High: {by_sev.get('high', 0)}, "
                f"Medium: {by_sev.get('medium', 0)}, Low: {by_sev.get('low', 0)}.",
            ),
            styles["body"],
        )
    )

    if report_type == "executive":
        story.append(Paragraph(_t(lang, "Conclusión para negocio", "Business takeaway"), styles["h2"]))
        if not findings:
            story.append(
                Paragraph(
                    _t(
                        lang,
                        "No se detectaron vulnerabilidades con los probes ejecutados. "
                        "Se recomienda repetir la auditoría tras cambios en el RAG o el modelo.",
                        "No vulnerabilities were detected with the probes run. "
                        "Re-run the audit after RAG or model changes.",
                    ),
                    styles["body"],
                )
            )
        else:
            top = sorted(
                findings,
                key=lambda x: {"critical": 0, "high": 1, "medium": 2, "low": 3}.get(
                    (x.get("severity") or "").lower(), 9
                ),
            )[:5]
            lines = [
                _t(
                    lang,
                    "Priorice la mitigación de los hallazgos de mayor severidad. "
                    "Los ítems siguientes concentran el riesgo principal:",
                    "Prioritize mitigation of the highest-severity findings. "
                    "The following items concentrate the main risk:",
                )
            ]
            for f in top:
                lines.append(f"• [{(f.get('severity') or '').upper()}] {f.get('title')}")
            story.append(Paragraph("<br/>".join(lines), styles["body"]))

            story.append(Paragraph(_t(lang, "Recomendaciones prioritarias", "Priority recommendations"), styles["h2"]))
            for f in top:
                rec = f.get("recommendation") or "—"
                story.append(
                    Paragraph(f"<b>{f.get('title')}</b><br/>{rec}", styles["body"])
                )
                story.append(Spacer(1, 4 * mm))
    else:
        # Technical: full table + detail
        story.append(Paragraph(_t(lang, "Inventario de hallazgos", "Findings inventory"), styles["h2"]))
        if not findings:
            story.append(
                Paragraph(
                    _t(lang, "Sin hallazgos registrados.", "No findings recorded."),
                    styles["body"],
                )
            )
        else:
            header = [
                _t(lang, "ID", "ID"),
                _t(lang, "Severidad", "Severity"),
                _t(lang, "Categoría", "Category"),
                _t(lang, "Título", "Title"),
                _t(lang, "Estado", "Status"),
            ]
            data = [header]
            for f in findings:
                data.append(
                    [
                        str(f.get("finding_id", "")),
                        (f.get("severity") or "").upper(),
                        (f.get("category") or "")[:24],
                        Paragraph((f.get("title") or "")[:80], styles["small"]),
                        f.get("status") or "",
                    ]
                )
            table = Table(data, colWidths=[1.2 * cm, 2.2 * cm, 3.2 * cm, 8 * cm, 2.2 * cm])
            table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), MK_BLUE),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("FONTSIZE", (0, 0), (-1, -1), 7),
                        ("GRID", (0, 0), (-1, -1), 0.4, MK_LINE),
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F5F5F5")]),
                        ("LEFTPADDING", (0, 0), (-1, -1), 3),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
                        ("TOPPADDING", (0, 0), (-1, -1), 3),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                    ]
                )
            )
            story.append(table)

            story.append(Paragraph(_t(lang, "Detalle técnico", "Technical detail"), styles["h2"]))
            for f in findings:
                story.append(
                    Paragraph(
                        f"<b>#{f.get('finding_id')} — {f.get('title')}</b> "
                        f"[{(f.get('severity') or '').upper()} / {f.get('category')}]",
                        styles["body"],
                    )
                )
                if f.get("description"):
                    story.append(Paragraph(f.get("description")[:1200], styles["small"]))
                if f.get("query_used"):
                    story.append(
                        Paragraph(
                            f"<b>Query / payload</b>",
                            styles["small"],
                        )
                    )
                    story.append(Paragraph((f.get("query_used") or "")[:800].replace("\n", "<br/>"), styles["mono"]))
                if f.get("response_excerpt"):
                    story.append(Paragraph("<b>Response excerpt</b>", styles["small"]))
                    story.append(
                        Paragraph(
                            (f.get("response_excerpt") or "")[:800].replace("\n", "<br/>"),
                            styles["mono"],
                        )
                    )
                if f.get("recommendation"):
                    story.append(
                        Paragraph(
                            f"<b>{_t(lang, 'Recomendación', 'Recommendation')}:</b> {f.get('recommendation')}",
                            styles["small"],
                        )
                    )
                story.append(Spacer(1, 3 * mm))

    story.append(Spacer(1, 8 * mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=MK_LINE, spaceAfter=4))
    story.append(
        Paragraph(
            _t(
                lang,
                "Documento generado automáticamente por MK Service. Uso interno de la organización auditada.",
                "Document generated automatically by MK Service. Internal use for the audited organization.",
            ),
            styles["small"],
        )
    )

    doc.build(story)
    return buffer.getvalue()


def write_report_file(path: Path, content: bytes) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    return len(content)