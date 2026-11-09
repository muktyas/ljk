import cv2
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages

# Batasi fungsi/variabel yang diekspor saat menggunakan `from ljk import *`
__all__ = ['buat_aruco', 'generate_ljk']

# Konfigurasi Font Global
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.sans-serif'] = ['Nimbus Sans', 'Latin Modern Sans', 'Liberation Sans']


def buat_aruco(id_marker, size_px=100):
    """Membuat image marker ArUco berdasarkan ID."""
    aruco_dict = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_100)
    gb = cv2.aruco.generateImageMarker(aruco_dict, id_marker, size_px)
    filename = f"proses/{id_marker}/aruco_{id_marker}.png"
    cv2.imwrite(filename, gb)
    return gb


def generate_ljk(id_soal=11, show_plot=False, save_path=None):
    """Menghasilkan Figure & Axes Matplotlib Lembar Jawab Komputer (LJK).

    Parameters:
    - id_soal (int): ID ArUco marker untuk paket soal.
    - show_plot (bool): Tampilkan window GUI matplotlib jika True.
    - save_path (str): Simpan gambar ke path file jika diisi (misal 'ljk.png').

    Returns:
    - fig, ax: Objek Matplotlib Figure dan Axes
    """
    fig, ax = plt.subplots(figsize=(8.27, 11.69))
    
    ax.text(-3, 27, "Lembar jawab STS Ganjil 2026/2027", weight='bold')
    ax.text(-3, 26, "Nama:")
    ax.text(16, 26, "Kelas:")
    ax.plot((-3,23),(25.5,25.5), 'k')
    pad = 0.3
    box_properties = dict(boxstyle=f'circle,pad={pad}', fc='none', ec='black')
    abc = 'ABCDE'

    # --- 1. RENDER NOMOR & PILIHAN JAWABAN ---
    no_x = [(1, 1), (21, 9)]

    for no_start, x_start in no_x:
        for i in range(20):
            nomor = no_start + i
            y_pos = 20 - i
            ax.text(x_start, y_pos, f'{nomor}.', ha='right', va='center', fontsize=10)

            for idx, huruf in enumerate(abc):
                ax.text(
                    x_start + idx + 1,
                    y_pos,
                    huruf,
                    ha='center',
                    va='center',
                    color='grey',
                    bbox=box_properties,
                    fontsize=10,
                )

    # --- 2. RENDER KODE PESERTA ---
    x_kode = 17
    y_top = 20

    ax.text(
        x_kode + 1,
        y_top,
        'kode peserta:',
        ha='center',
        va='bottom',
        fontsize=10,
        fontweight='bold',
    )

    for digit_idx in range(3):
        x_digit = x_kode + digit_idx
        ax.text(
            x_digit,
            y_top - 1,
            ' ',
            ha='center',
            va='bottom',
            bbox=dict(boxstyle='square,pad=.8', fc='none', ec='black'),
        )
        for angka in range(10):
            y_num = y_top - angka - 2
            ax.text(
                x_digit,
                y_num,
                angka,
                ha='center',
                va='center',
                color='gray',
                bbox=box_properties,
                fontsize=10,
            )

    # --- 3. RENDER ARUCO POJOK (0, 1, 2, 3) ---
    posisi_pojok = [
        (0, [-3, 0, y_top + 1, y_top + 4]),
        (1, [x_kode + 3, x_kode + 6, y_top + 1, y_top + 4]),
        (2, [x_kode + 3, x_kode + 6, -3, 0]),
        (3, [-3, 0, -3, 0]),
    ]

    for id_marker, extent_pos in posisi_pojok:
        gb = buat_aruco(id_marker)
        ax.imshow(gb, extent=extent_pos, cmap='gray')

    # --- 4. RENDER ID SOAL ---
    gb_id_soal = buat_aruco(id_soal)
    ax.imshow(gb_id_soal, extent=[16, 20, 3, 7], cmap='gray')

    # --- KONFIGURASI KANVAS ---
    ax.set_aspect('equal')
    ax.set_xlim(-5, 25)
    ax.set_ylim(-13, 30)
    ax.axis('off')
    # ~ plt.grid(True)
    plt.tight_layout()

    if save_path:
        # Jika format tujuan adalah PDF, simpan 2 halaman (LJK + Halaman Kosong)
        if save_path.lower().endswith('.pdf'):
            with PdfPages(save_path) as pdf:
                # Halaman 1: Gambar LJK
                pdf.savefig(fig, bbox_inches='tight')

                # Halaman 2: Figure Baru yang Kosong
                fig_empty = plt.figure(figsize=(8.27, 11.69))
                pdf.savefig(fig_empty)
                plt.close(fig_empty)
        else:
            # Jika format gambar biasa (.png, .jpg), simpan halaman LJK saja
            fig.savefig(save_path, dpi=300, bbox_inches='tight')

    # Opsi Tampilkan Plot
    if show_plot:
        plt.show()

    return fig, ax


# --- EXECUTION GUARD ---
# Blok ini HANYA berjalan jika ljk.py dijalankan langsung (python ljk.py)
# Jika diimpor (from ljk import *), blok ini akan diabaikan.
if __name__ == '__main__':
    generate_ljk(id_soal=11, show_plot=True)
