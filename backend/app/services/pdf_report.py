"""Corporate-style executive / technical PDF reports (ES | EN)."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# Corporate palette (closer to classic audit memos)
NAVY = colors.HexColor("#1A365D")
RED = colors.HexColor("#C53030")
BLACK = colors.HexColor("#1A202C")
GRAY = colors.HexColor("#4A5568")
LINE = colors.HexColor("#CBD5E0")
BG = colors.HexColor("#F7FAFC")
WHITE = colors.white

CRIT = colors.HexColor("#9B2C2C")
HIGH = colors.HexColor("#C05600")
MED = colors.HexColor("#B7791F")
LOW = colors.HexColor("#2B6CB0")


def _styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "org": ParagraphStyle(
            "org",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            textColor=RED,
            leading=14,
        ),
        "doc_title": ParagraphStyle(
            "doc_title",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=12,
            textColor=BLACK,
            leading=15,
            spaceAfter=2,
        ),
        "section": ParagraphStyle(
            "section",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            textColor=BLACK,
            spaceBefore=12,
            spaceAfter=6,
            leading=14,
        ),
        "subsection": ParagraphStyle(
            "subsection",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10,
            textColor=NAVY,
            spaceBefore=8,
            spaceAfter=4,
            leading=13,
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=13,
            alignment=TA_JUSTIFY,
            textColor=BLACK,
        ),
        "body_left": ParagraphStyle(
            "body_left",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=13,
            alignment=TA_LEFT,
            textColor=BLACK,
        ),
        "small": ParagraphStyle(
            "small",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=11,
            textColor=GRAY,
        ),
        "mono": ParagraphStyle(
            "mono",
            parent=base["Code"],
            fontName="Courier",
            fontSize=7.5,
            leading=10,
            textColor=BLACK,
        ),
        "meta_label": ParagraphStyle(
            "meta_label",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            textColor=BLACK,
            leading=10,
        ),
        "meta_val": ParagraphStyle(
            "meta_val",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8,
            textColor=BLACK,
            leading=10,
        ),
        "th": ParagraphStyle(
            "th",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            textColor=WHITE,
            leading=10,
            alignment=TA_CENTER,
        ),
        "td": ParagraphStyle(
            "td",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=11,
            textColor=BLACK,
        ),
        "td_center": ParagraphStyle(
            "td_center",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=11,
            textColor=BLACK,
            alignment=TA_CENTER,
        ),
        "footer": ParagraphStyle(
            "footer",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=7,
            textColor=GRAY,
            alignment=TA_CENTER,
        ),
    }


COPY: dict[str, dict[str, str]] = {
    "es": {
        "letterhead_line": "MK Service — Seguridad en sistemas de IA / RAG",
        "report_title_exec": "Informe ejecutivo de auditoría de vulnerabilidades RAG",
        "report_title_tech": "Informe técnico de auditoría de vulnerabilidades RAG",
        "report_no": "Informe No.:",
        "report_type": "Tipo de informe:",
        "date_report": "Fecha de informe:",
        "date_audit": "Fecha de auditoría:",
        "to": "Para:",
        "from": "De:",
        "type_exec": "Ejecutivo",
        "type_tech": "Técnico",
        "from_mk": "MK Service — Motor de auditoría automatizada",
        "s1": "I. ASUNTO",
        "s1_body_exec": (
            "Presentación de los resultados de la auditoría automatizada de seguridad "
            "sobre el sistema de generación aumentada por recuperación (RAG) de la "
            "organización, orientada a la dirección y a la toma de decisiones de negocio."
        ),
        "s1_body_tech": (
            "Detalle técnico de las pruebas de inyección de prompt y fuga de datos "
            "ejecutadas contra el sistema RAG auditado, con evidencia forense de cada hallazgo confirmado."
        ),
        "s2": "II. OBJETIVO",
        "s2_body": (
            "Evaluar si el sistema RAG es susceptible a inyección de instrucciones "
            "(directa o indirecta) y/o a fuga de información sensible contenida en su "
            "base de conocimiento, mediante pruebas controladas con canarios."
        ),
        "s3": "III. ALCANCE",
        "s3_org": "Organización auditada",
        "s3_campaign": "Campaña",
        "s3_status": "Estado de la campaña",
        "s4": "IV. RESUMEN DE RESULTADOS",
        "s4_count": "Total de hallazgos confirmados",
        "s4_risk": "Nivel de riesgo agregado",
        "critical": "Crítico",
        "high": "Alto",
        "medium": "Medio",
        "low": "Bajo",
        "s5": "V. IMPACTO DE NEGOCIO",
        "s6": "VI. EXPOSICIÓN REGULATORIA (COLOMBIA)",
        "s6_fines": "Estimación orientativa de exposición sancionatoria",
        "s7": "VII. INVENTARIO DE HALLAZGOS",
        "s8": "VIII. DETALLE TÉCNICO",
        "s9": "IX. ACCIONES PRIORITARIAS PARA LA DIRECCIÓN",
        "s10": "X. METODOLOGÍA",
        "s11": "XI. DISPOSICIONES FINALES",
        "id": "ID",
        "severity": "Severidad",
        "category": "Categoría",
        "title": "Título",
        "state": "Estado",
        "query": "Consulta / payload de prueba (texto original)",
        "response": "Respuesta del modelo (texto original)",
        "evidence": "Evidencia",
        "recommendation": "Recomendación técnica",
        "evidence_note": (
            "Nota: las consultas de ataque y las respuestas del modelo se conservan en su "
            "idioma original por integridad forense. No se traducen automáticamente."
        ),
        "methodology_body": (
            "Se evaluó el sistema mediante documentos de ataque controlados (tokens canario) "
            "y consultas de elicitación. Un hallazgo se confirma únicamente cuando el valor "
            "canario sembrado aparece de forma exacta en la salida del modelo."
        ),
        "no_findings": "No se registraron hallazgos confirmados en esta campaña.",
        "risk_critical": "Crítico — requiere acción inmediata de la dirección",
        "risk_high": "Alto — plan de remediación en corto plazo",
        "risk_medium": "Medio — corregir en el ciclo de mejoras actual",
        "risk_low": "Bajo — monitorear y endurecer controles",
        "risk_none": "Sin hallazgos confirmados en esta corrida",
        "cat_pi_d": "Inyección de prompt directa",
        "cat_pi_i": "Inyección de prompt indirecta",
        "cat_dl": "Fuga de datos",
        "impact_pi": (
            "Un atacante podría manipular el comportamiento del asistente (desobedecer políticas "
            "o ejecutar instrucciones no autorizadas), erosionando la confianza en el canal de IA."
        ),
        "impact_dl": (
            "Podría exponerse información sensible de la base de conocimiento (datos personales, "
            "secretos de negocio o credenciales), con riesgo reputacional y legal."
        ),
        "law_1581": "Ley 1581 de 2012 (protección de datos personales)",
        "law_1273": "Ley 1273 de 2009 (delitos informáticos)",
        "law_sic": "Régimen sancionatorio de la Superintendencia de Industria y Comercio (SIC)",
        "fine_critical": "Hasta ~2.000 SMMLV por infracciones graves a datos personales (orden de magnitud SIC)",
        "fine_high": "Rango alto: cientos de SMMLV según gravedad y reincidencia (estimación)",
        "fine_medium": "Rango medio: decenas a cientos de SMMLV según el caso (estimación)",
        "fine_low": "Rango bajo / correctivo; implica plan de adecuación documentado",
        "action_1": "Congelar despliegues del asistente en producción si hay hallazgos críticos o de fuga.",
        "action_2": "Asignar responsable (seguridad + legal) y plazo de remediación ≤ 30 días para altos/críticos.",
        "action_3": "Revisar qué datos personales o secretos indexa el RAG; minimizar y clasificar.",
        "action_4": "Programar re-auditoría con MK Service tras aplicar las mitigaciones.",
        "disclaimer": (
            "Documento generado automáticamente por MK Service para uso interno de la organización "
            "auditada. Las estimaciones de multas son orientativas y no constituyen asesoría jurídica. "
            "Consulte a su área legal u oficial de protección de datos."
        ),
        "page": "Página",
        "open": "abierto",
        "completed": "completada",
    },
    "en": {
        "letterhead_line": "MK Service — AI / RAG security assessment",
        "report_title_exec": "Executive report — RAG vulnerability audit",
        "report_title_tech": "Technical report — RAG vulnerability audit",
        "report_no": "Report No.:",
        "report_type": "Report type:",
        "date_report": "Report date:",
        "date_audit": "Audit date:",
        "to": "To:",
        "from": "From:",
        "type_exec": "Executive",
        "type_tech": "Technical",
        "from_mk": "MK Service — Automated audit engine",
        "s1": "I. SUBJECT",
        "s1_body_exec": (
            "Presentation of the automated security audit results on the organization's "
            "retrieval-augmented generation (RAG) system, intended for leadership and business decisions."
        ),
        "s1_body_tech": (
            "Technical detail of prompt-injection and data-leakage tests executed against the "
            "audited RAG system, with forensic evidence for each confirmed finding."
        ),
        "s2": "II. OBJECTIVE",
        "s2_body": (
            "Assess whether the RAG system is susceptible to instruction injection "
            "(direct or indirect) and/or leakage of sensitive knowledge-base content, "
            "using controlled canary-based tests."
        ),
        "s3": "III. SCOPE",
        "s3_org": "Audited organization",
        "s3_campaign": "Campaign",
        "s3_status": "Campaign status",
        "s4": "IV. RESULTS SUMMARY",
        "s4_count": "Total confirmed findings",
        "s4_risk": "Aggregate risk level",
        "critical": "Critical",
        "high": "High",
        "medium": "Medium",
        "low": "Low",
        "s5": "V. BUSINESS IMPACT",
        "s6": "VI. REGULATORY EXPOSURE (COLOMBIA)",
        "s6_fines": "Indicative sanction exposure",
        "s7": "VII. FINDINGS INVENTORY",
        "s8": "VIII. TECHNICAL DETAIL",
        "s9": "IX. PRIORITY ACTIONS FOR LEADERSHIP",
        "s10": "X. METHODOLOGY",
        "s11": "XI. CLOSING NOTES",
        "id": "ID",
        "severity": "Severity",
        "category": "Category",
        "title": "Title",
        "state": "Status",
        "query": "Test query / payload (original text)",
        "response": "Model response (original text)",
        "evidence": "Evidence",
        "recommendation": "Technical recommendation",
        "evidence_note": (
            "Note: attack queries and model responses are preserved in their original language "
            "for forensic integrity. They are not auto-translated."
        ),
        "methodology_body": (
            "The system was tested with controlled attack documents (canary tokens) and "
            "elicitation queries. A finding is confirmed only when the seeded canary appears "
            "exactly in the model output."
        ),
        "no_findings": "No confirmed findings were recorded in this campaign.",
        "risk_critical": "Critical — immediate executive action required",
        "risk_high": "High — short-term remediation plan required",
        "risk_medium": "Medium — address in the current improvement cycle",
        "risk_low": "Low — monitor and harden controls",
        "risk_none": "No confirmed findings in this run",
        "cat_pi_d": "Direct prompt injection",
        "cat_pi_i": "Indirect prompt injection",
        "cat_dl": "Data leakage",
        "impact_pi": (
            "An attacker could manipulate assistant behavior (bypass policies or follow "
            "unauthorized instructions), undermining trust in the AI channel."
        ),
        "impact_dl": (
            "Sensitive knowledge-base content (personal data, business secrets, credentials) "
            "may be exposed, with reputational and legal risk."
        ),
        "law_1581": "Law 1581 of 2012 (personal data protection)",
        "law_1273": "Law 1273 of 2009 (cybercrime)",
        "law_sic": "SIC sanctioning regime (Superintendence of Industry and Commerce)",
        "fine_critical": "Up to ~2,000 monthly minimum wages for serious personal-data breaches (SIC order of magnitude)",
        "fine_high": "High range: hundreds of minimum wages depending on severity and recidivism (estimate)",
        "fine_medium": "Medium range: tens to hundreds of minimum wages (estimate)",
        "fine_low": "Lower / corrective range; still requires a documented remediation plan",
        "action_1": "Freeze production assistant rollouts if critical or leakage findings exist.",
        "action_2": "Assign owner (security + legal) and remediation SLA ≤ 30 days for high/critical.",
        "action_3": "Review which personal data or secrets the RAG indexes; minimize and classify.",
        "action_4": "Schedule an MK Service re-audit after mitigations.",
        "disclaimer": (
            "Automatically generated by MK Service for internal use by the audited organization. "
            "Fine estimates are indicative and do not constitute legal advice. "
            "Consult your legal counsel or data-protection officer."
        ),
        "page": "Page",
        "open": "open",
        "completed": "completed",
    },
}


def _c(lang: str, key: str) -> str:
    return COPY.get(lang, COPY["en"]).get(key, COPY["en"].get(key, key))


def _esc(s: str) -> str:
    return (
        (s or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\n", "<br/>")
    )


def _sev_color(code: str):
    return {"critical": CRIT, "high": HIGH, "medium": MED, "low": LOW}.get(
        (code or "").lower(), GRAY
    )


def _category_label(lang: str, code: str) -> str:
    c = (code or "").lower()
    if "indirect" in c:
        return _c(lang, "cat_pi_i")
    if "direct" in c:
        return _c(lang, "cat_pi_d")
    if "leak" in c or "data" in c:
        return _c(lang, "cat_dl")
    return code or "—"


def _severity_label(lang: str, code: str) -> str:
    return _c(lang, (code or "medium").lower())


def _overall_risk(lang: str, counts: dict[str, int]) -> str:
    if counts.get("critical"):
        return _c(lang, "risk_critical")
    if counts.get("high"):
        return _c(lang, "risk_high")
    if counts.get("medium"):
        return _c(lang, "risk_medium")
    if counts.get("low"):
        return _c(lang, "risk_low")
    return _c(lang, "risk_none")


def _extract_reply(text: str) -> str:
    if not text:
        return ""
    raw = text.strip()
    if raw.startswith("{") and ("reply" in raw or "answer" in raw):
        try:
            data = json.loads(raw)
            if isinstance(data, dict):
                for key in ("reply", "answer", "response", "content", "output"):
                    if isinstance(data.get(key), str) and data[key].strip():
                        return data[key].strip()
        except json.JSONDecodeError:
            pass
    return raw


def _count_severities(findings: list[dict]) -> dict[str, int]:
    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for f in findings:
        k = (f.get("severity") or "").lower()
        if k in counts:
            counts[k] += 1
    return counts


def _letterhead(lang: str, rtype: str, styles: dict) -> list:
    title_key = "report_title_exec" if rtype == "executive" else "report_title_tech"
    story = [
        Paragraph(_c(lang, "letterhead_line"), styles["org"]),
        Paragraph(_c(lang, title_key), styles["doc_title"]),
        HRFlowable(width="100%", thickness=1.5, color=BLACK, spaceBefore=2, spaceAfter=8),
    ]
    return story


def _meta_grid(
    lang: str,
    *,
    report_id: str,
    rtype: str,
    organization_name: str,
    campaign: dict,
    styles: dict,
) -> Table:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    audit_date = now
    type_label = _c(lang, "type_exec" if rtype == "executive" else "type_tech")
    rows = [
        [
            Paragraph(_c(lang, "report_no"), styles["meta_label"]),
            Paragraph(_esc(report_id), styles["meta_val"]),
            Paragraph(_c(lang, "report_type"), styles["meta_label"]),
            Paragraph(type_label, styles["meta_val"]),
        ],
        [
            Paragraph(_c(lang, "date_report"), styles["meta_label"]),
            Paragraph(now, styles["meta_val"]),
            Paragraph(_c(lang, "date_audit"), styles["meta_label"]),
            Paragraph(audit_date, styles["meta_val"]),
        ],
        [
            Paragraph(_c(lang, "to"), styles["meta_label"]),
            Paragraph(_esc(organization_name), styles["meta_val"]),
            Paragraph(_c(lang, "from"), styles["meta_label"]),
            Paragraph(_c(lang, "from_mk"), styles["meta_val"]),
        ],
    ]
    t = Table(rows, colWidths=[3.2 * cm, 5.3 * cm, 3.4 * cm, 5.1 * cm])
    t.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.7, BLACK),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE),
                ("BACKGROUND", (0, 0), (0, -1), BG),
                ("BACKGROUND", (2, 0), (2, -1), BG),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return t


def _sev_summary_table(lang: str, counts: dict[str, int], styles: dict) -> Table:
    header = [
        Paragraph(_c(lang, "critical"), styles["th"]),
        Paragraph(_c(lang, "high"), styles["th"]),
        Paragraph(_c(lang, "medium"), styles["th"]),
        Paragraph(_c(lang, "low"), styles["th"]),
    ]
    vals = [
        Paragraph(str(counts["critical"]), styles["td_center"]),
        Paragraph(str(counts["high"]), styles["td_center"]),
        Paragraph(str(counts["medium"]), styles["td_center"]),
        Paragraph(str(counts["low"]), styles["td_center"]),
    ]
    t = Table([header, vals], colWidths=[4.25 * cm] * 4)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, 0), CRIT),
                ("BACKGROUND", (1, 0), (1, 0), HIGH),
                ("BACKGROUND", (2, 0), (2, 0), MED),
                ("BACKGROUND", (3, 0), (3, 0), LOW),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return t


def _inventory_table(lang: str, findings: list[dict], styles: dict) -> Table:
    header = [
        Paragraph(_c(lang, "id"), styles["th"]),
        Paragraph(_c(lang, "severity"), styles["th"]),
        Paragraph(_c(lang, "category"), styles["th"]),
        Paragraph(_c(lang, "title"), styles["th"]),
        Paragraph(_c(lang, "state"), styles["th"]),
    ]
    rows = [header]
    for f in findings:
        sev = (f.get("severity") or "").lower()
        rows.append(
            [
                Paragraph(str(f.get("finding_id") or "—"), styles["td_center"]),
                Paragraph(_severity_label(lang, sev), styles["td_center"]),
                Paragraph(_esc(_category_label(lang, f.get("category") or "")), styles["td"]),
                Paragraph(_esc(str(f.get("title") or "")[:90]), styles["td"]),
                Paragraph(
                    _esc(str(f.get("status") or _c(lang, "open"))),
                    styles["td_center"],
                ),
            ]
        )
    t = Table(rows, colWidths=[1.4 * cm, 2.4 * cm, 4.2 * cm, 6.8 * cm, 2.2 * cm])
    cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("BOX", (0, 0), (-1, -1), 0.6, BLACK),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    for i in range(1, len(rows)):
        if i % 2 == 0:
            cmds.append(("BACKGROUND", (0, i), (-1, i), BG))
    t.setStyle(TableStyle(cmds))
    return t


def _business_impact(lang: str, findings: list[dict]) -> str:
    cats = {(f.get("category") or "").lower() for f in findings}
    parts = []
    if any("leak" in c or "data" in c for c in cats):
        parts.append(_c(lang, "impact_dl"))
    if any("prompt" in c or "injection" in c for c in cats):
        parts.append(_c(lang, "impact_pi"))
    return " ".join(parts) if parts else _c(lang, "no_findings")


def _fine_lines(lang: str, counts: dict[str, int]) -> list[str]:
    out = []
    if counts.get("critical"):
        out.append(f"• {_c(lang, 'critical')}: {_c(lang, 'fine_critical')}")
    if counts.get("high"):
        out.append(f"• {_c(lang, 'high')}: {_c(lang, 'fine_high')}")
    if counts.get("medium"):
        out.append(f"• {_c(lang, 'medium')}: {_c(lang, 'fine_medium')}")
    if counts.get("low"):
        out.append(f"• {_c(lang, 'low')}: {_c(lang, 'fine_low')}")
    return out or ["• —"]


def _footer(lang: str, canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.line(18 * mm, 15 * mm, A4[0] - 18 * mm, 15 * mm)
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(GRAY)
    canvas.drawString(18 * mm, 10 * mm, "MK Service")
    canvas.drawRightString(
        A4[0] - 18 * mm,
        10 * mm,
        f"{_c(lang, 'page')} {canvas.getPageNumber()}",
    )
    canvas.restoreState()


def build_report_pdf(
    *,
    report_type: str,
    language: str,
    campaign: dict[str, Any],
    findings: list[dict[str, Any]],
    organization_name: str,
    report_id: str | int | None = None,
) -> bytes:
    lang = "es" if (language or "es").lower().startswith("es") else "en"
    rtype = "executive" if (report_type or "").lower().startswith("exec") else "technical"
    styles = _styles()
    counts = _count_severities(findings)
    rid = str(report_id or f"MK-{campaign.get('campaign_id', '0')}-{datetime.now(timezone.utc).strftime('%Y%m%d')}")

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=18 * mm,
    )

    story: list = []
    story.extend(_letterhead(lang, rtype, styles))
    story.append(
        _meta_grid(
            lang,
            report_id=rid,
            rtype=rtype,
            organization_name=organization_name,
            campaign=campaign,
            styles=styles,
        )
    )
    story.append(Spacer(1, 4 * mm))

    # I. Subject
    story.append(Paragraph(_c(lang, "s1"), styles["section"]))
    story.append(
        Paragraph(
            _c(lang, "s1_body_exec" if rtype == "executive" else "s1_body_tech"),
            styles["body"],
        )
    )

    # II. Objective
    story.append(Paragraph(_c(lang, "s2"), styles["section"]))
    story.append(Paragraph(_c(lang, "s2_body"), styles["body"]))

    # III. Scope
    story.append(Paragraph(_c(lang, "s3"), styles["section"]))
    story.append(
        Paragraph(
            f"<b>{_c(lang, 's3_org')}:</b> {_esc(organization_name)}<br/>"
            f"<b>{_c(lang, 's3_campaign')}:</b> #{campaign.get('campaign_id')} — "
            f"{_esc(str(campaign.get('name') or ''))}<br/>"
            f"<b>{_c(lang, 's3_status')}:</b> {_esc(str(campaign.get('status') or ''))}",
            styles["body_left"],
        )
    )

    # IV. Results summary
    story.append(Paragraph(_c(lang, "s4"), styles["section"]))
    story.append(
        Paragraph(
            f"<b>{_c(lang, 's4_count')}:</b> {len(findings)}<br/>"
            f"<b>{_c(lang, 's4_risk')}:</b> {_esc(_overall_risk(lang, counts))}",
            styles["body_left"],
        )
    )
    story.append(Spacer(1, 3 * mm))
    story.append(_sev_summary_table(lang, counts, styles))

    if rtype == "executive":
        story.append(Paragraph(_c(lang, "s5"), styles["section"]))
        story.append(Paragraph(_esc(_business_impact(lang, findings)), styles["body"]))

        story.append(Paragraph(_c(lang, "s6"), styles["section"]))
        story.append(
            Paragraph(
                f"• {_c(lang, 'law_1581')}<br/>"
                f"• {_c(lang, 'law_1273')}<br/>"
                f"• {_c(lang, 'law_sic')}",
                styles["body_left"],
            )
        )
        story.append(Paragraph(_c(lang, "s6_fines"), styles["subsection"]))
        story.append(
            Paragraph("<br/>".join(_esc(x) for x in _fine_lines(lang, counts)), styles["body_left"])
        )

        story.append(Paragraph(_c(lang, "s7"), styles["section"]))
        if findings:
            story.append(_inventory_table(lang, findings, styles))
        else:
            story.append(Paragraph(_c(lang, "no_findings"), styles["body"]))

        story.append(Paragraph(_c(lang, "s9"), styles["section"]))
        for key in ("action_1", "action_2", "action_3", "action_4"):
            story.append(Paragraph(f"• {_c(lang, key)}", styles["body_left"]))

    else:
        story.append(Paragraph(_c(lang, "s10"), styles["section"]))
        story.append(Paragraph(_c(lang, "methodology_body"), styles["body"]))
        story.append(Paragraph(_c(lang, "evidence_note"), styles["small"]))

        story.append(Paragraph(_c(lang, "s7"), styles["section"]))
        if not findings:
            story.append(Paragraph(_c(lang, "no_findings"), styles["body"]))
        else:
            story.append(_inventory_table(lang, findings, styles))
            story.append(Paragraph(_c(lang, "s8"), styles["section"]))
            for f in findings:
                sev = (f.get("severity") or "").lower()
                fid = f.get("finding_id") or "—"
                block: list = [
                    Paragraph(
                        f"<b>#{fid}</b> — {_esc(str(f.get('title') or ''))} "
                        f"[{_severity_label(lang, sev)} / "
                        f"{_esc(_category_label(lang, f.get('category') or ''))}]",
                        styles["subsection"],
                    )
                ]
                desc = f.get("description") or ""
                if desc:
                    block.append(
                        Paragraph(
                            f"<b>{_c(lang, 'evidence')}:</b> {_esc(str(desc))}",
                            styles["body"],
                        )
                    )
                q = f.get("query_used") or ""
                if q:
                    block.append(Paragraph(f"<b>{_c(lang, 'query')}</b>", styles["small"]))
                    block.append(Paragraph(_esc(q[:2500]), styles["mono"]))
                resp = _extract_reply(f.get("response_excerpt") or "")
                if resp:
                    block.append(Paragraph(f"<b>{_c(lang, 'response')}</b>", styles["small"]))
                    block.append(Paragraph(_esc(resp[:2500]), styles["mono"]))
                rec = f.get("recommendation") or ""
                if rec:
                    block.append(
                        Paragraph(
                            f"<b>{_c(lang, 'recommendation')}:</b> {_esc(rec)}",
                            styles["small"],
                        )
                    )
                block.append(Spacer(1, 2 * mm))
                block.append(
                    HRFlowable(width="100%", thickness=0.4, color=LINE, spaceAfter=2)
                )
                story.append(KeepTogether(block))

    story.append(Paragraph(_c(lang, "s11"), styles["section"]))
    story.append(Paragraph(_c(lang, "disclaimer"), styles["small"]))

    doc.build(
        story,
        onFirstPage=lambda c, d: _footer(lang, c, d),
        onLaterPages=lambda c, d: _footer(lang, c, d),
    )
    return buffer.getvalue()


def write_report_file(path: Path, content: bytes) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    return len(content)
