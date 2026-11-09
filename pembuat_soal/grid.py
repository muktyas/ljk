import matplotlib.pyplot as plt
import sympy as sp
import numpy as np
import os

plt.rcParams['font.family']='serif'
plt.rcParams['font.serif']='STIXGeneral'
plt.rcParams['mathtext.fontset']='stix'

def grid(p1, p2, show=False, save_path=None):
	fig, ax = plt.subplots(figsize=(6,6))
	xmin = int(min(p1[0], p2[0], -1))
	ymin = int(min(p1[1], p2[1], -1))
	xmax = int(max(p1[0], p2[0], 1))
	ymax = int(max(p1[1], p2[1], 1))
	ax.set_xlim(xmin - 1, xmax + 1)
	ax.set_ylim(ymin - 1, ymax + 1)
	ax.set_xticks([i for i in range(xmin, xmax + 1)])
	ax.set_yticks([i for i in range(ymin, ymax + 1)])
	ax.spines[['left', 'bottom']].set_position('zero')
	ax.spines[['right', 'top']].set_color('none')
	ax.plot(xmax + 1, 0, '>k', clip_on=False)
	ax.plot(0, ymax + 1, '^k', clip_on=False)
	
	ax.text(xmax + 1, 0.2, '$X$')
	ax.text(0.2, ymax + 1, '$Y$')
	
	ax.set_aspect('equal')
	ax.grid(True, linestyle='--', alpha=0.6)
	plt.tight_layout()
	if show:
		plt.show()
	if save_path:
		plt.save(save_path)
	return fig, ax

def lingkaran(pusat, r, save_path=None, show=False):
	xp, yp = pusat
	p1 = xp - r, yp - r
	p2 = xp + r, yp + r
	
	fig, ax = grid(p1, p2)
	
	theta = np.linspace(0, 2*np.pi, 100)
	x_lingkaran = xp + r * np.cos(theta)
	y_lingkaran = yp + r * np.sin(theta)
	
	ax.plot(x_lingkaran, y_lingkaran, 'k')
	ax.plot(xp, yp, '.k')
	plt.tight_layout()
	if save_path:
		plt.savefig(save_path)
	if show:
		plt.show()
	return fig, ax


def parabola_horizontal_plot(p, save_path=None, show=False, x_cari=None):
    # Membuat parameter t dari -2.5 sampai 2.5 untuk mengatur tinggi kurva
    t = np.linspace(-2.5, 2.5, 100)
    
    # 1. IMPLEMENTASI RUMUS PARAMETRIK (y^2 = 4px)
    x_parabola = p * (t**2)
    y_parabola = 2 * p * t
    
    # Menentukan batas grid otomatis berdasarkan bentuk kurva
    p1 = (float(np.min(x_parabola)), float(np.min(y_parabola)))
    p2 = (float(np.max(x_parabola)), float(np.max(y_parabola)))
    
    fig, ax = grid(p1, p2)
    
    # 2. GAMBAR PARABOLA HORIZONTAL
    ax.plot(x_parabola, y_parabola, color='k', linewidth=1, zorder=3)
    ax.plot(0, 0, 'r.', zorder=4)  # Titik puncak di (0,0)
    ax.plot(p, 0, 'ok')
    
    # 3. CARI KOORDINAT JIKA X DIKETAHUI
    if x_cari is not None:
        # Cek validitas: karena y^2 selalu positif, x_cari harus searah dengan nilai p
        if (p > 0 and x_cari >= 0) or (p < 0 and x_cari <= 0):
            # Rumus mencari y dari y^2 = 4px  ->  y = ± √(4px)
            isi_akar = 4 * p * x_cari
            y1 = np.sqrt(isi_akar)
            y2 = -np.sqrt(isi_akar)
            
            # Plot titik atas
            ax.plot(x_cari, y1, 'go', markersize=8, zorder=4)
            ax.text(x_cari + 0.2, y1 + 0.2, f'$({x_cari}, {y1:.2f})$', color='green', fontweight='bold', zorder=4)
            
            # Plot titik bawah (jika bukan tepat di titik puncak 0,0)
            if not np.isclose(y1, y2):
                ax.plot(x_cari, y2, 'go', markersize=8, zorder=4)
                ax.text(x_cari + 0.2, y2 - 0.5, f'$({x_cari}, {y2:.2f})$', color='green', fontweight='bold', zorder=4)
                
            # Garis bantu vertikal di x_cari
            ax.vlines(x_cari, y2, y1, colors='green', linestyles='dotted', zorder=2)
        else:
            print(f"Nilai x={x_cari} tidak valid untuk parabola dengan p={p}!")

    plt.tight_layout()
    if save_path:
        plt.savefig(save_path)
    if show:
        plt.show()
    return fig, ax

def parabola_vertical_plot(p, save_path=None, show=False, x_cari=None):
    # Membuat parameter t dari -2.5 sampai 2.5 untuk mengatur tinggi kurva
    t = np.linspace(-2.5, 2.5, 100)
    
    # 1. IMPLEMENTASI RUMUS PARAMETRIK (y^2 = 4px)
    x_parabola = 2 * p * t
    y_parabola = p * (t**2)
    
    # Menentukan batas grid otomatis berdasarkan bentuk kurva
    p1 = (float(np.min(x_parabola)), float(np.min(y_parabola)))
    p2 = (float(np.max(x_parabola)), float(np.max(y_parabola)))
    
    fig, ax = grid(p1, p2)
    
    # 2. GAMBAR PARABOLA HORIZONTAL
    ax.plot(x_parabola, y_parabola, color='k', linewidth=1, zorder=3)
    ax.plot(0, 0, 'r.', zorder=4)  # Titik puncak di (0,0)
    ax.plot(0, p, 'ok')
    
    # 3. CARI KOORDINAT JIKA X DIKETAHUI
    if x_cari is not None:
        # Cek validitas: karena y^2 selalu positif, x_cari harus searah dengan nilai p
        if (p > 0 and x_cari >= 0) or (p < 0 and x_cari <= 0):
            # Rumus mencari y dari y^2 = 4px  ->  y = ± √(4px)
            isi_akar = 4 * p * x_cari
            y1 = np.sqrt(isi_akar)
            y2 = -np.sqrt(isi_akar)
            
            # Plot titik atas
            ax.plot(x_cari, y1, 'go', markersize=8, zorder=4)
            ax.text(x_cari + 0.2, y1 + 0.2, f'$({x_cari}, {y1:.2f})$', color='green', fontweight='bold', zorder=4)
            
            # Plot titik bawah (jika bukan tepat di titik puncak 0,0)
            if not np.isclose(y1, y2):
                ax.plot(x_cari, y2, 'go', markersize=8, zorder=4)
                ax.text(x_cari + 0.2, y2 - 0.5, f'$({x_cari}, {y2:.2f})$', color='green', fontweight='bold', zorder=4)
                
            # Garis bantu vertikal di x_cari
            ax.vlines(x_cari, y2, y1, colors='green', linestyles='dotted', zorder=2)
        else:
            print(f"Nilai x={x_cari} tidak valid untuk parabola dengan p={p}!")

    plt.tight_layout()
    if save_path:
        plt.savefig(save_path)
    if show:
        plt.show()
    return fig, ax
# ~ p1 = (3, -2)
# ~ p2 = (6, 9)
# ~ grid(p1, p2)

# ~ lingkaran((4,2), 3)

# ~ parabola_horizontal_plot(2)
