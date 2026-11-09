import cv2
import cv2.aruco as aruco
import numpy as np
# ~ import tkinter as tk
# ~ from tkinter import simpledialog
import os
import time
import csv
import shutil

def baca_csv(filename):
	db = {}
	with open(filename, 'r', newline='', encoding='utf8') as f:
		reader = csv.DictReader(f)

		for baris in reader:
			try:
				nilai = int(baris['nilai'].strip())
			except (ValueError, TypeError):
				nilai = 0
			
			db[baris['kode']] = [
				baris['nama'],
				baris['kelas'],
				nilai
			]

	return db


def tulis_csv(db, filename):
	# ~ os.system(f'cp {filename} {filename}.bak')
	if os.path.exists(filename):
		shutil.copy(
			filename,
			filename + '.bak'
		)

	with open(filename, 'w', newline='', encoding='utf8') as f:
		writer = csv.writer(f)
		
		writer.writerow(['kode', 'nama', 'kelas', 'nilai'])
		
		for key, values in sorted(db.items()):
			baris = [key] + values
			writer.writerow(baris)


def deteksi_pojok(gb):
	gb_gray = cv2.cvtColor(gb, cv2.COLOR_BGR2GRAY)
	aruco_dict = aruco.getPredefinedDictionary(aruco.DICT_4X4_100)
	detector = aruco.ArucoDetector(aruco_dict)
	pojoks, ids, _ = detector.detectMarkers(gb)
	if ids is None:
		return None
	# ~ else:
		# ~ aruco.drawDetectedMarkers(gb, pojoks, ids)
	# ~ print(f'sebelum diflatten: {ids}')
	ids = ids.flatten()
	# ~ print(f'setelah diflatten: {ids}')
	if not all(i in ids for i in range(4)):
		return None
	marker = {}
	
	for c, id_ in zip(pojoks, ids):
		marker[id_] = c[0]
	tl = marker[0][0]
	tr = marker[1][1]
	bl = marker[3][3]
	br = marker[2][2]
	titik = np.float32([tl, tr, bl, br])
	
	
	
	return titik

def tegakkan(gb, titik_asal, w=2200, h=2600):
	y_pad = 200
	tujuan = np.float32([
		[0,y_pad], [w, y_pad], [0, h], [w, h]
	])
	
	M = cv2.getPerspectiveTransform(titik_asal, tujuan)
	
	hasil = cv2.warpPerspective(gb, M, (w, h))
	return hasil
def warp_ljk(gb, w=2200, h=2600):
	titik = deteksi_pojok(gb)
	if titik is None:
		return None
	tujuan = np.float32([
		[0,0], [w, 0], [0, h], [w, h]
	])
	
	M = cv2.getPerspectiveTransform(titik, tujuan)
	
	hasil = cv2.warpPerspective(gb, M, (w, h))
	return hasil

def deteksi_kode_peserta(gbkode):
	digits = np.hsplit(gbkode, 3)
	kode_angka = []
	kode_bersih = ''
	
	for digit in digits:
		angka = np.vsplit(digit, 10)
		kode_angka.append([ cv2.countNonZero(a) for a in angka ])
	kode_angka = np.array(kode_angka)
	# ~ print(f'kode_angka: \n{kode_angka}')
	batas = 20
	for kode1 in kode_angka:
		dipilih = ''
		x = max(kode1)
		for i in range(10):
			if kode1[i] == x:
			# ~ if kode1[i] > batas:
				dipilih += str(i)
		kode_bersih += dipilih
	# ~ print(f'kode: {kode_bersih}')
	return kode_bersih

def deteksi_kode_soal(gb):
	gb_gray = cv2.cvtColor(gb, cv2.COLOR_BGR2GRAY)
	aruco_dict = aruco.getPredefinedDictionary(aruco.DICT_4X4_100)
	# ~ parameters = aruco.DetectorParameters()
	# ~ detector5 = aruco.ArucoDetector(aruco_dict, parameters)
	detector = aruco.ArucoDetector(aruco_dict)
	corners, ids, tertolak = detector.detectMarkers(gb)
	aruco.drawDetectedMarkers(gb, corners, ids)
	# ~ print('ids =', ids)
	# ~ print('rejected =', len(tertolak))
	if ids is not None and len(ids) > 0:
		# ~ print(ids[0][0])
		
		return str(ids[0])


def deteksi_jawaban(gb1kolom_th):
	soal_soal = np.vsplit(gb1kolom_th, 40)
	jawaban = []
	coretan = []
	
	for soal in soal_soal:
		abcde = np.hsplit(soal, 5)
		coretan.append([ cv2.countNonZero(a) for a in abcde ])
	
	coretan = np.array(coretan)
	print('coretan:')
	print(coretan)
	batas = 200
	
	for soal in coretan:
		dipilih = ''
		for a in range(5):
			if soal[a] > batas:
				dipilih += 'ABCDE'[a]
		jawaban.append(dipilih)
	print('jawaban:')
	print(jawaban)
	return jawaban

def simpan_nilai(
		db,
		kode_peserta,
		nilai,
		filename):

	if kode_peserta not in db:
		print('Kode tidak ditemukan')
		return

	db[kode_peserta][2] = int(nilai)

	tulis_csv(db, filename)

	print(
		f'{kode_peserta} '
		f'-> nilai {nilai} tersimpan'
	)
	
def paskan(array, cols=20):
	a = np.array(array)
	baris = int(np.ceil(len(a)/cols))
	b = np.zeros((baris, cols), dtype=a.dtype)
	b.flat[:len(a)] = a
	return b


w = 19
h = 20

margin = 60
w = w * margin
h = h * margin
w += margin * 6
h += margin * 6

sel_w = w // 25
sel_h = h // 26

jawaban = []
posisi = []

nama = ''
kode_soal = ''
nilai = ''
salahnya = ''
salahnya1 = ''
data_kunci = {}
db_peserta = baca_csv('kode_siswa.csv')
# ~ filename_kunci = 'kunci_kode.txt'
filename_kunci = 'kunci_kode_fix_12DI123.txt'
if not os.path.exists(filename_kunci):
	peringatan = f'File {filename_kunci} belum ditemukan.\n Silakan kopi paste filenya ke folder yang sama dengan file ini.'
	print(peringatan)
else:
	peringatan = ''
	with open(filename_kunci, 'r') as f:
		
		for line in f:
			line = line.strip()
			if not line:
				continue
			key, arr_str = line.split(":", 1)
			key = int(key)
			arrku = arr_str.replace(", ]", "]")
			arr = eval(arrku)
			data_kunci[key] = arr














# ~ root = tk.Tk()
# ~ root.withdraw()


# ~ kelas = simpledialog.askstring('Masukkan kelas', "Kelas: ")
kelas = '12DI1'
jml_soal = 40
os.system(f'mkdir -p {kelas}')



port = 1

video = cv2.VideoCapture(port)
# ~ video = cv2.VideoCapture(port, cv2.CAP_GSTREAMER)
if not video.isOpened():
	exit()

data = np.load('kamera.npz')
K = data['K']
dist = data['dist']

while(True):
	ret, gb = video.read()
	gb = cv2.undistort(gb, K, dist)
	
	gb_kontur = gb.copy()
	gb_gray = cv2.cvtColor(gb_kontur, cv2.COLOR_BGR2GRAY)
	titik_pojok_jawaban = deteksi_pojok(gb_kontur)
	kode_soal = deteksi_kode_soal(gb_kontur)
	# ~ print(titik_pojok_jawaban)
	if titik_pojok_jawaban is not None:
		t = titik_pojok_jawaban.astype(int)
			# ~ cv2.circle(gb_kontur, tuple(t), 8, (0, 0, 255), -1)
		cv2.line(gb_kontur,tuple(t[0]),tuple(t[1]),(0,255,255),2)
		cv2.line(gb_kontur,tuple(t[3]),tuple(t[1]),(0,255,255),2)
		cv2.line(gb_kontur,tuple(t[3]),tuple(t[2]),(0,255,255),2)
		cv2.line(gb_kontur,tuple(t[0]),tuple(t[2]),(0,255,255),2)
	
		gb_tegak = tegakkan(gb_gray, titik_pojok_jawaban, w, h)
		# ~ cv2.imshow('gb_tegak', gb_tegak)
		if gb_tegak is not None:
			# ~ cv2.imshow('gb_tegak', gb_tegak)
			gb_tegak_bersih = gb_tegak[sel_h*6 + sel_h//3: h - sel_h*3, sel_w*3: w - sel_w*3]
			# ~ cv2.imshow('gb_tegak_bersih', gb_tegak_bersih)
			w_bersih, h_bersih = gb_tegak_bersih.shape
			sel_w_bersih = w_bersih // 19
			sel_h_bersih = h_bersih // 20
			# ~ print(w_bersih, h_bersih)
			# ~ print(sel_w_bersih, sel_h_bersih)
		# ~ print(gb_tegak_bersih.shape)
		# ~ deteksi_jawaban(gb_tegak)
		
			kol1 = gb_tegak_bersih[sel_h * 0 : 20 * sel_h,sel_w * 1 + sel_w//2 : 6 * sel_w + sel_w//3]
			kol2 = gb_tegak_bersih[sel_h * 0 : 20 * sel_h,sel_w * 9 + sel_w//2 - sel_w//3 : 14 * sel_w]
			# ~ kol3 = gb_tegak_bersih[sel_h * 1 : sel_h * 12,sel_w * 16: 21 * sel_w]
			# ~ kol4 = gb_tegak_bersih[sel_h * 1 : sel_h * 12,sel_w * 23: 28 * sel_w]
			
			gb_kode = gb_tegak_bersih[sel_h * 2 - sel_h//3:10 * sel_h, sel_w * 16 : 19 * sel_w - sel_w//2]
			# ~ cv2.imshow('gb_kode', gb_kode)
			
			
			gb1kolom = np.vstack((kol1, kol2))
			# ~ cv2.imshow('gb1kolom', gb1kolom)
			# ~ print(f'ukuran gb1kolom: {gb1kolom.shape}')
			# ~ print(kol1.shape)
			# ~ print(kol2.shape)
			# ~ print(kol3.shape)
			# ~ print('-'*30)
			gb1kolom_th = cv2.adaptiveThreshold(gb1kolom, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 121, 20)
			gb_kode_th = cv2.adaptiveThreshold(gb_kode, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 121, 20)
			
			# ~ cv2.imshow('gb1kolom_th', gb1kolom_th)
			kode_peserta = deteksi_kode_peserta(gb_kode_th)
			# ~ kode_peserta = '613'
			# ~ if kode_peserta != '':
				# ~ if 100 < int(kode_peserta) < 999:
					# ~ nama = db_peserta[kode_peserta][0]
				# ~ else:
					# ~ nama = ''
			# ~ print(nama)
			nama = ''

			if kode_peserta.isdigit():
				if kode_peserta in db_peserta:
					nama = db_peserta[kode_peserta][0]
				else:
					nama = 'KODE TIDAK ADA'
			# ~ kode_soal = deteksi_kode_soal(gb_kontur)
			print(f'kode_soal: {kode_soal}')
			kode_str = kode_soal
			if kode_soal is not None:
				kode = int(kode_soal)
			if kode in data_kunci:
				current_kunci = data_kunci[kode]
				kunci = [ 'ABCDE'[i] for i in current_kunci ]
				kode_soal = str(kode)
				print("Kunci soal:", kunci)
			else:
				kode_soal = f'{kode_str} tidak ditemukan.'
				print("Kode tidak ditemukan dalam file.")
		
		
		
		
		
		
		
		
		soal_soal = np.vsplit(gb1kolom_th, 40)
		jawaban = []
		coretan = []
		
		for soal in soal_soal:
			abcde = np.hsplit(soal, 5)
			coretan.append([ cv2.countNonZero(a) for a in abcde ])
		
		coretan = np.array(coretan)
		print('coretan:')
		print(coretan)
		batas = 800
		
		for soal in coretan:
			dipilih = ''
			for a in range(5):
				if soal[a] > batas:
					dipilih += 'ABCDE'[a]
			jawaban.append(dipilih)
		print('jawaban:')
		print(jawaban)
		
		
		
		
		
		cv2.putText(gb_kontur, salahnya, (10, 15), cv2.FONT_HERSHEY_SIMPLEX, .5, (0, 0, 255), 1)
		cv2.putText(gb_kontur, salahnya1, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, .5, (0, 0, 255), 1)
		cv2.putText(gb_kontur, nilai, (10, 100), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 0), 2)
		cv2.putText(gb_kontur, kode_peserta, (10, 60), cv2.FONT_HERSHEY_SIMPLEX, .5, (0, 255, 0), 1)
		cv2.putText(gb_kontur, nama, (60, 60), cv2.FONT_HERSHEY_SIMPLEX, .5, (255, 255, 0), 2)
		cv2.putText(gb_kontur, peringatan, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 1)
		cv2.putText(gb_kontur, f'({sel_w},{sel_h})', (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 1)
			
	# ~ cv2.imshow('Tegak', gb_tegak_bersih)
	cv2.imshow('gb_kontur', gb_kontur)
	
	# ~ cv2.imshow('kode peserta', gb_kode)
	# ~ cv2.imshow('Kolom 1', kol1)
	# ~ cv2.imshow('Kolom 2', kol2)
	# ~ cv2.imshow('Kolom 3', kol3)
	# ~ cv2.imshow('Kolom 4', kol4)
	# ~ cv2.imshow('Kolom 1 threshold', gb1kolom_th)
	# ~ cv2.imshow('Jadi 1 kolom', gb1kolom)
	# ~ cv2.imshow('Kolom 3', kol3)
	
	
	
	
	
	
	
	
	
	
	key = cv2.waitKey(1) & 0xFF
	if key == ord('q') or key == 27:
		break
	elif key == ord('s'):
		waktu = time.localtime()
		waktu_string = time.strftime("%y%m%d_%H%M%S", waktu)
		cv2.imwrite(f'{kelas}/{kode_peserta}_{kode_soal}_{nama}_{kelas}_{nilai}.png', gb_kontur)
		 # simpan nilai ke database siswa
		if kode_peserta in db_peserta and nilai != '':

			db_peserta[kode_peserta][2] = int(nilai)

			tulis_csv(
				db_peserta,
				'kode_siswa.csv'
			)

			print(
				f'Nilai {kode_peserta} '
				f'berhasil disimpan: {nilai}'
			)
	elif key == ord('k'):
		
		
		# ~ kode_str = simpledialog.askstring("Input Kode Soal", "Masukkan kode soal (3 digit):")
		if kode_str and kode_str.isdigit():
			kode = int(kode_str)
			if kode in data_kunci:
				current_kunci = data_kunci[kode]
				kunci = [ 'ABCDE'[i] for i in current_kunci ]
				kode_soal = str(kode)
				# ~ print("Kunci soal:", current_kunci)
				print("Kunci soal:", kunci)
			else:
				kode_soal = f'{kode_str} tidak ditemukan.'
				print("Kode tidak ditemukan dalam file.")
		else:
			print("Input tidak valid.")
		jawaban_dia = deteksi_jawaban(gb1kolom_th)
		print('kunci:')
		print(kunci)
		nilai_list = [ 1 if (kunci[i] in jawaban_dia[i]) else 0 for i in range(jml_soal) ]
		print(nilai_list)
		skor = sum(nilai_list)
		nilai = str(skor)
		print(nilai)
		
		yang_salah = [ id+1 for id, val in enumerate(nilai_list) if val == 0 ]
		salahnya = str(yang_salah[:17])
		if len(yang_salah) > 17:
			salahnya1 = str(yang_salah[17:])
		else:
			salahnya1 = ''
		
	

video.release()
cv2.destroyAllWindows()

