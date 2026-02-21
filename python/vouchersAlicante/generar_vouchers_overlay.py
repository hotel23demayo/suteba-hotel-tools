#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import io
import os
from collections import defaultdict
from copy import deepcopy
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List

from pypdf import PdfReader, PdfWriter
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas


@dataclass
class VoucherRecord:
    voucher: str
    passenger: str
    document: str
    hotel: str
    room: str
    from_date: str
    to_date: str
    pax: int


def normalize(value: str | None) -> str:
    return (value or "").strip()


def parse_int(value: str | None, default: int = 0) -> int:
    try:
        return int((value or "").strip())
    except Exception:
        return default


def load_csv_rows(csv_path: str) -> List[Dict[str, str]]:
    with open(csv_path, mode="r", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        rows = [row for row in reader if normalize(row.get("Voucher"))]
    return rows


def select_holder(rows: List[Dict[str, str]]) -> Dict[str, str]:
    with_age = sorted(rows, key=lambda row: parse_int(row.get("Edad"), -1), reverse=True)
    return with_age[0] if with_age else rows[0]


def group_by_voucher(rows: Iterable[Dict[str, str]]) -> List[VoucherRecord]:
    groups: Dict[str, List[Dict[str, str]]] = defaultdict(list)
    for row in rows:
        groups[normalize(row.get("Voucher"))].append(row)

    records: List[VoucherRecord] = []
    for voucher, group_rows in groups.items():
        holder = select_holder(group_rows)
        rooms = sorted({normalize(r.get("Nro. habitación")) for r in group_rows if normalize(r.get("Nro. habitación"))})

        tipo_doc = normalize(holder.get("Tipo documento")) or "DNI"
        nro_doc = normalize(holder.get("Nro. doc."))

        records.append(
            VoucherRecord(
                voucher=voucher,
                passenger=normalize(holder.get("Apellido y nombre")),
                document=f"{tipo_doc} {nro_doc}".strip(),
                hotel=normalize(holder.get("Descripción")),
                room=", ".join(rooms),
                from_date=normalize(holder.get("Fecha de ingreso")),
                to_date=normalize(holder.get("Fecha de egreso")),
                pax=len(group_rows),
            )
        )

    records.sort(key=lambda item: item.voucher)
    return records


def chunk_records(records: List[VoucherRecord], chunk_size: int = 3) -> Iterable[List[VoucherRecord]]:
    for index in range(0, len(records), chunk_size):
        yield records[index : index + chunk_size]


def resolve_default_logo_path() -> str:
    script_dir = Path(__file__).resolve().parent
    repo_root = script_dir.parent.parent
    candidate = repo_root / "assets" / "suteba_logo_3.jpg"
    return str(candidate)


def overlay_page_for_chunk(
    chunk: List[VoucherRecord],
    x_adjust_mm: float,
    y_adjust_mm: float,
    logo_path: str | None,
    disable_logo: bool,
    slot_y_adjusts: list[float] | None = None,
) -> io.BytesIO:
    packet = io.BytesIO()
    c = canvas.Canvas(packet, pagesize=A4)
    _, page_height = A4

    slot_top_ys = [255 * mm, 165 * mm, 75 * mm]
    x_base = 24 * mm + (x_adjust_mm * mm)
    y_adjust = y_adjust_mm * mm
    
    # Si hay ajustes por slot, usarlos; sino usar el ajuste global
    if slot_y_adjusts is None:
        slot_y_adjusts = [y_adjust, y_adjust, y_adjust]
    else:
        # Convertir a mm
        slot_y_adjusts = [adj * mm for adj in slot_y_adjusts]

    for slot_index, record in enumerate(chunk):
        # Aplicar ajuste específico del slot si está disponible
        y_top = slot_top_ys[slot_index] + slot_y_adjusts[slot_index]

        if not disable_logo and logo_path and os.path.exists(logo_path):
            c.drawImage(
                logo_path,
                x_base + 140 * mm,
                y_top + 12 * mm,
                width=26 * mm,
                height=11 * mm,
                preserveAspectRatio=True,
                mask="auto",
            )

        c.setFont("Helvetica-Bold", 10)
        c.drawString(x_base + 0 * mm, y_top + -1 * mm, f"{record.passenger}")

        c.setFont("Helvetica", 9)
        c.drawString(x_base -5 * mm, y_top - 12 * mm, f"{record.document}")

        c.drawString(x_base, y_top - 25 * mm, f"{record.room}")
        c.drawString(x_base + 70 * mm, y_top - 25 * mm, f"{record.from_date}")
        c.drawString(x_base + 120 * mm, y_top - 25 * mm, f"{record.to_date}")

        c.drawString(x_base + 28 * mm, y_top - 32 * mm, f"{record.pax}")

    c.save()
    packet.seek(0)
    return packet


def generate_pdf(
    template_pdf_path: str,
    output_pdf_path: str,
    records: List[VoucherRecord],
    x_adjust_mm: float,
    y_adjust_mm: float,
    logo_path: str | None,
    disable_logo: bool,
    slot_1_y_adjust_mm: float | None = None,
    slot_2_y_adjust_mm: float | None = None,
    slot_3_y_adjust_mm: float | None = None,
) -> None:
    if not os.path.exists(template_pdf_path):
        raise FileNotFoundError(
            f"No se encontró la plantilla PDF '{template_pdf_path}'. Exportá primero 'VOUCHER ALICANTE.odt' a PDF."
        )

    template_reader = PdfReader(template_pdf_path)
    if not template_reader.pages:
        raise ValueError("La plantilla PDF no tiene páginas")

    template_page = template_reader.pages[0]
    writer = PdfWriter()

    # Construir lista de ajustes por slot si se proporcionan
    slot_y_adjusts = None
    if any(adj is not None for adj in [slot_1_y_adjust_mm, slot_2_y_adjust_mm, slot_3_y_adjust_mm]):
        slot_y_adjusts = [
            slot_1_y_adjust_mm if slot_1_y_adjust_mm is not None else y_adjust_mm,
            slot_2_y_adjust_mm if slot_2_y_adjust_mm is not None else y_adjust_mm,
            slot_3_y_adjust_mm if slot_3_y_adjust_mm is not None else y_adjust_mm,
        ]

    for chunk in chunk_records(records, 3):
        overlay_packet = overlay_page_for_chunk(
            chunk, x_adjust_mm, y_adjust_mm, logo_path, disable_logo, slot_y_adjusts
        )
        overlay_reader = PdfReader(overlay_packet)

        page = deepcopy(template_page)
        page.merge_page(overlay_reader.pages[0])
        writer.add_page(page)

    with open(output_pdf_path, "wb") as target:
        writer.write(target)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Genera vouchers Alicante por overlay sobre plantilla PDF")
    parser.add_argument(
        "--csv",
        default="consultaRegimenReport.csv",
        help="Ruta al CSV de reservas (default: consultaRegimenReport.csv)",
    )
    parser.add_argument(
        "--template-pdf",
        default="VOUCHER ALICANTE.pdf",
        help="Plantilla PDF exportada desde VOUCHER ALICANTE.odt",
    )
    parser.add_argument(
        "--output",
        default="Vouchers_Alicante_Final.pdf",
        help="Archivo PDF de salida",
    )
    parser.add_argument(
        "--x-adjust-mm",
        type=float,
        default=0.0,
        help="Ajuste horizontal en mm para calibrar posiciones",
    )
    parser.add_argument(
        "--y-adjust-mm",
        type=float,
        default=0.0,
        help="Ajuste vertical en mm para calibrar posiciones (global para los 3 slots)",
    )
    parser.add_argument(
        "--slot-1-y-adjust-mm",
        type=float,
        default=None,
        help="Ajuste vertical en mm solo para el voucher #1 (anula --y-adjust-mm para este slot)",
    )
    parser.add_argument(
        "--slot-2-y-adjust-mm",
        type=float,
        default=None,
        help="Ajuste vertical en mm solo para el voucher #2 (anula --y-adjust-mm para este slot)",
    )
    parser.add_argument(
        "--slot-3-y-adjust-mm",
        type=float,
        default=None,
        help="Ajuste vertical en mm solo para el voucher #3 (anula --y-adjust-mm para este slot)",
    )
    parser.add_argument(
        "--logo",
        default=resolve_default_logo_path(),
        help="Ruta al logo que se inserta en cada voucher (default: assets/suteba_logo_3.jpg)",
    )
    parser.add_argument(
        "--no-logo",
        action="store_true",
        help="Desactiva la inserción del logo en el overlay",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    rows = load_csv_rows(args.csv)
    records = group_by_voucher(rows)

    if not records:
        raise ValueError("No se encontraron vouchers en el CSV")

    generate_pdf(
        template_pdf_path=args.template_pdf,
        output_pdf_path=args.output,
        records=records,
        x_adjust_mm=args.x_adjust_mm,
        y_adjust_mm=args.y_adjust_mm,
        logo_path=args.logo,
        disable_logo=args.no_logo,
        slot_1_y_adjust_mm=args.slot_1_y_adjust_mm,
        slot_2_y_adjust_mm=args.slot_2_y_adjust_mm,
        slot_3_y_adjust_mm=args.slot_3_y_adjust_mm,
    )

    print(f"✅ Vouchers generados: {args.output}")
    print(f"   Total de vouchers: {len(records)}")


if __name__ == "__main__":
    main()
