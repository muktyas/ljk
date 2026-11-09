import cv2
import numpy as np
import cv2.aruco as aruco

def create_sample_ljk(student_code="012", question_code=11, filled_answers=None):
    w = 25 * 60 # 1500
    h = 26 * 60 # 1560
    sel = 60
    y_pad = 250
    
    # Margin around paper to simulate camera framing
    bg_pad_x = 80
    bg_pad_y = 80
    total_w = w + 2 * bg_pad_x
    total_h = h + 2 * bg_pad_y
    
    # Light gray background simulating desk
    canvas = np.ones((total_h, total_w, 3), dtype=np.uint8) * 240
    # White paper sheet
    canvas[bg_pad_y : bg_pad_y + h, bg_pad_x : bg_pad_x + w] = 255
    
    dict4 = aruco.getPredefinedDictionary(aruco.DICT_4X4_100)
    marker_size = 100
    
    # In code_drive.py:
    # tl = marker[0][0] maps to [0, y_pad]
    # tr = marker[1][1] maps to [w, y_pad]
    # bl = marker[3][3] maps to [0, h]
    # br = marker[2][2] maps to [w, h]
    
    # For marker 0: marker[0][0] is the top-left corner of the marker.
    # We want its top-left corner at paper (0, y_pad) -> canvas (bg_pad_x, bg_pad_y + y_pad)
    m0 = aruco.drawMarker(dict4, 0, marker_size)
    canvas[bg_pad_y + y_pad : bg_pad_y + y_pad + marker_size, bg_pad_x : bg_pad_x + marker_size] = cv2.cvtColor(m0, cv2.COLOR_GRAY2BGR)
    
    # For marker 1: marker[1][1] is top-right corner of marker 1.
    # We want its top-right corner at paper (w, y_pad) -> canvas (bg_pad_x + w, bg_pad_y + y_pad)
    m1 = aruco.drawMarker(dict4, 1, marker_size)
    canvas[bg_pad_y + y_pad : bg_pad_y + y_pad + marker_size, bg_pad_x + w - marker_size : bg_pad_x + w] = cv2.cvtColor(m1, cv2.COLOR_GRAY2BGR)
    
    # For marker 2: marker[2][2] is bottom-right corner of marker 2.
    # We want its bottom-right corner at paper (w, h) -> canvas (bg_pad_x + w, bg_pad_y + h)
    m2 = aruco.drawMarker(dict4, 2, marker_size)
    canvas[bg_pad_y + h - marker_size : bg_pad_y + h, bg_pad_x + w - marker_size : bg_pad_x + w] = cv2.cvtColor(m2, cv2.COLOR_GRAY2BGR)
    
    # For marker 3: marker[3][3] is bottom-left corner of marker 3.
    # We want its bottom-left corner at paper (0, h) -> canvas (bg_pad_x, bg_pad_y + h)
    m3 = aruco.drawMarker(dict4, 3, marker_size)
    canvas[bg_pad_y + h - marker_size : bg_pad_y + h, bg_pad_x : bg_pad_x + marker_size] = cv2.cvtColor(m3, cv2.COLOR_GRAY2BGR)
    
    # Marker Kode Soal (> 10, e.g. 11):
    m_soal = aruco.drawMarker(dict4, question_code, marker_size)
    soal_x = bg_pad_x + (w - marker_size) // 2
    canvas[bg_pad_y + y_pad : bg_pad_y + y_pad + marker_size, soal_x : soal_x + marker_size] = cv2.cvtColor(m_soal, cv2.COLOR_GRAY2BGR)
    
    # Header Information
    cv2.putText(canvas, "LEMBAR JAWABAN KOMPUTER (LJK)", (bg_pad_x + marker_size + 20, bg_pad_y + y_pad + 45), cv2.FONT_HERSHEY_DUPLEX, 0.9, (20, 20, 20), 2)
    cv2.putText(canvas, f"KODE SOAL: {question_code}", (soal_x + marker_size + 15, bg_pad_y + y_pad + 45), cv2.FONT_HERSHEY_DUPLEX, 0.9, (20, 20, 20), 2)
    cv2.putText(canvas, "UJIAN AKHIR SEMESTER", (bg_pad_x + marker_size + 20, bg_pad_y + y_pad + 85), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (60, 60, 60), 2)
    
    # Paper coordinates:
    roi_x0 = bg_pad_x + sel * 3
    roi_y0 = bg_pad_y + sel * 7
    
    # Student ID Grid:
    kp_abs_x = roi_x0 + sel * 16
    kp_abs_y = roi_y0 + sel * 1 + sel // 2
    kp_w = sel * 2 + sel // 2 # 150
    kp_h = 8 * sel            # 480
    
    cv2.putText(canvas, "NO. PESERTA", (kp_abs_x, kp_abs_y - 20), cv2.FONT_HERSHEY_DUPLEX, 0.7, (20, 20, 20), 2)
    cv2.rectangle(canvas, (kp_abs_x, kp_abs_y), (kp_abs_x + kp_w, kp_abs_y + kp_h), (80, 80, 80), 2)
    
    code_digits = [int(d) for d in str(student_code).zfill(3)[:3]] if student_code and str(student_code).strip() != "" and str(student_code).isdigit() else []
    digit_w = kp_w / 3.0
    digit_h = kp_h / 10.0
    
    for col_i in range(3):
        for row_i in range(10):
            cx = int(kp_abs_x + col_i * digit_w + digit_w / 2)
            cy = int(kp_abs_y + row_i * digit_h + digit_h / 2)
            cv2.circle(canvas, (cx, cy), 13, (120, 120, 120), 2)
            cv2.putText(canvas, str(row_i), (cx - 5, cy + 5), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (80, 80, 80), 1)
            
            if len(code_digits) == 3 and row_i == code_digits[col_i]:
                cv2.circle(canvas, (cx, cy), 11, (10, 10, 10), -1)
                
    # Bubble Columns
    if filled_answers == "empty":
        filled_answers = ['-'] * 40
    elif filled_answers is None:
        key_11 = ['A', 'B', 'C', 'D', 'E'] * 8
        filled_answers = list(key_11)
        # Change 3 to wrong answers
        filled_answers[2] = 'A' # wrong
        filled_answers[7] = 'B' # wrong
        filled_answers[24] = 'D' # wrong
        
    roi_h = (h - sel * 3) - (sel * 7) # 960
    q_step_y = roi_h / 20.0
    
    for q_idx in range(40):
        q_num = q_idx + 1
        is_col1 = q_num <= 20
        row_idx = (q_num - 1) if is_col1 else (q_num - 21)
        
        if is_col1:
            q_abs_x = roi_x0 + (sel * 1 + sel // 2)
            q_w = (6 * sel) - (sel * 1 + sel // 2)
        else:
            q_abs_x = roi_x0 + (sel * 9)
            q_w = (13 * sel + sel // 2) - (sel * 9)
            
        q_abs_y = roi_y0 + int(row_idx * q_step_y)
        cv2.putText(canvas, f"{q_num:2d}.", (q_abs_x - 38, q_abs_y + int(q_step_y / 2) + 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (40, 40, 40), 1)
        
        opt_w = q_w / 5.0
        chosen_char = filled_answers[q_idx] if q_idx < len(filled_answers) else '-'
        
        for opt_i, char in enumerate("ABCDE"):
            bcx = int(q_abs_x + opt_i * opt_w + opt_w / 2)
            bcy = int(q_abs_y + q_step_y / 2)
            cv2.circle(canvas, (bcx, bcy), 13, (120, 120, 120), 2)
            cv2.putText(canvas, char, (bcx - 5, bcy + 5), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (80, 80, 80), 1)
            
            if char in chosen_char:
                cv2.circle(canvas, (bcx, bcy), 11, (10, 10, 10), -1)
                
    return canvas

if __name__ == "__main__":
    sheet = create_sample_ljk(student_code="012", question_code=11)
    cv2.imwrite("contoh_ljk.jpg", sheet)
    print("Accurate sample LJK saved as contoh_ljk.jpg")
