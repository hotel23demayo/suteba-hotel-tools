#!/bin/bash
# Ejemplos de uso del generador de vouchers Alicante con ajustes granulares

# ============================================
# LANZADOR OFICIAL (WSL + Ubuntu nativo)
# ============================================
# Usa posiciones calibradas fijas y genera sin logo por defecto.
./launcher-vouchers-alicante.sh

# Opcional: personalizar salida
./launcher-vouchers-alicante.sh --output Vouchers_Alicante_Calibrado.pdf

# Opcional: activar logo overlay explícitamente
./launcher-vouchers-alicante.sh --with-logo

# ============================================
# EJECUCIÓN DIRECTA DEL SCRIPT (alternativa)
# ============================================
# Usa calibración final y deja logo desactivado por defecto.
python3 python/vouchersAlicante/generar_vouchers_overlay.py \
  --csv consultaRegimenReport.csv \
  --template-pdf "VOUCHER ALICANTE.pdf" \
  --output Vouchers_Alicante_Calibrado.pdf \
  --slot-1-y-adjust-mm 4.0 \
  --slot-2-y-adjust-mm 5.5 \
  --slot-3-y-adjust-mm 6.0

# EJEMPLO 1: Misma calibración, salida personalizada
python3 python/vouchersAlicante/generar_vouchers_overlay.py \
  --csv consultaRegimenReport.csv \
  --template-pdf "VOUCHER ALICANTE.pdf" \
  --output Vouchers_Alicante_$(date +%Y%m%d).pdf \
  --slot-1-y-adjust-mm 4.0 \
  --slot-2-y-adjust-mm 5.5 \
  --slot-3-y-adjust-mm 6.0

# EJEMPLO 2: Activar logo explícitamente
python3 python/vouchersAlicante/generar_vouchers_overlay.py \
  --csv consultaRegimenReport.csv \
  --template-pdf "VOUCHER ALICANTE.pdf" \
  --output Vouchers_Alicante_ConLogo.pdf \
  --slot-1-y-adjust-mm 4.0 \
  --slot-2-y-adjust-mm 5.5 \
  --slot-3-y-adjust-mm 6.0 \
  --with-logo

# EJEMPLO 3: Probar otro CSV manteniendo la calibración
python3 python/vouchersAlicante/generar_vouchers_overlay.py \
  --csv otro_consultaRegimenReport.csv \
  --template-pdf "VOUCHER ALICANTE.pdf" \
  --output Vouchers_Alicante_OtroCSV.pdf \
  --slot-1-y-adjust-mm 4.0 \
  --slot-2-y-adjust-mm 5.5 \
  --slot-3-y-adjust-mm 6.0

# ============================================
# ALIAS RECOMENDADO (agregar a .bashrc / .zshrc)
# ============================================
# alias gen-vouchers-ok='./launcher-vouchers-alicante.sh'
# Luego usar:
#   gen-vouchers-ok
#   gen-vouchers-ok --output Vouchers_Alicante_Calibrado.pdf

