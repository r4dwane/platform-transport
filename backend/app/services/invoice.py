from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from io import BytesIO


def generate_invoice_pdf(trip: dict, load: dict, client: dict, driver: dict) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20*mm,
        leftMargin=20*mm,
        topMargin=20*mm,
        bottomMargin=20*mm
    )

    styles = getSampleStyleSheet()
    orange = colors.HexColor("#F97316")
    dark   = colors.HexColor("#1F2937")
    gray   = colors.HexColor("#6B7280")
    light  = colors.HexColor("#FFF7ED")

    # ── Styles ──────────────────────────────────────
    title_style = ParagraphStyle("title",
        fontSize=22, textColor=orange, fontName="Helvetica-Bold", spaceAfter=2)
    sub_style = ParagraphStyle("sub",
        fontSize=9, textColor=gray, fontName="Helvetica")
    section_style = ParagraphStyle("section",
        fontSize=11, textColor=dark, fontName="Helvetica-Bold",
        spaceBefore=6, spaceAfter=4)
    normal_style = ParagraphStyle("normal",
        fontSize=9, textColor=dark, fontName="Helvetica", leading=14)
    right_style = ParagraphStyle("right",
        fontSize=9, textColor=dark, fontName="Helvetica",
        alignment=TA_RIGHT)

    # ── Invoice metadata ────────────────────────────
    trip_id     = trip.get("_id", "")
    invoice_no  = f"TDZ-{datetime.utcnow().strftime('%Y%m')}-{trip_id[-6:].upper()}"
    created_at  = trip.get("createdAt", datetime.utcnow())
    fin_at      = trip.get("finAt", datetime.utcnow())
    date_str    = created_at.strftime("%d/%m/%Y") if isinstance(created_at, datetime) else str(created_at)
    fin_str     = fin_at.strftime("%d/%m/%Y") if isinstance(fin_at, datetime) else str(fin_at)

    payment     = trip.get("infoPaiement", {})
    montant_ttc = float(payment.get("montant", 0))
    montant_ht  = round(montant_ttc / 1.19, 2)
    montant_tva = round(montant_ttc - montant_ht, 2)
    pay_status  = payment.get("status", "A_PAYER")
    pay_method  = payment.get("methode", "CASH")
    transaction = payment.get("transactionId", "—")
    paid_at     = payment.get("paidAt")
    paid_str    = paid_at.strftime("%d/%m/%Y %H:%M") if isinstance(paid_at, datetime) else "—"

    status_color = colors.HexColor("#16A34A") if pay_status == "PAYE" else colors.HexColor("#DC2626")
    status_label = "PAYÉ" if pay_status == "PAYE" else ("ÉCHOUÉ" if pay_status == "ECHOUE" else "EN ATTENTE")

    elements = []

    # ── Header ──────────────────────────────────────
    header_data = [[
        Paragraph("<b>TransportDZ</b>", title_style),
        Paragraph(
            f"<b>FACTURE</b><br/>{invoice_no}<br/>{date_str}",
            ParagraphStyle("inv", fontSize=10, alignment=TA_RIGHT,
                           textColor=dark, fontName="Helvetica-Bold")
        )
    ]]
    header_table = Table(header_data, colWidths=[90*mm, 80*mm])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
    ]))
    elements.append(header_table)
    elements.append(Paragraph("Plateforme de logistique de fret — Algérie", sub_style))
    elements.append(Spacer(1, 6*mm))

    # ── Status badge ────────────────────────────────
    badge_data = [[Paragraph(f"<b>{status_label}</b>",
        ParagraphStyle("badge", fontSize=10, textColor=colors.white,
                       fontName="Helvetica-Bold", alignment=TA_CENTER))]]
    badge = Table(badge_data, colWidths=[40*mm])
    badge.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), status_color),
        ("ROUNDEDCORNERS", [4]),
        ("TOPPADDING", (0,0), (-1,-1), 4),
        ("BOTTOMPADDING", (0,0), (-1,-1), 4),
    ]))
    elements.append(badge)
    elements.append(Spacer(1, 6*mm))

    # ── Client / Driver info ─────────────────────────
    info_data = [[
        Paragraph(
            f"<b>CLIENT</b><br/>{client.get('nom','—')}<br/>"
            f"{client.get('telephone','—')}<br/>{client.get('email','—')}",
            normal_style
        ),
        Paragraph(
            f"<b>CHAUFFEUR</b><br/>{driver.get('nom','—')}<br/>"
            f"{driver.get('telephone','—')}",
            normal_style
        )
    ]]
    info_table = Table(info_data, colWidths=[85*mm, 85*mm])
    info_table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), light),
        ("BOX", (0,0), (-1,-1), 0.5, colors.HexColor("#E5E7EB")),
        ("INNERGRID", (0,0), (-1,-1), 0.5, colors.HexColor("#E5E7EB")),
        ("TOPPADDING", (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 6*mm))

    # ── Load details ─────────────────────────────────
    elements.append(Paragraph("Détails de la charge", section_style))
    load_data = [
        ["Champ", "Valeur"],
        ["Type de marchandise", load.get("typeMarchandises", "—")],
        ["Poids", f"{load.get('poidsKg', 0)} kg"],
        ["Adresse d'enlèvement", load.get("adressEnlev", "—")],
        ["Adresse de livraison", load.get("adressLivr", "—")],
        ["Date de création", date_str],
        ["Date de livraison", fin_str],
        ["Référence trajet", trip_id[-12:].upper()],
    ]
    if load.get("description"):
        load_data.append(["Description", load["description"]])

    load_table = Table(load_data, colWidths=[60*mm, 110*mm])
    load_table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), dark),
        ("TEXTCOLOR", (0,0), (-1,0), colors.white),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 9),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, light]),
        ("BOX", (0,0), (-1,-1), 0.5, colors.HexColor("#E5E7EB")),
        ("INNERGRID", (0,0), (-1,-1), 0.5, colors.HexColor("#E5E7EB")),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
    ]))
    elements.append(load_table)
    elements.append(Spacer(1, 6*mm))

    # ── Financial summary ────────────────────────────
    elements.append(Paragraph("Résumé financier", section_style))
    finance_data = [
        ["Description", "Montant"],
        ["Montant HT", f"{montant_ht:,.2f} DA"],
        ["TVA (19%)", f"{montant_tva:,.2f} DA"],
        ["Total TTC", f"{montant_ttc:,.2f} DA"],
    ]
    finance_table = Table(finance_data, colWidths=[120*mm, 50*mm])
    finance_table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), dark),
        ("TEXTCOLOR", (0,0), (-1,0), colors.white),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 9),
        ("ROWBACKGROUNDS", (0,1), (-1,-2), [colors.white, light]),
        ("BACKGROUND", (0,-1), (-1,-1), orange),
        ("TEXTCOLOR", (0,-1), (-1,-1), colors.white),
        ("FONTNAME", (0,-1), (-1,-1), "Helvetica-Bold"),
        ("FONTSIZE", (0,-1), (-1,-1), 11),
        ("ALIGN", (1,0), (1,-1), "RIGHT"),
        ("BOX", (0,0), (-1,-1), 0.5, colors.HexColor("#E5E7EB")),
        ("INNERGRID", (0,0), (-1,-1), 0.5, colors.HexColor("#E5E7EB")),
        ("TOPPADDING", (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
        ("RIGHTPADDING", (1,0), (1,-1), 8),
    ]))
    elements.append(finance_table)
    elements.append(Spacer(1, 6*mm))

    # ── Payment info ─────────────────────────────────
    elements.append(Paragraph("Informations de paiement", section_style))
    payment_data = [
        ["Champ", "Valeur"],
        ["Méthode", pay_method],
        ["Statut", status_label],
        ["ID Transaction", transaction or "—"],
        ["Date de paiement", paid_str],
    ]
    payment_table = Table(payment_data, colWidths=[60*mm, 110*mm])
    payment_table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), dark),
        ("TEXTCOLOR", (0,0), (-1,0), colors.white),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 9),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, light]),
        ("BOX", (0,0), (-1,-1), 0.5, colors.HexColor("#E5E7EB")),
        ("INNERGRID", (0,0), (-1,-1), 0.5, colors.HexColor("#E5E7EB")),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
    ]))
    elements.append(payment_table)
    elements.append(Spacer(1, 8*mm))

    # ── Footer ───────────────────────────────────────
    footer = Paragraph(
        f"TransportDZ — Plateforme de logistique de fret · Algérie<br/>"
        f"Référence: {invoice_no} · Généré le {datetime.utcnow().strftime('%d/%m/%Y %H:%M')} UTC<br/>"
        f"Ce document tient lieu de facture conformément à la législation algérienne (TVA 19%).",
        ParagraphStyle("footer", fontSize=7, textColor=gray,
                       alignment=TA_CENTER, leading=12)
    )
    elements.append(footer)

    doc.build(elements)
    return buffer.getvalue()