import cv2
import numpy as np
import cv2.aruco as aruco
import os
import csv
import time
import shutil


def deteksi_aruco(gb):
	dict4 = aruco.getPredefinedDictionary(aruco.DICT_4X4_100)
	detector = aruco.ArucoDetector(dict4)
	pojoks, ids, _ = detector.detectMarkers(gb)
	if ids is None:
		return None, None

	ids_flat = ids.flatten().tolist()

	if not all(i in ids for i in range(4)):
		return None, None

	aruco.drawDetectedMarkers(gb, pojoks, ids)
	kode_soal = [i for i in ids_flat if i >= 4]
	if not kode_soal:
		return None, None

	marker = {}
	for c, id_ in zip(pojoks, ids_flat):
		marker[id_] = c[0]

	tl = marker[0][0].astype(int)
	tr = marker[1][1].astype(int)
	bl = marker[3][3].astype(int)
	br = marker[2][2].astype(int)
	titik = np.float32([tl, tr, bl, br])
	
	cv2.line(gb, tl, tr, (0, 255, 255), 2)
	cv2.line(gb, br, tr, (0, 255, 255), 2)
	cv2.line(gb, br, bl, (0, 255, 255), 2)
	cv2.line(gb, tl, bl, (0, 255, 255), 2)

	return kode_soal[0], titik

def tegakkan(gb, titik_asal, w=1100, h=1300):
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
		for i in range(10):
			if kode[i] == x:
				dipilih += str(i)
		kode_bersih += dipilih
	return kode_bersih

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









# ~ jml_soal = 35
#baca kunci
kelas = '12DI2'
os.system(f'mkdir -p {kelas}')
db_peserta = baca_csv('kode_siswa.csv')
data_kunci = {}
filename_kunci = 'kunci_kode.txt'
if not os.path.exists(filename_kunci):
	peringatan = f'File {filename_kunci} belum ditemukan.\n Silakan kopi paste filenya ke folder yang sama dengan file ini.'
	print(peringatan)
	exit()
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
	print(data_kunci)





port = 1
video = cv2.VideoCapture(port)
if not video.isOpened():
	exit()

data = np.load('kamera.npz')
K = data['K']
dist = data['dist']

w = 19
h = 20
margin = 3
sel = 60

w += 2 * margin
h += 2 * margin

w = w * sel
h = h * sel


while True:
	ret, gb = video.read()
	# ~ gb = cv2.imread('gb_contoh.jpg')
	# ~ cv2.imshow('aslinya', gb)
	gb_bagus = cv2.undistort(gb, K, dist)
	# ~ cv2.imshow('undistort', gb_bagus)
	gb_lagi = gb_bagus.copy()
	gb_output = gb_bagus.copy()

	gb_bagus = cv2.cvtColor(gb_bagus, cv2.COLOR_BGR2GRAY)
	kode_soal, titik = deteksi_aruco(gb=gb_lagi)
	if titik is not None:
		gb_tegak = tegakkan(gb_bagus, titik, w, h)
		gb_output = tegakkan(gb_output, titik, w, h)
		if gb_tegak is not None:
			# ~ cv2.imshow('gb_tegak', gb_tegak)
			
			roi = gb_tegak[sel*7:h - sel * 3, sel * 3 : w - sel * 3]
			# ~ cv2.imshow('roi', roi)
			kol1 = roi[sel * 0:, sel * 1 + sel // 2 :  6 * sel]
			kol2 = roi[sel * 0:, sel * 9 :  13 * sel + sel // 2]
			gb1kolom = np.vstack((kol1, kol2))
			# ~ cv2.imshow('kol1', kol1)
			# ~ cv2.imshow('kol2', kol2)
			# ~ cv2.imshow('jadi satu kolom', gb1kolom)
			
			
			gb_kode_peserta = roi[sel * 1 + sel // 2 : 9 * sel + sel // 2, sel * 16 : 18 * sel + sel // 2]
			# ~ cv2.imshow('gb kode peserta', gb_kode_peserta)
			
			gb1kolom_th = cv2.adaptiveThreshold(gb1kolom, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 151, 50)
			# ~ cv2.imshow('gb1kolom_th', gb1kolom_th)
			gb_kode_peserta_th = cv2.adaptiveThreshold(gb_kode_peserta, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 151, 50)
			
			kode_peserta = deteksi_kode_peserta(gb_kode_peserta_th)
			print(kode_peserta)
			
			if kode_peserta.isdigit() and kode_peserta in db_peserta:
				nama_peserta = db_peserta[kode_peserta][0]
			else:
				nama_peserta = 'NAMA TIDAK DITEMUKAN'


			soal_soal = np.vsplit(gb1kolom_th, 40)
			jawaban = []
			coretan = []

			for soal in soal_soal:
				abc = np.hsplit(soal, 5)
				coretan.append([cv2.countNonZero(a) for a in abc])
			coretan = np.array(coretan)
			print(f'coretan:\n{coretan}')
			batas = 400

			for soal in coretan:
				dipilih = ''
				for a in range(5):
					if soal[a] > batas:
						dipilih += 'ABCDE'[a]
				jawaban.append(dipilih)
			print(f'jawaban:\n{jawaban}')




			# ~ if kode_soal and kode_soal.isdigit():
				# ~ kode = int(kode_soal)
			if kode_soal in data_kunci:
				current_kunci = data_kunci[kode_soal]
				kunci = ['ABCDE'[i] for i in current_kunci]
			else:
				kode_soal = f'{kode_soal} tidak ditemukan di file {filename_kunci}.'

			print(f'kunci:\n {kunci}')
			print(f'panjang kunci: {len(kunci)}')
			print(f'panjang jawaban: {len(jawaban)}')
			nilai_list = [1 if (kunci[i] in jawaban[i]) else 0 for i in range(len(kunci))]
			print(f'nilai_list:;\n {nilai_list}')
			skor = sum(nilai_list)
			print(skor)
			nilai = str(skor)

			yang_salah = [id_+1 for id_, val in enumerate(nilai_list) if val == 0]
			print(yang_salah)
			salah_baris1 = yang_salah[:17]
			salah_baris2 = yang_salah[17:]

			x_pad = 3 * sel
			y_pad = 6 * sel
			x_salah = [sel * 1 + x_pad if no <= 20 else sel * 8 + x_pad for no in yang_salah]
			y_salah = [sel * no + y_pad if no <= 20 else sel * (no % 20) + y_pad for no in yang_salah]
			# ~ for i in range(len(yang_salah)):
				# ~ cv2.putText(gb_output, 'x', (x_salah[i], y_salah[i]), cv2.FONT_HERSHEY_COMPLEX, 1, (0, 0, 255), 1)
			cv2.putText(gb_output, str(kode_peserta), (3 * sel, y_pad - 2 * sel), cv2.FONT_HERSHEY_COMPLEX, 1, (0, 200, 0), 1)
			cv2.putText(gb_output, str(nama_peserta), (4 * sel, y_pad - 2 * sel), cv2.FONT_HERSHEY_COMPLEX, 1, (255, 0, 120), 1)

			cv2.putText(gb_output, str(salah_baris1), (3 * sel, y_pad - sel), cv2.FONT_HERSHEY_COMPLEX, 1, (0, 0, 255), 1)
			cv2.putText(gb_output, str(salah_baris2), (3 * sel, y_pad), cv2.FONT_HERSHEY_COMPLEX, 1, (0, 0, 255), 1)






			cv2.putText(gb_output, nilai, (sel * 16, sel * 3), cv2.FONT_HERSHEY_COMPLEX, 5, (255, 0, 0), 2)
		# ~ cv2.putText(gb_output, 'x', (
			cv2.imshow('gb_output', gb_output)


	cv2.imshow('gb', gb_lagi)
	# ~ cv2.imshow('gb lagi', gb_lagi)

	key = cv2.waitKey(1) & 0xFF
	if key == ord('q') or key == 27:
		break
		# ~ cv2.destroyAllWindows()
	elif key == ord('s'):
			waktu = time.localtime()
			waktu_string = time.strftime("%y%m%d_%H%M%S", waktu)
			cv2.imwrite(f'{kelas}/{kode_peserta}_{kode_soal}_{nama_peserta}_{kelas}_{nilai}.png', gb_output)
			 # simpan nilai ke database siswa
			if kode_peserta in db_peserta and nilai != '':

				db_peserta[kode_peserta][2] = int(nilai)

				tulis_csv(
					db_peserta,
					'kode_siswa.csv'
				)

				print(
					f'Nilai {kode_peserta} '
					f'berhasil disimpan: {nilai}'*20
				)


video.release()
cv2.destroyAllWindows()
