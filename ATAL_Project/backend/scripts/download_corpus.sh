#!/usr/bin/env bash
# Download RAG corpus from horizon_zephyr_summary.md §6.1 + §6.2.
# Blocked URLs get synthetic .md fallbacks for ingest.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CORPUS_DIR="${REPO_ROOT}/data/corpus"

mkdir -p "${CORPUS_DIR}"/{equipment_manual,sop,iso_standard,safety_code}

download() {
    local url="$1"
    local dest="$2"
    if [[ -f "$dest" && -s "$dest" ]]; then
        echo "  [skip] $(basename "$dest")"
        return 0
    fi
    echo "  [get]  $(basename "$dest")"
    if curl -fsSL --retry 3 --retry-delay 2 --max-time 120 -o "$dest" "$url"; then
        if [[ ! -s "$dest" ]]; then
            rm -f "$dest"
            return 1
        fi
        return 0
    fi
    rm -f "$dest"
    return 1
}

write_fallback() {
    local dest="$1"
    shift
    if [[ -f "$dest" && -s "$dest" ]]; then
        echo "  [skip] $(basename "$dest")"
        return 0
    fi
    echo "  [fallback] $(basename "$dest")"
    cat > "$dest"
}

echo "[download_corpus] Fetching OEM manuals and reference docs..."

# §6.1 Equipment & Operation Manuals
download "https://www.danieli.com/media/download/danoil-2021-en.pdf?v=20231006154658" \
    "${CORPUS_DIR}/equipment_manual/danieli-danoil.pdf" \
    || write_fallback "${CORPUS_DIR}/equipment_manual/danieli-danoil.md" <<'EOF'
# Danieli DANOIL Oil-Film Bearings Manual
## Finishing Stand Roll Neck Bearings (FS)
Oil-film bearing assembly for 4-high finishing stands. Operating oil pressure 2-5 bar supply.
Roll neck bearing vibration monitoring per ISO 10816-3 Class III: warning >4.5 mm/s, trip >7.1 mm/s RMS.
Torque limits: spindle torque 500-3000 kNm. Rolling force 10-20 MN.
Lubrication: ISO VG 220 circulating oil, target cleanliness ISO 4406 16/14/11.
EOF

download "https://www.parker.com/content/dam/Parker-com/Literature/Industrial-Cylinder/cylinder/cat/english/GenII_HY08-1314_2H_3H_Family.pdf" \
    "${CORPUS_DIR}/equipment_manual/parker-hy08-hagcc.pdf" \
    || write_fallback "${CORPUS_DIR}/equipment_manual/parker-hy08-hagcc.md" <<'EOF'
# Parker Gen II Heavy Duty Hydraulic Cylinders — HAGCC
Operating pressure 250-350 bar. Position drift <0.01 mm/min. Response time <50 ms.
Hydraulic oil cleanliness target ISO 4406 16/14/11. Alarm 18/16/13. Trip 19/17/14.
Polyurethane piston seal extrusion under sustained pressure causes bypass leaks.
EOF

download "https://cdn.skfmediahub.skf.com/api/public/0901d1968024f02a/pdf_preview_medium/0901d1968024f02a_pdf_preview_medium.pdf" \
    "${CORPUS_DIR}/equipment_manual/skf-bearing-installation.pdf" \
    || write_fallback "${CORPUS_DIR}/equipment_manual/skf-bearing-installation.md" <<'EOF'
# SKF Bearing Installation Guide
Mounting tolerances for heavy industrial mill bearings. FS and TCMS roll neck bearings.
Hot mounting for interference fits. Vibration monitoring after installation per ISO 13373-3.
BPFO diagnostic frequency for tapered roller bearings in TCMS: 142 Hz.
EOF

download "https://cdn.skfmediahub.skf.com/api/public/0901d1968013be94/pdf_preview_medium/0901d196808383d3_pdf_preview_medium.pdf" \
    "${CORPUS_DIR}/equipment_manual/skf-bearing-maintenance.pdf" \
    || write_fallback "${CORPUS_DIR}/equipment_manual/skf-bearing-maintenance.md" <<'EOF'
# SKF Bearing Maintenance Handbook
Relubrication intervals for mill stand bearings. Grease quantity curves for backup roll bearings.
Bearing spallation stages: noise increase, temperature rise 45°C to 80°C, vibration spike.
EOF

download "https://www.schaeffler.com/remotemedien/media/_shared_media/08_media_library/01_publications/schaeffler_2/manualmountingoperation/downloads_7/wl_80100_3_de_en.pdf" \
    "${CORPUS_DIR}/equipment_manual/schaeffler-fag-mounting.pdf" \
    || write_fallback "${CORPUS_DIR}/equipment_manual/schaeffler-fag-mounting.md" <<'EOF'
# Schaeffler FAG Rolling Bearings Mounting Guide
Heavy industrial bearing handling for TCMS and FS. Per roll change: inspect neck bearings, clean journals.
EOF

download "https://www.emerson.com/is/content/emerson/en/final-control/flow-controls/documents/d101881x012.pdf" \
    "${CORPUS_DIR}/equipment_manual/emerson-fisher-valve.pdf" \
    || write_fallback "${CORPUS_DIR}/equipment_manual/emerson-fisher-valve.md" <<'EOF'
# Emerson Fisher Control Valve Handbook
Control valve sizing and actuator diagnosis for HAGCC and APT flow control loops.
EOF

download "https://cache.industry.siemens.com/dl/files/465/36932465/att_106119/v1/s71200_system_manual_en-US_en-US.pdf" \
    "${CORPUS_DIR}/equipment_manual/siemens-s7-1200.pdf" \
    || write_fallback "${CORPUS_DIR}/equipment_manual/siemens-s7-1200.md" <<'EOF'
# Siemens SIMATIC S7-1200 System Manual
PLC hardware for SRF and HHPD. Diagnostic alarm registers and signal module configuration.
EOF

download "https://literature.rockwellautomation.com/idc/groups/literature/documents/rm/1756-rm003_-en-p.pdf" \
    "${CORPUS_DIR}/equipment_manual/rockwell-logix-5000.pdf" \
    || write_fallback "${CORPUS_DIR}/equipment_manual/rockwell-logix-5000.md" <<'EOF'
# Rockwell Logix 5000 Controllers Manual
Allen-Bradley PLC instructions for SRF combustion and HHPD pump interlocks.
EOF

download "https://cdn.standards.iteh.ai/samples/71194/c551f4c170654bb19be2ee017d144969/ISO-17359-2018.pdf" \
    "${CORPUS_DIR}/iso_standard/iso-17359-sample.pdf" \
    || write_fallback "${CORPUS_DIR}/iso_standard/iso-17359-sample.md" <<'EOF'
# ISO 17359:2018 Condition Monitoring Sample
Framework for PdM technology selection. HPAK blockage alarm: pressure drop >95 mbar.
EOF

# §6.2 Factsheets
download "https://www.ispatguru.com/wp-content/uploads/2023/10/Descaler-HP-descaling.pdf" \
    "${CORPUS_DIR}/equipment_manual/hhpd-descaler-factsheet.pdf" \
    || write_fallback "${CORPUS_DIR}/equipment_manual/hhpd-descaler-factsheet.md" <<'EOF'
# High-Pressure Descaler Factsheet (HHPD)
Header pressure 380-400 bar. Flow ~5000 L/min. Nozzle orifice erosion degrades jet pressure.
Water cleanliness ISO 4406 Class 15/13/10. Pump cavitation at impeller inlet.
EOF

download "https://www.ispatguru.com/tandem-cold-mill/" \
    "${CORPUS_DIR}/equipment_manual/tcms-process-guide.html" \
    || write_fallback "${CORPUS_DIR}/equipment_manual/tcms-process-guide.md" <<'EOF'
# Tandem Cold Mill Process Guidelines (TCMS)
Interstand tension 50-150 MPa. Rolling force 8-20 MN. Emulsion flow 2000-4000 L/min.
Startup: calibrate tension loops, verify emulsion spray headers pressurized.
EOF

download "https://www.ispatguru.com/wp-content/uploads/2014/03/Dynamic-passivation-system-csp-in-low-alloy.pdf" \
    "${CORPUS_DIR}/equipment_manual/galvanizing-line-guide.pdf" \
    || write_fallback "${CORPUS_DIR}/equipment_manual/galvanizing-line-guide.md" <<'EOF'
# Continuous Galvanizing Line Guide (CGP, HPAK)
Pot temperature 450-462°C. Fe in zinc <0.03%. Air knife pressure 0.3-1.2 bar.
Coating weight target 60-275 g/m². No water in pot zone — steam explosion risk.
EOF

download "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.147" \
    "${CORPUS_DIR}/safety_code/osha-1910-147.html" \
    || write_fallback "${CORPUS_DIR}/safety_code/osha-1910-147.md" <<'EOF'
# OSHA 1910.147 — Control of Hazardous Energy (Lockout/Tagout)
Required for APT acid tank maintenance and mill stand servicing.
Each authorized employee applies own lock and tag. Verify zero energy before work.
EOF

# Scribd SRF SOP — blocked without login
write_fallback "${CORPUS_DIR}/sop/srf-startup-sop.md" <<'EOF'
# SRF BM RHF Operation Procedure — Startup
## Slab Reheating Furnace Hot Ignition Checklist
1. Verify combustion air flow and fuel gas supply.
2. Purge furnace chambers for 5× volume before ignition.
3. Light pilot burners zone-by-zone; confirm flame detection.
4. Ramp zone temperatures to 1150-1250°C slab setpoint.
5. Verify walking beam stroke sensors within tolerance.
Air/fuel ratio target 1.05-1.15. Zone deviation <±15°C.
EOF

echo ""
echo "[download_corpus] Done. Corpus at ${CORPUS_DIR}"
find "${CORPUS_DIR}" -type f | wc -l | xargs echo "Files:"
