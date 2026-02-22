#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GENERATOR="$SCRIPT_DIR/python/vouchersAlicante/generar_vouchers_overlay.py"

if [[ ! -f "$GENERATOR" ]]; then
  echo "❌ No se encontró el generador: $GENERATOR"
  exit 1
fi

if [[ -x "$SCRIPT_DIR/.venv/bin/python" ]]; then
  PYTHON_CMD=("$SCRIPT_DIR/.venv/bin/python")
else
  PYTHON_CMD=(python3)
fi

CSV_PATH="consultaRegimenReport.csv"
TEMPLATE_PATH="VOUCHER ALICANTE.pdf"
OUTPUT_PATH="Vouchers_Alicante_Calibrado.pdf"
EXTRA_ARGS=()

usage() {
  cat <<'EOF'
Uso:
  ./launcher-vouchers-alicante.sh [opciones]

Opciones:
  --csv <ruta>         CSV de entrada (default: consultaRegimenReport.csv)
  --template <ruta>    Plantilla PDF (default: VOUCHER ALICANTE.pdf)
  --output <archivo>   Nombre del PDF de salida (default: Vouchers_Alicante_Calibrado.pdf)
  --with-logo          Activa logo overlay (por defecto: sin logo)
  --help               Muestra esta ayuda

Notas:
- Este launcher usa posiciones calibradas fijas para Alicante.
- Funciona desde la raíz del repo en WSL o Ubuntu nativo.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --csv)
      CSV_PATH="$2"
      shift 2
      ;;
    --template)
      TEMPLATE_PATH="$2"
      shift 2
      ;;
    --output)
      OUTPUT_PATH="$2"
      shift 2
      ;;
    --with-logo)
      EXTRA_ARGS+=("--with-logo")
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "❌ Opción no reconocida: $1"
      echo ""
      usage
      exit 1
      ;;
  esac
done

cd "$SCRIPT_DIR"

echo "🚀 Generando vouchers Alicante..."
echo "🐍 Python: ${PYTHON_CMD[*]}"
echo "📄 CSV: $CSV_PATH"
echo "📋 Plantilla: $TEMPLATE_PATH"
echo "🧾 Salida: $OUTPUT_PATH"

"${PYTHON_CMD[@]}" "$GENERATOR" \
  --csv "$CSV_PATH" \
  --template-pdf "$TEMPLATE_PATH" \
  --output "$OUTPUT_PATH" \
  --slot-1-y-adjust-mm 4.0 \
  --slot-2-y-adjust-mm 5.5 \
  --slot-3-y-adjust-mm 6.0 \
  --no-logo \
  "${EXTRA_ARGS[@]}"

echo "✅ Proceso finalizado"
