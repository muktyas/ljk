import cv2
import numpy as np
import cv2.aruco as aruco
import os
import csv
import json
import base64
import sys

def get_aruco_detector():
    dict4 = aruco.getPredefinedDictionary(aruco.DICT_4X4_100)
    return dict4

def get_aruco_detector_params():
    if hasattr(aruco, 'DetectorParameters_create'):
        p = aruco.DetectorParameters_create()
    else:
        p = aruco.DetectorParameters()
    if hasattr(aruco, 'CORNER_REFINE_SUBPIX'):
        p.cornerRefinementMethod = aruco.CORNER_REFINE_SUBPIX
    elif hasattr(p, 'cornerRefinementMethod'):
        p.cornerRefinementMethod = 1
    return p

def detect_aruco(gb):
    dict4 = get_aruco_detector()
    params = get_aruco_detector_params()
    
    # 1. Primary detection
    try:
        pojoks, ids, _ = aruco.detectMarkers(gb, dict4, parameters=params)
    except Exception:
        pojoks, ids, _ = aruco.detectMarkers(gb, dict4)
        
    ids_flat = ids.flatten().tolist() if ids is not None else []
    
    # 2. CLAHE contrast enhancement fallback if 4 corners are not all found
    if not all(i in ids_flat for i in range(4)):
        try:
            gray = cv2.cvtColor(gb, cv2.COLOR_BGR2GRAY) if len(gb.shape) == 3 else gb
            clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
            enhanced = clahe.apply(gray)
            try:
                p2, i2, _ = aruco.detectMarkers(enhanced, dict4, parameters=params)
            except Exception:
                p2, i2, _ = aruco.detectMarkers(enhanced, dict4)
            if i2 is not None:
                i2_flat = i2.flatten().tolist()
                if len(i2_flat) > len(ids_flat) or all(i in i2_flat for i in range(4)):
                    pojoks, ids, ids_flat = p2, i2, i2_flat
        except Exception:
            pass
        
    if ids is None or len(ids_flat) == 0:
        return None, None, []
        
    # ALWAYS draw detected markers on gb so gb_bagus highlights all found markers
    try:
        aruco.drawDetectedMarkers(gb, pojoks, ids)
    except Exception:
        pass
    
    # Check for corner markers 0, 1, 2, 3
    if not all(i in ids_flat for i in range(4)):
        return None, None, ids_flat
    
    # Check question code marker: if > 10, then detected as question code
    kode_soal_candidates = [i for i in ids_flat if i > 10]
    if not kode_soal_candidates:
        # Fallback to id >= 4 if none > 10
        kode_soal_candidates = [i for i in ids_flat if i >= 4]
        
    kode_soal = kode_soal_candidates[0] if kode_soal_candidates else None
    
    marker = {}
    for c, id_ in zip(pojoks, ids_flat):
        marker[id_] = c[0]
        
    tl = marker[0][0].astype(int)
    tr = marker[1][1].astype(int)
    br = marker[2][2].astype(int)
    bl = marker[3][3].astype(int)
    titik = np.float32([tl, tr, bl, br])
    
    # Draw yellow lines connecting the corners
    cv2.line(gb, tuple(tl), tuple(tr), (0, 255, 255), 3)
    cv2.line(gb, tuple(tr), tuple(br), (0, 255, 255), 3)
    cv2.line(gb, tuple(br), tuple(bl), (0, 255, 255), 3)
    cv2.line(gb, tuple(bl), tuple(tl), (0, 255, 255), 3)
    
    return kode_soal, titik, ids_flat

def tegakkan(gb, titik_asal, w=1500, h=1560):
    y_pad = 250
    tujuan = np.float32([
        [0, y_pad], [w, y_pad],
        [0, h], [w, h]
    ])
    M = cv2.getPerspectiveTransform(titik_asal, tujuan)
    hasil = cv2.warpPerspective(gb, M, (w, h))
    return hasil

def deteksi_kode_peserta(gb):
    digits = np.hsplit(gb, 3)
    kode_angka = []
    kode_bersih = ''
    for digit in digits:
        angka = np.vsplit(digit, 10)
        kode_angka.append([cv2.countNonZero(a) for a in angka])
    kode_angka = np.array(kode_angka)
    for kode in kode_angka:
        dipilih = ''
        x = max(kode)
        if x > 30:
            for i in range(10):
                if kode[i] == x:
                    dipilih += str(i)
        else:
            dipilih = '?'
        kode_bersih += dipilih
    return kode_bersih

def baca_csv(filepath):
    db = {}
    if not os.path.exists(filepath):
        return db
    with open(filepath, 'r', newline='', encoding='utf8') as f:
        reader = csv.DictReader(f)
        for baris in reader:
            try:
                nilai = int(baris.get('nilai', '0').strip())
            except (ValueError, TypeError):
                nilai = 0
            db[baris.get('kode', '').strip()] = [
                baris.get('nama', '').strip(),
                baris.get('kelas', '').strip(),
                nilai
            ]
    return db

def tulis_csv(db, filepath):
    with open(filepath, 'w', newline='', encoding='utf8') as f:
        writer = csv.writer(f)
        writer.writerow(['kode', 'nama', 'kelas', 'nilai'])
        for key, values in sorted(db.items()):
            writer.writerow([key] + values)

def baca_kunci(filepath):
    data_kunci = {}
    if not os.path.exists(filepath):
        return data_kunci
    with open(filepath, 'r', encoding='utf8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if ':' in line:
                key_str, arr_str = line.split(":", 1)
                try:
                    key = int(key_str.strip())
                except ValueError:
                    key = key_str.strip()
                arr_str = arr_str.replace(", ]", "]").strip()
                try:
                    arr = eval(arr_str)
                    data_kunci[key] = arr
                except Exception:
                    pass
    return data_kunci

def process_exam_sheet(image_path_or_bytes, csv_path='kode_peserta.csv', key_path='kunci_kode.txt', batas=300):
    if isinstance(image_path_or_bytes, (bytes, bytearray)):
        nparr = np.frombuffer(image_path_or_bytes, np.uint8)
        gb = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    else:
        gb = cv2.imread(image_path_or_bytes)
        
    if gb is None:
        return {"success": False, "error": "Gagal membaca berkas gambar."}
            
    gb_bagus = gb.copy()
    gb_lagi = gb_bagus.copy()
    gb_output = gb_bagus.copy()
    
    gb_gray = cv2.cvtColor(gb_bagus, cv2.COLOR_BGR2GRAY)
    kode_soal, titik, ids_found = detect_aruco(gb=gb_lagi)
    
    # 1st display: gb_bagus (with ArUco markers detection & yellow border)
    _, bagus_buf = cv2.imencode('.jpg', gb_lagi, [cv2.IMWRITE_JPEG_QUALITY, 85])
    bagus_b64 = base64.b64encode(bagus_buf).decode('utf-8')
    
    if titik is None:
        missing = [i for i in range(4) if i not in ids_found]
        msg = f"Marker pojok belum lengkap terdeteksi. ID yang ditemukan: {ids_found}. Diperlukan marker 0, 1, 2, 3"
        if kode_soal is None and len(ids_found) >= 4:
            msg += " dan kode soal (ID > 10)."
            
        # Generate visual diagnostic gb_output so user always has both gb_bagus and gb_output
        diag = gb_lagi.copy()
        dh, dw = diag.shape[:2]
        overlay = diag.copy()
        banner_h = min(170, max(120, dh // 4))
        cv2.rectangle(overlay, (0, 0), (dw, banner_h), (25, 25, 35), -1)
        cv2.addWeighted(overlay, 0.82, diag, 0.18, 0, diag)
        
        cv2.putText(diag, "STATUS PEMINDAIAN: POSISIKAN 4 MARKER POJOK", (20, 42), cv2.FONT_HERSHEY_DUPLEX, 0.85, (0, 220, 255), 2)
        corner_desc = {0: "0(Kiri-Atas)", 1: "1(Kanan-Atas)", 2: "2(Kanan-Bawah)", 3: "3(Kiri-Bawah)"}
        found_str = ", ".join([corner_desc.get(c, f"ID-{c}") for c in ids_found]) if ids_found else "Belum terdeteksi"
        miss_str = ", ".join([corner_desc.get(m, f"ID-{m}") for m in missing]) if missing else "-"
        cv2.putText(diag, f"Terdeteksi  : {found_str}", (20, 82), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (70, 250, 70), 2)
        cv2.putText(diag, f"Belum tampak: {miss_str}", (20, 122), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (60, 60, 255), 2)
        
        _, diag_buf = cv2.imencode('.jpg', diag, [cv2.IMWRITE_JPEG_QUALITY, 85])
        diag_b64 = base64.b64encode(diag_buf).decode('utf-8')
        
        return {
            "success": False,
            "error": msg,
            "gb_bagus": bagus_b64,
            "gb_output": diag_b64,
            "ids_found": ids_found,
            "missing_corners": missing
        }
        
    # Dimensions
    w = 19
    h = 20
    margin = 3
    sel = 60
    w += 2 * margin # 25 * 60 = 1500
    h += 2 * margin # 26 * 60 = 1560
    w = w * sel
    h = h * sel
    
    gb_tegak = tegakkan(gb_gray, titik, w, h)
    gb_output = tegakkan(gb_output, titik, w, h)
    
    roi = gb_tegak[sel * 7 : h - sel * 3, sel * 3 : w - sel * 3]
    kol1 = roi[sel * 0 :, sel * 1 + sel // 2 : 6 * sel]
    kol2 = roi[sel * 0 :, sel * 9 : 13 * sel + sel // 2]
    gb1kolom = np.vstack((kol1, kol2))
    
    gb_kode_peserta = roi[sel * 1 + sel // 2 : 9 * sel + sel // 2, sel * 16 : 18 * sel + sel // 2]
    
    # Adaptive threshold
    gb1kolom_th = cv2.adaptiveThreshold(gb1kolom, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 151, 50)
    gb_kode_peserta_th = cv2.adaptiveThreshold(gb_kode_peserta, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 151, 50)
    
    kode_peserta = deteksi_kode_peserta(gb_kode_peserta_th)
    
    # Read participant DB
    db_peserta = baca_csv(csv_path)
    if kode_peserta in db_peserta:
        nama_peserta = db_peserta[kode_peserta][0]
        kelas_peserta = db_peserta[kode_peserta][1]
    else:
        nama_peserta = "NAMA TIDAK DITEMUKAN"
        kelas_peserta = "-"
        
    soal_soal = np.vsplit(gb1kolom_th, 40)
    jawaban = []
    coretan = []
    
    for idx, soal in enumerate(soal_soal):
        abc = np.hsplit(soal, 5)
        counts = [int(cv2.countNonZero(a)) for a in abc]
        coretan.append(counts)
        dipilih = ''
        for a in range(5):
            if counts[a] > batas:
                dipilih += 'ABCDE'[a]
        jawaban.append(dipilih if dipilih else '-')
        
    data_kunci = baca_kunci(key_path)
    
    kunci_answers = []
    key_found = False
    
    if kode_soal in data_kunci:
        curr_kunci = data_kunci[kode_soal]
        key_found = True
    elif str(kode_soal) in data_kunci:
        curr_kunci = data_kunci[str(kode_soal)]
        key_found = True
    elif kode_soal is not None and int(kode_soal) in data_kunci:
        curr_kunci = data_kunci[int(kode_soal)]
        key_found = True
    else:
        curr_kunci = []
        
    if key_found:
        for val in curr_kunci:
            if isinstance(val, int) and 0 <= val < 5:
                kunci_answers.append('ABCDE'[val])
            elif isinstance(val, str):
                kunci_answers.append(val.strip().upper())
            else:
                kunci_answers.append('?')
                
    nilai_list = []
    yang_salah = []
    skor = 0
    
    if key_found and kunci_answers:
        for i in range(min(len(kunci_answers), len(jawaban))):
            k = kunci_answers[i]
            j = jawaban[i]
            if k in j:
                nilai_list.append(1)
                skor += 1
            else:
                nilai_list.append(0)
                yang_salah.append(i + 1)
    else:
        yang_salah = []
        
    nilai = str(skor)
    salah_baris1 = yang_salah[:17]
    salah_baris2 = yang_salah[17:]
    
    x_pad = 3 * sel
    y_pad = 6 * sel
    
    # 2nd display: gb_output (warped, with score, student name, and wrong marks)
    # Header student info
    cv2.putText(gb_output, f"KODE: {kode_peserta}", (3 * sel, y_pad - 2 * sel), cv2.FONT_HERSHEY_COMPLEX, 1.0, (0, 180, 0), 2)
    cv2.putText(gb_output, f"NAMA: {nama_peserta} ({kelas_peserta})", (8 * sel, y_pad - 2 * sel), cv2.FONT_HERSHEY_COMPLEX, 1.0, (180, 0, 120), 2)
    
    if key_found:
        if salah_baris1:
            cv2.putText(gb_output, f"SALAH: {salah_baris1}", (3 * sel, y_pad - sel), cv2.FONT_HERSHEY_COMPLEX, 0.85, (0, 0, 220), 2)
        if salah_baris2:
            cv2.putText(gb_output, f"       {salah_baris2}", (3 * sel, y_pad), cv2.FONT_HERSHEY_COMPLEX, 0.85, (0, 0, 220), 2)
        if not yang_salah:
            cv2.putText(gb_output, "SEMPURNA! SEMUA JAWABAN BENAR", (3 * sel, y_pad - sel), cv2.FONT_HERSHEY_COMPLEX, 0.9, (0, 180, 0), 2)
    else:
        cv2.putText(gb_output, f"Kunci Kode Soal {kode_soal} belum terdaftar di {key_path}", (3 * sel, y_pad - sel), cv2.FONT_HERSHEY_COMPLEX, 0.8, (0, 0, 200), 2)
        
    # Big score box in top right
    cv2.rectangle(gb_output, (sel * 15, sel * 1), (sel * 21, sel * 5), (245, 245, 245), -1)
    cv2.rectangle(gb_output, (sel * 15, sel * 1), (sel * 21, sel * 5), (0, 140, 255), 3)
    cv2.putText(gb_output, "NILAI", (sel * 15 + 20, sel * 2), cv2.FONT_HERSHEY_COMPLEX, 0.9, (80, 80, 80), 2)
    cv2.putText(gb_output, str(nilai), (sel * 15 + 30, sel * 4 + 30), cv2.FONT_HERSHEY_COMPLEX, 3.8, (200, 30, 0), 5)
    
    # Mark wrong questions with red cross on bubble columns
    for no in yang_salah:
        if no <= 20:
            x_pos = 6 * sel + 10
            y_pos = sel * 7 + (no - 1) * int((h - sel * 10) / 20) + 30
        else:
            x_pos = 13 * sel + 30
            y_pos = sel * 7 + (no - 21) * int((h - sel * 10) / 20) + 30
        cv2.putText(gb_output, "x", (x_pos, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 0, 240), 2)
        
    _, output_buf = cv2.imencode('.jpg', gb_output, [cv2.IMWRITE_JPEG_QUALITY, 90])
    output_b64 = base64.b64encode(output_buf).decode('utf-8')
    
    # 3rd display: gb_tegak_th (Binary threshold view with live bubble verification & diagnostics)
    gb_tegak_th = cv2.adaptiveThreshold(gb_tegak, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 151, 50)
    gb_tegak_th_vis = cv2.cvtColor(gb_tegak_th, cv2.COLOR_GRAY2BGR)
    
    total_terisi = sum(1 for j in jawaban if j != '-')
    total_ganda = sum(1 for j in jawaban if len(j) > 1 and j != '-')
    total_kosong = sum(1 for j in jawaban if j == '-')
    
    filled_px_list = [c for i, q in enumerate(coretan) for idx, c in enumerate(q) if 'ABCDE'[idx] in jawaban[i]]
    empty_px_list = [c for i, q in enumerate(coretan) for idx, c in enumerate(q) if 'ABCDE'[idx] not in jawaban[i]]
    max_fill_px = max(filled_px_list) if filled_px_list else 0
    min_fill_px = min(filled_px_list) if filled_px_list else 0
    max_empty_px = max(empty_px_list) if empty_px_list else 0
    suggested_batas = int((max_empty_px + min_fill_px) / 2) if (min_fill_px > max_empty_px and min_fill_px > 0) else 350
    
    # Draw bubble inspection grids directly on gb_tegak_th_vis
    x_roi_start = sel * 3
    y_roi_start = sel * 7
    
    for i in range(40):
        if i < 20:
            row_idx = i
            x_base = x_roi_start + sel * 1 + sel // 2
            y_base = y_roi_start + row_idx * 48
        else:
            row_idx = i - 20
            x_base = x_roi_start + sel * 9
            y_base = y_roi_start + row_idx * 48
            
        # Question number label
        cv2.putText(gb_tegak_th_vis, f"{i+1}.", (x_base - 38, y_base + 32), cv2.FONT_HERSHEY_PLAIN, 1.0, (0, 220, 255), 1)
        
        q_counts = coretan[i] if i < len(coretan) else [0]*5
        for opt_idx in range(5):
            bx1 = x_base + opt_idx * 54
            by1 = y_base
            bx2 = bx1 + 54
            by2 = by1 + 48
            c = q_counts[opt_idx]
            
            if c > batas:
                # Green border: recognized as filled pencil mark
                cv2.rectangle(gb_tegak_th_vis, (bx1 + 2, by1 + 2), (bx2 - 2, by2 - 2), (0, 255, 0), 2)
                cv2.putText(gb_tegak_th_vis, 'ABCDE'[opt_idx], (bx1 + 5, by1 + 18), cv2.FONT_HERSHEY_DUPLEX, 0.55, (0, 255, 0), 1)
                cv2.putText(gb_tegak_th_vis, str(c), (bx1 + 4, by2 - 8), cv2.FONT_HERSHEY_PLAIN, 0.9, (0, 255, 120), 1)
            else:
                if c > batas * 0.7:
                    # Amber warning: near threshold
                    cv2.rectangle(gb_tegak_th_vis, (bx1 + 2, by1 + 2), (bx2 - 2, by2 - 2), (0, 165, 255), 1)
                    cv2.putText(gb_tegak_th_vis, str(c), (bx1 + 4, by2 - 8), cv2.FONT_HERSHEY_PLAIN, 0.8, (0, 165, 255), 1)
                else:
                    cv2.rectangle(gb_tegak_th_vis, (bx1 + 2, by1 + 2), (bx2 - 2, by2 - 2), (60, 60, 60), 1)
                    
    # Participant code area bounding box
    kode_x_start = x_roi_start + sel * 16
    kode_y_start = y_roi_start + sel * 1 + sel // 2
    cv2.rectangle(gb_tegak_th_vis, (kode_x_start, kode_y_start), (kode_x_start + int(2.5 * sel), kode_y_start + 8 * sel), (255, 200, 0), 2)
    cv2.putText(gb_tegak_th_vis, f"KODE: {kode_peserta}", (kode_x_start, kode_y_start - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 200, 0), 2)
    
    # Top diagnostics banner
    b_x1 = sel * 1
    b_y1 = sel * 1
    b_x2 = sel * 24
    b_y2 = sel * 5 + 30
    cv2.rectangle(gb_tegak_th_vis, (b_x1, b_y1), (b_x2, b_y2), (20, 25, 35), -1)
    cv2.rectangle(gb_tegak_th_vis, (b_x1, b_y1), (b_x2, b_y2), (0, 200, 255), 2)
    
    cv2.putText(gb_tegak_th_vis, "TAMPILAN BINER: gb_tegak_th (Pemeriksaan Ambang Pensil)", (b_x1 + 20, b_y1 + 45), cv2.FONT_HERSHEY_DUPLEX, 0.95, (0, 230, 255), 2)
    cv2.putText(gb_tegak_th_vis, f"Ambang (Batas): {batas} px  |  Terbaca: {total_terisi}/40 soal  |  Ganda: {total_ganda}  |  Kosong: {total_kosong}", (b_x1 + 20, b_y1 + 95), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
    
    if total_ganda > 3:
        status_msg = f"PERINGATAN: Ambang ({batas}) terlalu rendah! {total_ganda} soal terbaca ganda/benar semua. Naikkan ambang pensil."
        status_color = (0, 100, 255)
    elif total_terisi < 15:
        status_msg = f"PERINGATAN: Ambang ({batas}) terlalu tinggi! {total_kosong} soal terbaca kosong/salah semua. Turunkan ambang pensil."
        status_color = (0, 0, 255)
    else:
        status_msg = f"STATUS AMBANG IDEAL: Pembacaan biner stabil ({total_terisi} nomor terisi, {total_ganda} ganda)."
        status_color = (0, 255, 0)
    cv2.putText(gb_tegak_th_vis, status_msg, (b_x1 + 20, b_y1 + 145), cv2.FONT_HERSHEY_SIMPLEX, 0.72, status_color, 2)
    
    _, th_buf = cv2.imencode('.jpg', gb_tegak_th_vis, [cv2.IMWRITE_JPEG_QUALITY, 88])
    th_b64 = base64.b64encode(th_buf).decode('utf-8')
    
    safe_name = f"{kode_peserta}_{kode_soal}_{nama_peserta}_{kelas_peserta}_{nilai}.png".replace(" ", "_")
    
    return {
        "success": True,
        "kode_soal": kode_soal,
        "kode_peserta": kode_peserta,
        "nama_peserta": nama_peserta,
        "kelas": kelas_peserta,
        "nilai": skor,
        "total_soal": len(kunci_answers) if kunci_answers else 40,
        "yang_salah": yang_salah,
        "jawaban": jawaban,
        "kunci": kunci_answers,
        "key_found": key_found,
        "ids_found": ids_found,
        "gb_bagus": bagus_b64,
        "gb_output": output_b64,
        "gb_tegak_th": th_b64,
        "coretan": coretan,
        "batas": batas,
        "total_terisi": total_terisi,
        "total_ganda": total_ganda,
        "total_kosong": total_kosong,
        "max_fill_px": max_fill_px,
        "min_fill_px": min_fill_px,
        "max_empty_px": max_empty_px,
        "suggested_batas": suggested_batas,
        "filename_suggested": safe_name
    }

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "process":
        payload = sys.stdin.read()
        try:
            data = json.loads(payload)
            img_b64 = data.get("image_base64", "")
            if "," in img_b64:
                img_b64 = img_b64.split(",", 1)[1]
            img_bytes = base64.b64decode(img_b64)
            csv_path = data.get("csv_path", "kode_peserta.csv")
            key_path = data.get("key_path", "kunci_kode.txt")
            batas = int(data.get("batas", 300))
            result = process_exam_sheet(img_bytes, csv_path, key_path, batas)
            print(json.dumps(result))
        except Exception as e:
            print(json.dumps({"success": False, "error": str(e)}))
