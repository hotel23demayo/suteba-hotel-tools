#!/bin/bash
# Ejemplos de uso del generador de vouchers Alicante con ajustes granulares

# BÁSICO: Sin ajustes (línea base)
python3 python/vouchersAlicante/generar_vouchers_overlay.py

# EJEMPLO 1: Ajustar solo el voucher #1 (2 mm hacia arriba)
python3 python/vouchersAlicante/generar_vouchers_overlay.py \
  --csv consultaRegimenReport.csv \
  --template-pdf "VOUCHER ALICANTE.pdf" \
  --output Vouchers_Slot1_Arriba.pdf \
  --slot-1-y-adjust-mm 2

# EJEMPLO 2: Ajustar voucher #1 y #3 (compensar inconsistencias)
python3 python/vouchersAlicante/generar_vouchers_overlay.py \
  --csv consultaRegimenReport.csv \
  --template-pdf "VOUCHER ALICANTE.pdf" \
  --output Vouchers_Calibrado.pdf \
  --slot-1-y-adjust-mm 1.5 \
  --slot-3-y-adjust-mm -0.5

# EJEMPLO 3: Combinando ajuste global con granular
# (todos bajan 1mm, pero el #1 solo baja 0.5mm)
python3 python/vouchersAlicante/generar_vouchers_overlay.py \
  --csv consultaRegimenReport.csv \
  --template-pdf "VOUCHER ALICANTE.pdf" \
  --output Vouchers_Global_Granular.pdf \
  --y-adjust-mm -1.0 \
  --slot-1-y-adjust-mm -0.5

# EJEMPLO 4: Con ajuste horizontal + granular vertical
python3 python/vouchersAlicante/generar_vouchers_overlay.py \
  --csv consultaRegimenReport.csv \
  --template-pdf "VOUCHER ALICANTE.pdf" \
  --output Vouchers_Fine_Tuned.pdf \
  --x-adjust-mm 0.5 \
  --slot-1-y-adjust-mm 2.0

# EJEMPLO 5: Sin logo (más ligero)
python3 python/vouchersAlicante/generar_vouchers_overlay.py \
  --csv consultaRegimenReport.csv \
  --template-pdf "VOUCHER ALICANTE.pdf" \
  --output Vouchers_SinLogo.pdf \
  --no-logo

# EJEMPLO 6: Todo ajustado para producción
python3 python/vouchersAlicante/generar_vouchers_overlay.py \
  --csv consultaRegimenReport.csv \
  --template-pdf "VOUCHER ALICANTE.pdf" \
  --output Vouchers_Alicante_Final.pdf \
  --slot-1-y-adjust-mm 2.0 \
  --logo assets/suteba_logo_3.jpg

# ============================================
# ALIAS RECOMENDADO (agregar a .bashrc / .zshrc)
# ============================================
# alias gen-vouchers-ok='python3 python/vouchersAlicante/generar_vouchers_overlay.py --slot-1-y-adjust-mm 2.0'
# Luego usar:
#   gen-vouchers-ok --csv consultaRegimenReport.csv --template-pdf "VOUCHER ALICANTE.pdf"

