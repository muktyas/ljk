import numpy as np
import sympy as sp
import os
import matplotlib.pyplot as plt
from matplotlib.patches import Arc
import statistics as st
from collections import Counter, defaultdict

from ljk import *
from grid import *

os.system('rm -f kunci_kode.txt')
os.system('rm -r gb')
os.system('mkdir -p kunci soal')
kelas = '12DI123'
def awal(ke=1):
	rhs = np.random.randint(11, 19)
	kode = ke
	
	os.system(f'mkdir -p proses/{ke}')
	generate_ljk(ke, save_path=f'proses/{ke}/ljk_{ke}.pdf')
	with open('soal.tex', 'w') as f:
		f.write(r'''\documentclass[a4paper,12pt]{article}
\usepackage{mathptmx}
\usepackage{amsmath}
\usepackage{amsfonts}
\usepackage{graphicx}
\usepackage{multirow}
\usepackage{booktabs}
\usepackage[hidelinks]{hyperref}
\usepackage{bookmark}
\usepackage[a4paper,margin=1cm,bottom=2cm]{geometry}
\usepackage{multicol}
\usepackage{enumitem}
\usepackage{fancyhdr}
\pagestyle{fancy}
\fancyhf{}
\renewcommand{\headrulewidth}{0pt}
\fancyfoot[C]{\thepage}
''')
		f.write(fr'\fancyfoot[R]{{\includegraphics[width=0.05\textwidth]{{ proses/{kode}/aruco_{kode} }} }}')
		f.write(r'''

\renewcommand\thesubsection{\Alph{subsection}}

\begin{document}
\begin{table}
\begin{tabular}{cc}
\multirow{3}{*}{\includegraphics[width=0.06\textwidth]{logosmaw3-hp-kecil}} & \textbf{SMA AL-WILDAN ISLAMIC SCHOOL 3 BSD CITY}\\
%\includegraphics[width=0.2\linewidth]{logosmaw3} & \textbf{SMA AL-WILDAN ISLAMIC SCHOOL 3 BSD CITY}\\
& Jl. Ciater Raya No. 48, Rawa Mekar Jaya, Serpong, Tangerang Selatan\\
& 0878-8366-1010 $|$ \href{mailto:info@alwildan3bsd.sch.id}{info@alwildan3bsd.sch.id} $|$ \url{https://alwildan3bsd.sch.id/}\\
\bottomrule
\end{tabular}
\centering
\end{table}

\begin{center}
	\textbf{ASESMEN SUMATIF TENGAH SEMESTER GANJIL\\
		TAHUN AJARAN 2026/2027}
\end{center}


\textbf{\begin{tabular}{p{.15\textwidth}p{.28\textwidth}p{.12\textwidth}p{.45\textwidth}}
Mata Pelajaran          &: Matematika Lanjut        &Waktu          &: 120 menit \\
Hari/Tanggal            &: Senin/14 September 2026  &Kelas/Guru     &: 12 DI 1,2,3/Indra Bayu Muktyas
\end{tabular}}

\vspace{.25cm}

\begin{tabular}{p{0.945\textwidth}}
	\toprule\\
	\textbf{Petunjuk:}  
		\begin{enumerate}[noitemsep]
			\item Berdoalah sebelum mengerjakan, \textit{bismillah}
			\item Bacalah dengan teliti. Setiap paket soal hanya untuk 1 lembar jawaban. Harap memperhatikan bahwa tanda di sebelah kanan bawah dari lembar jawaban dan soal sama.
			\item Kerjakan soal yang lebih mudah dahulu
			\item Anda diperbolehkan menggunakan kalkulator
			\item Periksa kembali jawaban Anda sebelum mengumpulkannya
			\item Pengawas akan membacakan/membagikan kode peserta, perhatikan dengan baik-baik. Tulislah kode peserta pada lembar jawab dan hitamkan angka yang bersesuaian di bawahnya.
	\end{enumerate}\\
	\bottomrule\\
\end{tabular}
\\''')

		f.write(fr'\phantomsection' + '\n')
		f.write(fr'\addcontentsline{{toc}}{{section}}{{kode: {kode} }}' + '\n')
		f.write(r'\subsection{Pilihan Ganda}' + '\n')
		f.write(r'\begin{multicols}{2}' + '\n')
		f.write(r'\begin{enumerate}' + '\n')

	with open('kunci.tex', 'w') as f:
		f.write(r'\documentclass[10pt, a4paper]{article}' + '\n')
		f.write(r'\usepackage{amsmath}' + '\n')
		f.write(r'\usepackage{amsfonts}' + '\n')
		f.write(r'\usepackage{mathptmx}' + '\n')
		f.write(r'\usepackage{hyperref}' + '\n')
		f.write(r'\usepackage{graphicx}' + '\n')
		f.write(r'\usepackage{multicol}' + '\n')
		f.write(r'\begin{document}' + '\n')
		f.write(fr'\section{{kode: {kode} }}' + '\n')
		f.write(fr'\includegraphics[width=0.15\textwidth]{{ proses/{kode}/aruco_{kode} }}' + '\n') 
		f.write(r'\begin{multicols}{2}' + '\n')
		f.write(r'\begin{enumerate}' + '\n')
	
	with open('kunci_kode.txt', 'a') as j:
		j.write(f'{kode}:[')

def tulis(soal, pg='abcde', kunci=0):
	with open('soal.tex', 'a') as f:
		f.write(fr'\item {soal}' + '\n')
		f.write(r'\begin{enumerate}' + '\n')
		for abc in pg:
			f.write(fr' \item {abc}' + '\n')
		f.write(r'\end{enumerate}' + '\n')

		# tulis kunci
	with open('kunci.tex', 'a') as g:
		g.write(fr'''\item {'ABCDE'[kunci]} 
''')
	with open('kunci_kode.txt', 'a') as h:
		h.write(f'{kunci}, ')

def akhir():
	with open('soal.tex', 'a') as f:
		f.write(r'  \end{enumerate}' + '\n')
		f.write(r'  \end{multicols}' + '\n')
		f.write(r'\newpage \ \newpage' + '\n')
		# ~ f.write(r'\newpage \ \newpage' + '\n')
		f.write(r'\end{document}')

	with open('kunci.tex', 'a') as f:
		f.write(r'  \end{enumerate}' + '\n')
		f.write(r'  \end{multicols}' + '\n')
		f.write(r'\end{document}')
	with open('kunci_kode.txt', 'a') as f:
		f.write(']\n')
	os.system('pdflatex -interaction=batchmode soal.tex')
	os.system('pdflatex -interaction=batchmode kunci.tex')
	# ~ os.system('pdflatex soal.tex')
	# ~ os.system('pdflatex kunci.tex')
	# ~ os.system('xdg-open soal.pdf')

def pg_sekitar(jawaban):
	kunci = np.random.randint(0, 5)
	return [ jawaban + i for i in range(-kunci, 5 - kunci) ], kunci


x, y, z, a, b, c = sp.symbols('x y z a b c')
bil = [ i for i in range(-9,10) if i != 0 ]
bil_prim = [2, 3, 5, 7, 11, 13]

for i in range(1,41):
	exec(f'def s{i}(): pass')


#dummy
pg = 'abcde'
kunci = 0



def s1():
	r = np.random.randint(2, 10)
	soal = f'Persamaan lingkaran dengan titik pusat $O(0, 0)$ dan jari-jari ${r}$ adalah ... .'
	jawab = f'$x^2 + y^2 = {r**2}$'
	
	p1 =  f'$x^2 + y^2 = {r}$'
	p2 =  fr'$x^2 + y^2 = \sqrt{{ {r} }}$'
	p3 =  fr'$x^2 - y^2 = \sqrt{{ {r} }}$'
	p4 =  fr'$x^2 - y^2 = {r**2}$'
	pg = [jawab, p1, p2, p3, p4]
	np.random.shuffle(pg)
	kunci = pg.index(jawab)
	tulis(soal, pg, kunci)

def s2():
	r2 = np.random.randint(4, 10)*2
	soal = f'Diketahui lingkaran dengan persamaan $x^2 + y^2 = {r2}$. Jari-jari dari lingkaran tersebut adalah ... .'
	jawab = fr'\sqrt{{ {r2} }}'
	p1 = fr'\sqrt{{ {2*r2} }}'
	p2 = fr'{r2}'
	p3 = fr'{r2**2}'
	p4 = fr'\sqrt{{ {r2**2} }}'
	pg = [jawab, p1, p2, p3, p4]
	np.random.shuffle(pg)
	kunci = pg.index(jawab)
	pg = [ f'${i}$' for i in pg ]
	tulis(soal, pg, kunci)

def r2(p1, p2):
	dx = p1[0] - p2[0]
	dy = p1[1] - p2[1]
	return dx**2 + dy**2

def lingkaran_p1p2(p1, p2, save_path=None, show=False):
	x1, y1 = p1
	x2, y2 = p2
	
	xp, yp = (x1 + x2)/2, (y1 + y2)/2
	tp = (xp, yp)
	r = np.sqrt(r2(p1, tp))
	
	batas1 = xp - r, yp - r
	batas2 = xp + r, yp + r
	
	
	fig, ax = grid(batas1, batas2)
	
	theta = np.linspace(0, 2*np.pi, 100)
	x_lingkaran = xp + r * np.cos(theta)
	y_lingkaran = yp + r * np.sin(theta)
	
	ax.plot(x_lingkaran, y_lingkaran, 'k')
	ax.plot(x1, y1, 'ok')
	ax.plot(x2, y2, 'ok')
	plt.tight_layout()
	if save_path:
		plt.savefig(save_path)
	if show:
		plt.show()
	return fig, ax

def s3():
	
	xp1 = np.random.choice(bil)
	yp1 = np.random.choice([i for i in bil if abs(i) != abs(xp1)])
	p1 = (xp1, yp1)
	
	dx = np.random.randint(2, 5)
	dy = np.random.choice([i for i in range(2, 5) if i != dx])
	
	xp = xp1 + dx
	yp = yp1 + dy
	p = (xp, yp)
	
	xp2 = xp + dx
	yp2 = yp + dx
	p2 = (xp2, yp2)
	
	r = sp.sqrt(dx**2 + dy**2)
	os.system('mkdir -p gb')
	fig, ax = lingkaran_p1p2(p1, p2, save_path='gb/s3.pdf')
	soal = f'Persamaan lingkaran seperti pada gambar adalah... . \\\\ \\includegraphics[width=.5\\textwidth]{{gb/s3}}'
	
	jawab = (x - xp)**2 + (y - yp)**2 - r
	pil1 = (x - yp)**2 + (y - xp)**2 - r
	pil2 = (x + xp)**2 + (y + yp)**2 - r
	pil3 = (x + yp)**2 + (y + xp)**2 - r
	pil4 = (x + xp)**2 + (y - yp)**2 - r
	pg = [jawab, pil1, pil2, pil3, pil4]
	np.random.shuffle(pg)
	kunci = pg.index(jawab)
	pg = [f'${sp.latex(sp.expand(i))}=0$' for i in pg]
	tulis(soal, pg, kunci)

def s4():
	xp = np.random.choice(bil)
	yp = np.random.choice([i for i in bil if abs(i) != abs(xp)])
	p = (xp, yp)
	
	xq = np.random.choice([i for i in bil if i != xp])
	yq = np.random.choice([i for i in bil if i != yp])
	q = (xq, yq)
	r_2 = r2(p, q)
	
	l_kiri = (x - xp)**2 + (y - yp)**2
	l_kiri_umum = sp.expand(l_kiri) - r_2
	soal = f'Titik pusat dari lingkaran dengan persamaan ${sp.latex(l_kiri_umum)}=0$ adalah ... .'
	jawab = p
	pil1 = (yp, xp)
	pil2 = (-xp, -yp)
	pil3 = (xp, -yp)
	pil4 = (-xp, yp)
	pg = [jawab, pil1, pil2, pil3, pil4]
	np.random.shuffle(pg)
	kunci = pg.index(jawab)
	pg = [f'${sp.latex(i)}$' for i in pg]
	tulis(soal, pg, kunci)

def lingkaran_p_melalui_q(p, q, save_path=None, show=False):
	x1, y1 = p1
	x2, y2 = p2
	
	xp, yp = (x1 + x2)/2, (y1 + y2)/2
	tp = (xp, yp)
	r = jarak(p1, tp)
	
	batas1 = xp - r, yp - r
	batas2 = xp + r, yp + r
	
	
	fig, ax = grid(batas1, batas2)
	
	theta = np.linspace(0, 2*np.pi, 100)
	x_lingkaran = xp + r * np.cos(theta)
	y_lingkaran = yp + r * np.sin(theta)
	
	ax.plot(x_lingkaran, y_lingkaran, 'k')
	ax.plot(x1, y1, 'ok')
	ax.plot(x2, y2, 'ok')
	plt.tight_layout()
	if save_path:
		plt.savefig(save_path)
	if show:
		plt.show()
	return fig, ax

def s5():
	xq = np.random.choice(bil)
	yq = np.random.choice([i for i in bil if abs(i) != abs(xq)])
	q = (xq, yq)
	r_2 = r2((0,0), q)
	r = sp.sqrt(r_2)
	soal = f'Diketahui lingkaran dengan pusat $(0,0)$ dan melalui titik $Q({xq},{yq})$. Persamaan garis singgung lingkaran tersebut yang melalui titik $Q$ adalah ... .'
	jawab = xq*x+yq*y - r
	pil1 = xq*x-yq*y - r
	pil2 = yq*x + xq*y - r
	pil3 = yq*x - xq*y - r
	pil4 = xq*x + yq*y + r
	
	pg = [jawab, pil1, pil2, pil3, pil4]
	np.random.shuffle(pg)
	kunci = pg.index(jawab)
	pg = [f'${sp.latex(i)}=0$' for i in pg]
	tulis(soal, pg, kunci)

def pgsl_m(tp, r, m):
	xp, yp = tp
	y1 = m*(x - xp) + r * sp.sqrt(m**2 + 1) + yp
	y2 = m*(x - xp) - r * sp.sqrt(m**2 + 1) + yp
	return y1, y2

def s6():
	r = np.random.randint(2, 6)
	m = np.random.choice(bil)
	soal = f'Diketahui lingkaran dengan titik pusat $(0, 0)$ dan jari-jari ${r}$. Salah satu persamaan garis singgung yang gradiennya ${m}$ adalah ... .'
	y1, y2 = pgsl_m((0,0), r, m)
	jawab = y1
	pil1 = y1 + 1*sp.sqrt(m**2 + 1)
	pil2 = y2 - 1*sp.sqrt(m**2 + 1)
	pil3 = y1 + 2*sp.sqrt(m**2 + 1)
	pil4 = y2 - 2*sp.sqrt(m**2 + 1)
	
	pg = [jawab, pil1, pil2, pil3, pil4]
	np.random.shuffle(pg)
	kunci = pg.index(jawab)
	pg = [f'$y={sp.latex(sp.expand(i))}$' for i in pg]
	tulis(soal, pg, kunci)

def l(tp, r):
	a, b = tp
	return sp.expand((x - a)**2 + (y - b)**2 - r)

def s7():
	m1 = np.random.choice(bil)
	c1 = np.random.choice(bil)
	y = m1*x + c1
	
	a = np.random.choice(bil)
	b = np.random.choice([ i for i in bil if abs(i) != abs(a) ])
	r = np.random.randint(2,6)
	ling = l((a, b), r)
	soal = f'Diketahui lingkaran $L:{sp.latex(ling)}=0$. Persamaan garis singgung lingkaran yang sejajar garis $y={sp.latex(y)}$ adalah ... .'
	y1, y2 = pgsl_m((a, b), r, m1)
	jawab = y2
	pil1 = y1 + 1
	pil2 = -y2
	pil3, pil4 = pgsl_m((a, b), r, -m1)
	pg = [jawab, pil1, pil2, pil3, pil4]
	np.random.shuffle(pg)
	kunci = pg.index(jawab)
	pg = [f'$y={sp.latex(sp.expand(i))}$' for i in pg]
	tulis(soal, pg, kunci)

def pgsl_di(r_2, q):
	xq, yq = q
	return xq*x + yq*y - r_2

def s8():
	a = np.random.randint(2, 8)
	b = np.random.choice([ i for i in range(2, 8) if i != a ])
	r_2 = a**2 + b**2
	xq = a + b
	yq = b - a
	q = xq, yq
	y = pgsl_di(r_2, (a, b))
	soal = f'Persamaan garis singgung lingkaran $L:x^2 + y^2 = {r_2}$ yang melalui titik ${sp.latex(q)}$ adalah ... .'
	jawab = y
	pil1 = jawab + 1
	pil2 = jawab + 2
	pil3 = pgsl_di(r_2, q)
	pil4 = pgsl_di(r_2, q) + 1
	pg = [jawab, pil1, pil2, pil3, pil4]
	np.random.shuffle(pg)
	kunci = pg.index(jawab)
	pg = [f'${sp.latex(sp.expand(i))}=0$' for i in pg]
	tulis(soal, pg, kunci)

def s9():
	a = np.random.randint(2, 8)
	b = np.random.choice([ i for i in range(2, 8) if i != a ])
	if np.random.randint(1,3) == 1:
		sumbu = 'X'
		r = b
	else:
		sumbu = 'Y'
		r = a
	soal = f'Persamaan lingkaran yang pusatnya di $({a}, {b})$ dan menyinggung sumbu ${sumbu}$ adalah ... .'
	r_2 = r**2
	jawab = (x-a)**2 + (y-b)**2 - r_2
	pil1 = (x-a)**2 + (y-b)**2 + r_2
	pil2 = (x+a)**2 + (y+b)**2 + r_2
	pil3 = (x-b)**2 + (y-a)**2 - r_2
	pil4 = (x+b)**2 + (y+a)**2 - r_2
	pg = [jawab, pil1, pil2, pil3, pil4]
	np.random.shuffle(pg)
	kunci = pg.index(jawab)
	pg = [f'${sp.latex(sp.expand(i))}=0$' for i in pg]
	tulis(soal, pg, kunci)

def elips(tp, a, b):
	h, k = tp
	return sp.latex((x - h)**2/a**2 + (y - k)**2/b**2)

def elips_umum(tp, a, b):
	h, k = tp
	return b**2 * (x - h)**2 + a**2 * (y - k)**2 - a**2 * b**2

def s10():
	h = np.random.choice(bil)
	k = np.random.choice([i for i in bil if abs(i) != abs(h)])
	a = np.random.randint(5, 10)
	b = np.random.randint(2, a)
	e = elips((h, k), a, b)
	soal = f'Koordinat titik pusat elips ${e}=1$ adalah ... .'
	jawab = (h, k)
	pil1 = (-h, -k)
	pil2 = (-k, -h)
	pil3 = (k, -h)
	pil4 = (k, h)
	pg = [jawab, pil1, pil2, pil3, pil4]
	np.random.shuffle(pg)
	kunci = pg.index(jawab)
	pg = [f'${sp.latex(i)}$' for i in pg]
	tulis(soal, pg, kunci)

def s11():
	h = np.random.choice(bil)
	k = np.random.choice([i for i in bil if abs(i) != abs(h)])
	a = np.random.randint(5, 10)
	b = np.random.randint(2, a)
	e_kiri = elips_umum((h, k), a, b)
	soal = f'Panjang sumbu mayor elips ${sp.latex(sp.expand(e_kiri))}=0$ adalah ... .'
	jawab = 2*a
	pg, kunci = pg_sekitar(jawab)
	tulis(soal, pg, kunci)


def pgse_di(tp, a, b, q):
	h, k = tp
	xq, yq = q
	kiri = b**2 * (xq - h)*(x - h) + a**2 * (yq - k)*(y - k) - a**2 * b**2
	return kiri
	
def s12():
	h = 0
	k = 0
	a = np.random.randint(5, 10)
	b = np.random.randint(2, a)
	e_kiri = elips_umum((h, k), a, b)
	q = (h + a, k)
	soal = f'Persamaan garis singgung elips ${sp.latex(sp.expand(e_kiri))}=0$ yang melalui titik $({h+a},{k})$ adalah ... .'
	jawab = pgse_di((h, k), a, b, q)
	pg, kunci = pg_sekitar(jawab)
	pg = [ f'${sp.latex(i)}=0$' for i in pg ]
	tulis(soal, pg, kunci)

def s13():
	h = 0
	k = 0
	b = np.random.randint(5, 10)
	a = np.random.randint(2, b)
	e_kiri = elips_umum((h, k), a, b)
	c2 = b**2 - a**2
	c = sp.sqrt(c2)
	soal = f'Salah satu titik fokus elips ${sp.latex(sp.expand(e_kiri))}=0$ adalah ... .'
	jawab = (0, c)
	pil1 = (c, 0)
	pil2 = (a, 0)
	pil3 = (0, a)
	pil4 = (0, b)
	pg = [jawab, pil1, pil2, pil3, pil4]
	np.random.shuffle(pg)
	kunci = pg.index(jawab)
	pg = [ f'${sp.latex(i)}$' for i in pg ]
	tulis(soal, pg, kunci)

def s14():
	a = np.random.randint(5, 10)
	b = np.random.randint(2, a)
	e = elips((0, 0), a, b)
	m = np.random.choice(bil)
	soal = f'Persamaan garis singgung elips ${e}=1$ dengan gradien ${m}$ adalah ... .'
	jawab = m*x + sp.sqrt(a**2 * m**2 + b**2)
	pil1 = m*x + sp.sqrt(b**2 * m**2 + a**2)
	pil2 = m*x + sp.sqrt(a**2 - b**2)
	pil3 = m*x - sp.sqrt(a**2 - b**2)
	pil4 = m*x - sp.sqrt(b**2 * m**2 + a**2)
	pg = [jawab, pil1, pil2, pil3, pil4]
	np.random.shuffle(pg)
	kunci = pg.index(jawab)
	pg = [ f'$y = {sp.latex(i)}$' for i in pg ]
	tulis(soal, pg, kunci)


def gb_elips(tp, a, b, save_path=None, show=False):
	xp, yp = tp
	
	p1 = xp - a, yp - b
	p2 = xp + a, yp + b
	
	fig, ax = grid(p1, p2)
	
	theta = np.linspace(0, 2*np.pi, 100)
	x_lingkaran = xp + a * np.cos(theta)
	y_lingkaran = yp + b * np.sin(theta)
	
	ax.plot(x_lingkaran, y_lingkaran, 'k')
	ax.plot(xp, yp, '.k')
	plt.tight_layout()
	if save_path:
		plt.savefig(save_path)
	if show:
		plt.show()
	return fig, ax

def s15():
	h = np.random.choice(bil)
	k = np.random.choice([i for i in bil if abs(i) != abs(h)])
	a = np.random.randint(5, 10)
	b = np.random.randint(2, a)
	
	fig, ax = gb_elips((h, k), a, b, 'gb/s15.pdf')
	
	soal = f'Persamaan elips dari gambar berikut ini adalah ... .\\\\ \\includegraphics[width=0.45\\textwidth]{{gb/s15}}'
	
	e = elips_umum((h, k), a, b)
	jawab = e
	pil1 = elips_umum((h, k), b, a)
	pil2 = elips_umum((-h, -k), b, a)
	pil3 = elips_umum((-h, -k), a, b)
	pil4 = elips_umum((-h, k), a, b)
	
	pg = [jawab, pil1, pil2, pil3, pil4]
	np.random.shuffle(pg)
	kunci = pg.index(jawab)
	pg = [ f'${sp.latex(i)}=0$' for i in pg ]
	tulis(soal, pg, kunci)

def s16():
	h = np.random.choice(bil)
	k = np.random.choice([i for i in bil if abs(i) != abs(h)])
	b = np.random.randint(5, 10)
	a = np.random.randint(2, b)
	
	fig, ax = gb_elips((h, k), a, b, 'gb/s16.pdf')
	
	soal = f'Persamaan umum elips dari gambar berikut ini adalah ... .\\\\ \\includegraphics[width=0.45\\textwidth]{{gb/s16}}'
	
	e = elips_umum((h, k), a, b)
	jawab = e
	pil1 = elips_umum((h, k), b, a)
	pil2 = elips_umum((-h, -k), b, a)
	pil3 = elips_umum((-h, -k), a, b)
	pil4 = elips_umum((-h, k), a, b)
	
	pg = [jawab, pil1, pil2, pil3, pil4]
	np.random.shuffle(pg)
	kunci = pg.index(jawab)
	pg = [ f'${sp.latex(sp.expand(i))}=0$' for i in pg ]
	tulis(soal, pg, kunci)

def s17():
	p = np.random.choice([-3, -2, 1, 1, 2, 3])
	kiri = y**2
	kanan = 4 * p * x
	
	fig, ax = parabola_horizontal_plot(p, save_path='gb/s17.pdf')
	soal = f'Persamaan elips dari gambar berikut ini adalah ... .\\\\ \\includegraphics[width=0.45\\textwidth]{{gb/s17}}'
	jawab = f'{sp.latex(kiri)} = {sp.latex(kanan)}'
	pil4 = f'{sp.latex(kiri)} = {sp.latex(p*x)}'
	pil1 = f'{sp.latex(kiri)} = {sp.latex(-kanan)}'
	pil2 = f'{sp.latex(x**2)} = {sp.latex(4*p*y)}'
	pil3 = f'{sp.latex(x**2)} = {sp.latex(-4*p*y)}'
	pg = [jawab, pil1, pil2, pil3, pil4]
	np.random.shuffle(pg)
	kunci = pg.index(jawab)
	pg = [ f'${i}$' for i in pg ]
	tulis(soal, pg, kunci)

def s18():
	p = np.random.choice([-3, -2, 1, 1, 2, 3])
	kiri = x**2
	kanan = 4 * p * y
	
	fig, ax = parabola_vertical_plot(p, save_path='gb/s18.pdf')
	soal = f'Persamaan elips dari gambar berikut ini adalah ... .\\\\ \\includegraphics[width=0.45\\textwidth]{{gb/s18}}'
	jawab = f'{sp.latex(kiri)} = {sp.latex(kanan)}'
	pil4 = f'{sp.latex(kiri)} = {sp.latex(p*x)}'
	pil1 = f'{sp.latex(kiri)} = {sp.latex(-kanan)}'
	pil2 = f'{sp.latex(y**2)} = {sp.latex(4*p*x)}'
	pil3 = f'{sp.latex(y**2)} = {sp.latex(-4*p*x)}'
	pg = [jawab, pil1, pil2, pil3, pil4]
	np.random.shuffle(pg)
	kunci = pg.index(jawab)
	pg = [ f'${i}$' for i in pg ]
	tulis(soal, pg, kunci)

def parabola_h(tp, p):
	h, k = tp
	kiri = (y - k)**2
	kanan = 4 * p * (x - h)
	return sp.expand(kiri - kanan)
	
def s19():
	h = np.random.choice(bil)
	k = np.random.choice([i for i in bil if abs(i) != abs(h)])
	p = np.random.randint(1, 5)
	
	parabola = parabola_h((h, k), p)
	soal = f'Koordinat titik puncak parabola ${sp.latex(parabola)}=0$ adalah ... .'
	jawab = (h, k)
	pil1 = (-h, k)
	pil2 = (k, h)
	pil3 = (-k, -h)
	pil4 = (h, -k)
	pg = [jawab, pil1, pil2, pil3, pil4]
	np.random.shuffle(pg)
	kunci = pg.index(jawab)
	pg = [ f'${sp.latex(i)}$' for i in pg ]
	tulis(soal, pg, kunci)
	
def s20():
	h = np.random.choice(bil)
	k = np.random.choice([i for i in bil if abs(i) != abs(h)])
	p = np.random.choice(bil)
	
	parabola = parabola_h((h, k), p)
	soal = f'Persamaan direktriks parabola ${sp.latex(parabola)}=0$ adalah ... .'
	jawab = f'$x={-p}$'
	pil1 = f'$x={p}$'
	pil2 = f'$y={-p}$'
	pil3 = f'$y={p}$'
	pil4 = f'$x={sp.latex(4*p)}$'
	pg = [jawab, pil1, pil2, pil3, pil4]
	np.random.shuffle(pg)
	kunci = pg.index(jawab)
	pg = [ f'{i}' for i in pg ]
	tulis(soal, pg, kunci)


def parabola_v(tp, p):
	h, k = tp
	kiri = (x - h)**2
	kanan = 4 * p * (y - k)
	return sp.expand(kiri - kanan)

def s21():
	h = np.random.choice(bil)
	k = np.random.choice([i for i in bil if abs(i) != abs(h)])
	p = np.random.randint(1, 5)
	
	parabola = parabola_v((h, k), p)
	soal = f'Koordinat titik fokus parabola ${sp.latex(parabola)}=0$ adalah ... .'
	jawab = (h, k + p)
	pil1 = (h, k)
	pil2 = (h + p, k)
	pil3 = (k, h + p)
	pil4 = (k + p, h)
	pg = [jawab, pil1, pil2, pil3, pil4]
	np.random.shuffle(pg)
	kunci = pg.index(jawab)
	pg = [ f'${sp.latex(i)}$' for i in pg ]
	tulis(soal, pg, kunci)

def s22():
	h = 0
	k = 0
	p = np.random.randint(1, 5)
	
	parabola = parabola_v((h, k), p)
	soal = f'Persamaan parabola dengan puncak di (0, 0) dan persamaan direktriksnya $y={-p}$ adalah ... .'
	jawab = parabola
	pil1 = -jawab
	pil2 = parabola_h((h, k), p)
	pil3 = -pil2
	pil4 = x**2 - y
	pg = [jawab, pil1, pil2, pil3, pil4]
	np.random.shuffle(pg)
	kunci = pg.index(jawab)
	pg = [ f'${sp.latex(i)}=0$' for i in pg ]
	tulis(soal, pg, kunci)

def s23():
	h = 0
	k = 0
	p = np.random.randint(1, 5)
	
	parabola = parabola_h((h, k), p)
	soal = f'Persamaan parabola dengan puncak di (0, 0) dan titik fokus $({p}, 0)$ adalah ... .'
	jawab = parabola
	pil1 = -jawab
	pil2 = parabola_v((h, k), p)
	pil3 = -pil2
	pil4 = y**2 - x
	pg = [jawab, pil1, pil2, pil3, pil4]
	np.random.shuffle(pg)
	kunci = pg.index(jawab)
	pg = [ f'${sp.latex(i)}=0$' for i in pg ]
	tulis(soal, pg, kunci)

def s24():
	h = 0
	k = 0
	p = np.random.randint(1, 5)
	
	parabola = parabola_h((h, k), p)
	soal = f'Panjang latus rektum parabola ${sp.latex(parabola)}=0$ adalah ... .'
	jawab = 4*p
	pil1 = p
	pil2 = 2*p
	pil3 = 3*p
	pil4 = 5*p
	pg = [jawab, pil1, pil2, pil3, pil4]
	np.random.shuffle(pg)
	kunci = pg.index(jawab)
	pg = [ f'${sp.latex(i)}$' for i in pg ]
	tulis(soal, pg, kunci)


def s25():
	h = 0
	k = 0
	p = np.random.randint(1, 5)
	
	parabola = parabola_h((h, k), p)
	xq = p
	yq = 2*p
	soal = f'Persamaan garis singgung parabola ${sp.latex(parabola)}=0$ yang melalui titik $({xq}, {yq})$ adalah ... .'
	jawab = f'${sp.latex(yq * y)} = {sp.latex(2*p*xq + 2*p*x)}$'
	pil1 = f'${sp.latex(yq * y)} = {sp.latex(2*p*xq - 2*p*x)}$'
	pil2 = f'${sp.latex(yq * y)} = {sp.latex(2*p*xq - p*x)}$'
	pil3 = f'${sp.latex(yq * y)} = {sp.latex(2*p*xq + p*x)}$'
	pil4 = f'${sp.latex(yq * y)} = {sp.latex(p*xq + p*x)}$'
	pg = [jawab, pil1, pil2, pil3, pil4]
	np.random.shuffle(pg)
	kunci = pg.index(jawab)
	tulis(soal, pg, kunci)

import matplotlib.pyplot as plt
import numpy as np


def gb_hiperbola(tp, a, b, scale_grid=2, save_path=None, show=False):
	xp, yp = tp

	# Batas grid disesuaikan agar kurva dan asimtot terlihat bagus
	p1 = xp - scale_grid * a, yp - scale_grid * b
	p2 = xp + scale_grid * a, yp + scale_grid * b

	fig, ax = grid(p1, p2)

	# Parameter t untuk fungsi hiperbolik
	t = np.linspace(-2, 2, 200)

	# Cabang Kanan
	x_kanan = xp + a * np.cosh(t)
	y_kanan = yp + b * np.sinh(t)

	# Cabang Kiri
	x_kiri = xp - a * np.cosh(t)
	y_kiri = yp + b * np.sinh(t)

	# Plot kedua cabang hiperbola
	ax.plot(x_kanan, y_kanan, 'k', label='Hiperbola')
	ax.plot(x_kiri, y_kiri, 'k')

	# Plot titik pusat
	ax.plot(xp, yp, '.k')

	# Garis asimtot
	x_asim = np.array([p1[0], p2[0]])
	y_asim1 = yp + (b / a) * (x_asim - xp)
	y_asim2 = yp - (b / a) * (x_asim - xp)

	ax.plot(x_asim, y_asim1, '--r', alpha=0.5, linewidth=1, label='Asimtot')
	ax.plot(x_asim, y_asim2, '--r', alpha=0.5, linewidth=1)

	plt.tight_layout()
	if save_path:
		plt.savefig(save_path)
	if show:
		plt.show()
	return fig, ax

def hiperbola_umum(tp, a, b):
	h, k = tp
	return b**2 * (x - h)**2 - a**2 * (y - k)**2 - a**2 * b**2

def s26():
	h = 0
	k = 0
	a = np.random.randint(5, 10)
	b = np.random.randint(2, a)
	
	fig, ax = gb_hiperbola((h, k), a, b, save_path='gb/s26.pdf')
	
	soal = f'Persamaan hiperbola dari gambar berikut ini adalah ... .\\\\ \\includegraphics[width=0.45\\textwidth]{{gb/s26}}'
	
	e = hiperbola_umum((h, k), a, b)
	jawab = e
	pil1 = hiperbola_umum((h, k), b, a)
	pil2 = hiperbola_umum((h, k), b+1, a+1)
	pil3 = hiperbola_umum((h, k), a+1, b+1)
	pil4 = hiperbola_umum((h, k), a-1, b+1)
	
	pg = [jawab, pil1, pil2, pil3, pil4]
	np.random.shuffle(pg)
	kunci = pg.index(jawab)
	pg = [ f'${sp.latex(i)}=0$' for i in pg ]
	tulis(soal, pg, kunci)

def s27():
	h = np.random.choice(bil)
	k = np.random.choice([i for i in bil if abs(i) != abs(h)])
	a = np.random.randint(5, 10)
	b = np.random.randint(2, a)
	
	fig, ax = gb_hiperbola((h, k), a, b, save_path='gb/s27.pdf')
	
	soal = f'Persamaan hiperbola dari gambar berikut ini adalah ... .\\\\ \\includegraphics[width=0.45\\textwidth]{{gb/s27}}'
	
	e = hiperbola_umum((h, k), a, b)
	jawab = e
	pil1 = hiperbola_umum((h, k), b, a)
	pil2 = hiperbola_umum((-h, -k), b, a)
	pil3 = hiperbola_umum((-h, -k), a, b)
	pil4 = hiperbola_umum((-h, k), a, b)
	
	pg = [jawab, pil1, pil2, pil3, pil4]
	np.random.shuffle(pg)
	kunci = pg.index(jawab)
	pg = [ f'${sp.latex(i)}=0$' for i in pg ]
	tulis(soal, pg, kunci)

def s28():
	h = 0
	k = 0
	a = np.random.randint(5, 10)
	b = np.random.randint(2, a)
	
	fig, ax = gb_hiperbola((h, k), a, b, save_path='gb/s28.pdf')
	
	soal = f'Salah satu persamaan asimtot dari hiperbola pada gambar berikut ini adalah ... .\\\\ \\includegraphics[width=0.45\\textwidth]{{gb/s28}}'
	
	jawab = sp.Rational(b,a)*x
	pil1 = sp.Rational(a,b)*x
	pil2 = sp.Rational(a,b+1)*x
	pil3 = sp.Rational(b,a+1)*x
	pil4 = sp.Rational(b,a-1)*x
	
	pg = [jawab, pil1, pil2, pil3, pil4]
	np.random.shuffle(pg)
	kunci = pg.index(jawab)
	pg = [ f'$y={sp.latex(i)}$' for i in pg ]
	tulis(soal, pg, kunci)

def s29():
	h = 0
	k = 0
	a = np.random.randint(5, 10)
	b = np.random.randint(2, a)
	
	e = hiperbola_umum((h, k), a, b)
	c = sp.sqrt(a**2 + b**2)
	soal = f'Salah satu koordinat titik fokus dari hiperbola ${sp.latex(e)}$ adalah ... .'
	
	jawab = (c, 0)
	pil1 = (a, 0)
	pil2 = (b, 0)
	pil3 = (a + b, 0)
	pil4 = (a + c, 0)
	
	pg = [jawab, pil1, pil2, pil3, pil4]
	np.random.shuffle(pg)
	kunci = pg.index(jawab)
	pg = [ f'${sp.latex(i)}$' for i in pg ]
	tulis(soal, pg, kunci)

def s30():
	h = 0
	k = 0
	a = np.random.randint(5, 10)
	b = np.random.randint(2, a)
	
	e = hiperbola_umum((h, k), a, b)
	m = np.random.choice(bil)
	soal = f'Salah satu persamaan garis singgung hiperbola ${sp.latex(e)}$ dengan gradien ${m}$ adalah ... .'
	
	jawab = m*x + sp.sqrt(a**2 * m**2 - b**2)
	pil1 = m*x + sp.sqrt(a**2 * m**2 + b**2)
	pil2 = m*x + sp.sqrt(b**2 * m**2 - a**2)
	pil3 = m*x + sp.sqrt(b**2 * m**2 + a**2)
	pil4 = m*x + sp.sqrt(a**2 - b**2)
	
	pg = [jawab, pil1, pil2, pil3, pil4]
	np.random.shuffle(pg)
	kunci = pg.index(jawab)
	pg = [ f'$y={sp.latex(i)}$' for i in pg ]
	tulis(soal, pg, kunci)








for i in range(1, 32):
	ke = 10 + i
	awal(ke=ke)
	for nomer in range(1, 41):
		exec(f's{nomer}()')
	akhir()
	os.system(f'mv soal.pdf proses/{ke}/soal_{ke}.pdf')
	os.system(f'mv kunci.pdf kunci/kunci_{ke}.pdf')
	os.system(f'gs -dBATCH -dNOPAUSE -q -sDEVICE=pdfwrite -sOutputFile=soal/soal_{ke}.pdf proses/{ke}/*.pdf')

os.system(f'gs -dBATCH -dNOPAUSE -q -sDEVICE=pdfwrite -sOutputFile=soal/sts_ganjil_mat_{kelas}.pdf soal/soal_*')
os.system(f'gs -dBATCH -dNOPAUSE -q -sDEVICE=pdfwrite -sOutputFile=kunci/sts_ganjil_mat_{kelas}_kunci.pdf kunci/kunci_*')
