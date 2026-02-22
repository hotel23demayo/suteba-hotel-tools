# 🖥️ Guía de Instalación por Entorno

## 🎯 Resumen rápido

| Entorno | Comando principal | Resultado |
|---------|-------------------|-----------|
| **Ubuntu nativo** | `./instalar-ubuntu-nativo.sh` | ✅ Icono de escritorio + acceso web |
| **WSL / Desarrollo** | `./launcher.sh` | ✅ Servidor web local |
| **Vouchers Alicante (WSL + Ubuntu)** | `./launcher-vouchers-alicante.sh` | ✅ PDF calibrado listo para imprimir |

---

## 🐧 Ubuntu nativo (usuarios finales)

### Primera instalación

```bash
cd /ruta/del/proyecto
./instalar-ubuntu-nativo.sh
```

### Uso diario

1. Doble clic en el icono **SUTEBA Hotel Tools** del escritorio.
2. Se abre el navegador con `http://localhost:8000/index.html`.

---

## 🔧 WSL (desarrollo)

### Aplicación web

```bash
cd /ruta/del/proyecto
./launcher.sh
```

### Flujo oficial de vouchers Alicante (overlay PDF)

```bash
cd /ruta/del/proyecto
./launcher-vouchers-alicante.sh
```

Este launcher usa la calibración final y genera por defecto:
- Entrada: `python/vouchersAlicante/consultaRegimenReport.csv`
- Plantilla: `python/vouchersAlicante/VOUCHER ALICANTE.pdf`
- Salida: `python/vouchersAlicante/Vouchers_Alicante_Calibrado.pdf`

---

## 📦 Transferir proyecto a Ubuntu nativo

```bash
# En Ubuntu nativo
cd /ruta/del/proyecto
./instalar-ubuntu-nativo.sh
```

---

## 🆘 Solución de problemas

### "python3: command not found"

```bash
sudo apt update
sudo apt install python3
```

### "El servidor web no inicia"

```bash
./stop-server.sh
./launcher.sh
```

### "Puerto 8000 en uso"

```bash
lsof -i:8000
./stop-server.sh
```

---

## 📝 Archivos vigentes

| Archivo | Uso |
|---------|-----|
| `launcher.sh` | Inicia servidor web y abre navegador |
| `stop-server.sh` | Detiene el servidor web |
| `instalar-ubuntu-nativo.sh` | Instala acceso de escritorio en Ubuntu nativo |
| `launcher-vouchers-alicante.sh` | Genera vouchers Alicante por overlay PDF |

---

*Guía normalizada al flujo actual (Febrero 2026).* 
