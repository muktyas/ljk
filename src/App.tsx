import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Upload,
  Save,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  KeyRound,
  RefreshCw,
  Download,
  Settings,
  Image as ImageIcon,
  FolderDown,
  Check,
  X,
  Play,
  Layers,
  ChevronRight,
  Eye,
  EyeOff,
  Sliders,
  Sparkles,
  Printer,
  BookOpen,
  Lock,
  Unlock,
  ShieldCheck,
  UserCheck,
  LogOut,
  Key,
  ShieldAlert,
} from 'lucide-react';

interface ScanResult {
  success: boolean;
  error?: string;
  kode_soal?: number | string;
  kode_peserta?: string;
  nama_peserta?: string;
  kelas?: string;
  nilai?: number;
  total_soal?: number;
  yang_salah?: number[];
  jawaban?: string[];
  kunci?: string[];
  key_found?: boolean;
  ids_found?: number[];
  gb_bagus?: string;
  gb_output?: string;
  gb_tegak_th?: string;
  coretan?: number[][];
  batas?: number;
  total_terisi?: number;
  total_ganda?: number;
  total_kosong?: number;
  max_fill_px?: number;
  min_fill_px?: number;
  max_empty_px?: number;
  suggested_batas?: number;
  filename_suggested?: string;
}

interface StudentRecord {
  kode: string;
  nama: string;
  kelas: string;
  nilai: number | null;
}

interface SavedItem {
  filename: string;
  kelas: string;
  path: string;
  size: number;
}

interface UserSession {
  token: string;
  role: 'guru' | 'pengawas';
  name: string;
  permissions: string[];
}

export default function App() {
  // Authentication state
  const [user, setUser] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem('ljk_auth_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loginRole, setLoginRole] = useState<'guru' | 'pengawas'>('guru');
  const [loginPin, setLoginPin] = useState<string>('');
  const [showPinPassword, setShowPinPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Change PIN modal state (Guru only)
  const [showChangePinModal, setShowChangePinModal] = useState<boolean>(false);
  const [pinRoleToChange, setPinRoleToChange] = useState<'guru' | 'pengawas'>('guru');
  const [currentGuruPin, setCurrentGuruPin] = useState<string>('');
  const [newPinInput, setNewPinInput] = useState<string>('');
  const [changePinError, setChangePinError] = useState<string | null>(null);
  const [changePinSuccess, setChangePinSuccess] = useState<string | null>(null);
  const [isChangingPin, setIsChangingPin] = useState<boolean>(false);

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'scan' | 'students' | 'keys' | 'history' | 'generator'>('scan');

  // Generator LJK state
  const [genQuestionCode, setGenQuestionCode] = useState<number>(11);
  const [genStudentCode, setGenStudentCode] = useState<string>('101');
  const [genIsBlank, setGenIsBlank] = useState<boolean>(true);
  const [genImage, setGenImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Scanner state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [threshold, setThreshold] = useState<number>(300);
  const [currentScannedImage, setCurrentScannedImage] = useState<string | null>(null);
  const [isUpdatingThreshold, setIsUpdatingThreshold] = useState<boolean>(false);
  const [activeDisplayTab, setActiveDisplayTab] = useState<'all' | 'gb_tegak_th' | 'gb_output' | 'gb_bagus'>('all');
  const thresholdDebounceTimer = useRef<any>(null);
  const [selectedCsv, setSelectedCsv] = useState<string>('kode_siswa.csv');
  const [selectedKey, setSelectedKey] = useState<string>('kunci_kode_12.txt');

  // Available files
  const [csvFiles, setCsvFiles] = useState<string[]>([]);
  const [keyFiles, setKeyFiles] = useState<string[]>([]);

  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraResolution, setCameraResolution] = useState<{ width: number; height: number } | null>(null);
  const [autoScan, setAutoScan] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const autoScanTimerRef = useRef<any>(null);

  // Status message
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Students & Keys editing state
  const [studentsList, setStudentsList] = useState<StudentRecord[]>([]);
  const [rawStudentsCsv, setRawStudentsCsv] = useState<string>('');
  const [rawKeysTxt, setRawKeysTxt] = useState<string>('');
  const [parsedKeys, setParsedKeys] = useState<Record<string, string[]>>({});
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  const getAuthHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (user?.token) {
      headers['Authorization'] = `Bearer ${user.token}`;
    }
    return headers;
  };

  // Fetch initial file lists when authenticated
  useEffect(() => {
    if (user) {
      fetchFilesList();
      if (user.role === 'guru') {
        fetchStudents();
        fetchKeys();
        fetchSavedItems();
      }
    }
  }, [user]);

  const showNotification = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError(null);
    if (!loginPin.trim()) {
      setLoginError('Masukkan kata sandi / PIN terlebih dahulu.');
      return;
    }
    setIsLoggingIn(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: loginRole, pin: loginPin.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setLoginError(data.error || 'Kata sandi / PIN salah.');
        return;
      }
      const session: UserSession = data.session;
      setUser(session);
      localStorage.setItem('ljk_auth_session', JSON.stringify(session));
      setLoginPin('');
      showNotification(`Selamat datang, ${session.name}!`, 'success');
    } catch (err: any) {
      setLoginError('Gangguan koneksi jaringan saat login: ' + err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (user) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: getAuthHeaders(),
        });
      }
    } catch {}
    setUser(null);
    localStorage.removeItem('ljk_auth_session');
    setActiveTab('scan');
    showNotification('Anda telah keluar dari aplikasi.', 'info');
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePinError(null);
    setChangePinSuccess(null);
    if (!newPinInput.trim() || newPinInput.trim().length < 4) {
      setChangePinError('PIN baru minimal 4 karakter.');
      return;
    }
    setIsChangingPin(true);
    try {
      const res = await fetch('/api/auth/change-pin', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          roleToChange: pinRoleToChange,
          oldPin: currentGuruPin.trim(),
          newPin: newPinInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setChangePinError(data.error || 'Gagal memperbarui PIN.');
        return;
      }
      setChangePinSuccess(data.message || 'PIN berhasil diperbarui.');
      setCurrentGuruPin('');
      setNewPinInput('');
      setTimeout(() => {
        setShowChangePinModal(false);
        setChangePinSuccess(null);
      }, 1500);
    } catch (e: any) {
      setChangePinError('Error: ' + e.message);
    } finally {
      setIsChangingPin(false);
    }
  };

  const fetchFilesList = async () => {
    try {
      const res = await fetch('/api/files-list', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCsvFiles(data.csvFiles || []);
        setKeyFiles(data.keyFiles || []);
        if (data.defaultCsv) setSelectedCsv(data.defaultCsv);
        if (data.defaultKey) setSelectedKey(data.defaultKey);
      }
    } catch (e) {
      console.error('Error fetching files list:', e);
    }
  };

  const fetchStudents = async (fileToLoad?: string) => {
    try {
      const target = fileToLoad || selectedCsv;
      const res = await fetch(`/api/students?file=${encodeURIComponent(target)}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setStudentsList(data.students || []);
        setRawStudentsCsv(data.raw || '');
      }
    } catch (e) {
      console.error('Error fetching students:', e);
    }
  };

  const fetchKeys = async (fileToLoad?: string) => {
    try {
      const target = fileToLoad || selectedKey;
      const res = await fetch(`/api/keys?file=${encodeURIComponent(target)}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setRawKeysTxt(data.raw || '');
        setParsedKeys(data.parsed || {});
      }
    } catch (e) {
      console.error('Error fetching keys:', e);
    }
  };

  const fetchSavedItems = async () => {
    try {
      const res = await fetch('/api/saved-results', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        const itemsWithToken = (data.list || []).map((item: SavedItem) => ({
          ...item,
          path: item.path.includes('token=') ? item.path : `${item.path}?token=${user?.token || ''}`,
        }));
        setSavedItems(itemsWithToken);
      }
    } catch (e) {
      console.error('Error fetching saved items:', e);
    }
  };

  const formatImageSrc = (b64?: string) => {
    if (!b64) return '';
    if (b64.startsWith('data:image')) return b64;
    return `data:image/jpeg;base64,${b64}`;
  };

  // Ensure video element receives stream whenever cameraActive or stream changes
  useEffect(() => {
    let timer: any;
    if (cameraActive && streamRef.current) {
      const attachStream = () => {
        if (videoRef.current && streamRef.current) {
          if (videoRef.current.srcObject !== streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
          }
          videoRef.current
            .play()
            .then(() => {
              if (videoRef.current && videoRef.current.videoWidth > 0) {
                setCameraReady(true);
                setCameraResolution({
                  width: videoRef.current.videoWidth,
                  height: videoRef.current.videoHeight,
                });
              }
            })
            .catch((err) => {
              console.warn('Video auto-play warning:', err);
            });
        }
      };
      attachStream();
      timer = setTimeout(attachStream, 150);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [cameraActive, cameraFacing]);

  // Handle auto-scan interval
  useEffect(() => {
    if (autoScan && cameraActive && cameraReady) {
      autoScanTimerRef.current = setInterval(() => {
        if (!loading && videoRef.current && videoRef.current.videoWidth > 0) {
          captureFrame();
        }
      }, 2500);
    } else {
      if (autoScanTimerRef.current) {
        clearInterval(autoScanTimerRef.current);
        autoScanTimerRef.current = null;
      }
    }
    return () => {
      if (autoScanTimerRef.current) {
        clearInterval(autoScanTimerRef.current);
        autoScanTimerRef.current = null;
      }
    };
  }, [autoScan, cameraActive, cameraReady, loading]);

  // Camera Management
  const startCamera = async () => {
    try {
      stopCamera();
      let stream: MediaStream | null = null;
      
      // Try ideal camera facing and resolution
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: cameraFacing },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch (errFacing) {
        console.warn('Fallback to basic camera constraints:', errFacing);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      if (!stream) {
        throw new Error('Tidak dapat memperoleh video dari kamera perangkat.');
      }

      streamRef.current = stream;
      setCameraActive(true);
      setCameraReady(false);

      // Attach immediately if videoRef is already mounted
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      showNotification('Kamera aktif. Posisikan 4 marker pojok LJK ke dalam layar.', 'info');
    } catch (err: any) {
      console.error('Camera error:', err);
      showNotification('Gagal mengakses kamera: ' + (err.message || 'Izin ditolak atau kamera tidak ditemukan'), 'error');
    }
  };

  const stopCamera = () => {
    if (autoScanTimerRef.current) {
      clearInterval(autoScanTimerRef.current);
      autoScanTimerRef.current = null;
    }
    setAutoScan(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraReady(false);
    setCameraResolution(null);
  };

  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    if (cameraActive) {
      setTimeout(() => startCamera(), 100);
    }
  };

  const captureFrame = () => {
    if (!videoRef.current || !streamRef.current) {
      showNotification('Kamera belum aktif. Silakan buka kamera terlebih dahulu.', 'error');
      return;
    }
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      showNotification('Kamera sedang memuat gambar, mohon tunggu 1 detik.', 'error');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const b64 = canvas.toDataURL('image/jpeg', 0.92);
    processImageBase64(b64);
  };

  // Process image via backend
  const processImageBase64 = async (base64Img: string) => {
    setCurrentScannedImage(base64Img);
    setLoading(true);
    setSaveSuccessNotice(null);
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          image_base64: base64Img,
          batas: threshold,
          csv_file: selectedCsv,
          key_file: selectedKey,
        }),
      });

      const data = await res.json();
      console.log('Scan response:', {
        success: data.success,
        ids_found: data.ids_found,
        has_gb_bagus: Boolean(data.gb_bagus),
        has_gb_output: Boolean(data.gb_output),
        has_gb_tegak_th: Boolean(data.gb_tegak_th),
      });
      setResult(data);
      if (data.success) {
        showNotification(
          `Penilaian selesai! Peserta: ${data.nama_peserta} (${data.kode_peserta}) - Nilai: ${data.nilai}/${data.total_soal}`,
          'success'
        );
      } else {
        showNotification(data.error || 'Marker belum lengkap terdeteksi.', 'error');
      }
    } catch (err: any) {
      console.error('Scan error:', err);
      showNotification('Terjadi kesalahan jaringan atau server saat memindai.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Real-time live threshold adjuster
  const handleThresholdChange = (newThreshold: number) => {
    setThreshold(newThreshold);

    // 1. Instant local preview calculation from coretan
    if (result && result.coretan && result.kunci) {
      const newJawaban = result.coretan.map((counts) => {
        let dip = '';
        counts.forEach((c, idx) => {
          if (c > newThreshold) dip += 'ABCDE'[idx];
        });
        return dip || '-';
      });

      const newYangSalah: number[] = [];
      let newSkor = 0;
      result.kunci.forEach((k, idx) => {
        const j = newJawaban[idx] || '-';
        if (k && j.includes(k)) {
          newSkor += 1;
        } else {
          newYangSalah.push(idx + 1);
        }
      });

      const newTotalTerisi = newJawaban.filter((j) => j !== '-').length;
      const newTotalGanda = newJawaban.filter((j) => j.length > 1).length;
      const newTotalKosong = newJawaban.filter((j) => j === '-').length;

      setResult((prev) =>
        prev
          ? {
              ...prev,
              nilai: newSkor,
              jawaban: newJawaban,
              yang_salah: newYangSalah,
              total_terisi: newTotalTerisi,
              total_ganda: newTotalGanda,
              total_kosong: newTotalKosong,
              batas: newThreshold,
            }
          : null
      );
    }

    // 2. Debounced server-side rethresholding for high-resolution annotated gb_tegak_th & gb_output
    if (thresholdDebounceTimer.current) {
      clearTimeout(thresholdDebounceTimer.current);
    }
    thresholdDebounceTimer.current = setTimeout(async () => {
      if (!currentScannedImage && !result) return;
      setIsUpdatingThreshold(true);
      try {
        const res = await fetch('/api/rethreshold', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            image_base64: currentScannedImage,
            batas: newThreshold,
            csv_file: selectedCsv,
            key_file: selectedKey,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setResult(data);
          }
        }
      } catch (err) {
        console.error('Error rethresholding:', err);
      } finally {
        setIsUpdatingThreshold(false);
      }
    }, 220);
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      if (b64) {
        processImageBase64(b64);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Load sample test sheet
  const handleLoadSample = async (studentCode = '101', questionCode = 11) => {
    setLoading(true);
    try {
      const res = await fetch('/api/sample-ljk', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ student_code: studentCode, question_code: questionCode }),
      });
      const data = await res.json();
      if (data.success && data.image_base64) {
        processImageBase64(data.image_base64);
      } else {
        showNotification('Gagal membuat gambar contoh.', 'error');
        setLoading(false);
      }
    } catch (e: any) {
      showNotification('Gagal memuat contoh: ' + e.message, 'error');
      setLoading(false);
    }
  };

  // Generate LJK sheet for printing or testing
  const handleGenerateLjk = async (isPrintPrompt = false) => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/sample-ljk', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          student_code: genIsBlank ? '' : genStudentCode,
          question_code: genQuestionCode,
          is_blank: genIsBlank,
        }),
      });
      const data = await res.json();
      if (data.success && data.image_base64) {
        setGenImage(data.image_base64);
        showNotification(
          `Lembar LJK Kode ${genQuestionCode} (${genIsBlank ? 'Kosong Siap Cetak' : 'Simulasi Siswa'}) berhasil dibuat!`,
          'success'
        );
        if (isPrintPrompt) {
          setTimeout(() => {
            handlePrintLjk(data.image_base64);
          }, 300);
        }
      } else {
        showNotification('Gagal membuat lembar LJK.', 'error');
      }
    } catch (e: any) {
      showNotification('Error: ' + e.message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrintLjk = (imgSrc?: string) => {
    const src = imgSrc || genImage;
    if (!src) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Cetak Lembar Jawab Komputer (LJK) - Kode ${genQuestionCode}</title>
            <style>
              @page { size: A4 portrait; margin: 5mm; }
              body { margin: 0; display: flex; justify-content: center; align-items: center; background: #fff; }
              img { width: 100%; max-width: 200mm; height: auto; }
            </style>
          </head>
          <body>
            <img src="${src}" onload="window.print();window.close();" />
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Save gb_output
  const handleSaveResult = async () => {
    if (!result || !result.gb_output) {
      showNotification('Tidak ada gambar gb_output yang dapat disimpan.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const filename =
        result.filename_suggested ||
        `LJK_${result.kode_peserta || '000'}_${result.kode_soal || 'soal'}_nilai_${result.nilai ?? 0}.png`;

      // 1. Save to server directory & update CSV
      const res = await fetch('/api/save-result', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          image_base64: 'data:image/jpeg;base64,' + result.gb_output,
          filename: filename,
          kode_peserta: result.kode_peserta,
          nilai: result.nilai,
          kelas: result.kelas,
          csv_file: selectedCsv,
        }),
      });

      const resData = await res.json();

      // 2. Also trigger direct browser download
      const downloadLink = document.createElement('a');
      downloadLink.href = 'data:image/jpeg;base64,' + result.gb_output;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      if (resData.success) {
        setSaveSuccessNotice(
          `Gambar ${filename} berhasil disimpan ke folder ${result.kelas || 'UMUM'} dan diunduh!`
        );
        showNotification('Gambar hasil penilaian dan nilai CSV tersimpan!', 'success');
        fetchSavedItems();
        fetchStudents();
      } else {
        showNotification('Gambar diunduh, namun server gagal menyimpan: ' + resData.error, 'error');
      }
    } catch (e: any) {
      showNotification('Gagal menyimpan gambar: ' + e.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Save updated student CSV
  const handleSaveStudentsCsv = async () => {
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ raw: rawStudentsCsv, file: selectedCsv }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message, 'success');
        fetchStudents();
      } else {
        showNotification(data.error || 'Gagal menyimpan data siswa.', 'error');
      }
    } catch (e: any) {
      showNotification('Error: ' + e.message, 'error');
    }
  };

  // Save updated key TXT
  const handleSaveKeysTxt = async () => {
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ raw: rawKeysTxt, file: selectedKey }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message, 'success');
        fetchKeys();
      } else {
        showNotification(data.error || 'Gagal menyimpan kunci.', 'error');
      }
    } catch (e: any) {
      showNotification('Error: ' + e.message, 'error');
    }
  };

  // If not logged in, display the Authentication screen
  if (!user) {
    return (
      <div id="login_container" className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 sm:p-6">
        {/* Toast Notification for Login */}
        {statusMsg && (
          <div
            id="toast_notification_login"
            className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-lg shadow-lg border text-sm font-medium transition-all ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                : statusMsg.type === 'error'
                ? 'bg-rose-50 text-rose-900 border-rose-300'
                : 'bg-indigo-50 text-indigo-900 border-indigo-300'
            }`}
          >
            {statusMsg.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-600" />}
            {statusMsg.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600" />}
            {statusMsg.type === 'info' && <AlertCircle className="w-5 h-5 text-indigo-600" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 p-6 text-white text-center relative">
            <div className="w-14 h-14 bg-white/10 backdrop-blur-xs rounded-xl flex items-center justify-center mx-auto mb-3 border border-white/20 shadow-inner">
              <Lock className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              Sistem Koreksi LJK & Ujian
            </h1>
            <p className="text-xs text-indigo-200 mt-1 max-w-xs mx-auto">
              Perlindungan Privasi Data Siswa, Kunci Jawaban, dan Rekap Nilai Ujian
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Role Selection */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">
                  Pilih Peran Pengguna:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginRole('guru');
                      setLoginError(null);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all relative ${
                      loginRole === 'guru'
                        ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-600/30'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <ShieldCheck className={`w-4 h-4 ${loginRole === 'guru' ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span className="text-xs font-bold text-slate-900">
                        Guru / Admin
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block leading-tight">
                      Akses penuh: nilai, siswa CSV, kunci TXT
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLoginRole('pengawas');
                      setLoginError(null);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all relative ${
                      loginRole === 'pengawas'
                        ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/30'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <UserCheck className={`w-4 h-4 ${loginRole === 'pengawas' ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span className="text-xs font-bold text-slate-900">
                        Pengawas
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block leading-tight">
                      Hanya pemindaian LJK & cetak lembar
                    </span>
                  </button>
                </div>
              </div>

              {/* PIN / Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Kata Sandi / PIN {loginRole === 'guru' ? 'Guru' : 'Pengawas'}:
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {loginRole === 'guru' ? 'Otorisasi Lengkap' : 'Otorisasi Khusus'}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showPinPassword ? 'text' : 'password'}
                    value={loginPin}
                    onChange={(e) => {
                      setLoginPin(e.target.value);
                      setLoginError(null);
                    }}
                    placeholder={`Masukkan kata sandi / PIN ${loginRole === 'guru' ? 'Guru' : 'Pengawas'}...`}
                    autoFocus
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPinPassword(!showPinPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPinPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error Alert */}
              {loginError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoggingIn ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Unlock className="w-4 h-4" />
                )}
                <span>{isLoggingIn ? 'Memverifikasi...' : 'Masuk ke Aplikasi'}</span>
              </button>
            </form>
          </div>
        </div>

        <p className="text-xs text-slate-400 text-center mt-6">
          Sistem Keamanan Akses Lembar Jawab Komputer • Dilindungi Hak Akses Berjenjang
        </p>
      </div>
    );
  }

  return (
    <div id="main_app_container" className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Toast Notification */}
      {statusMsg && (
        <div
          id="toast_notification"
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-lg shadow-lg border text-sm font-medium transition-all ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : statusMsg.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-300'
              : 'bg-indigo-50 text-indigo-900 border-indigo-300'
          }`}
        >
          {statusMsg.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-600" />}
          {statusMsg.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600" />}
          {statusMsg.type === 'info' && <AlertCircle className="w-5 h-5 text-indigo-600" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header id="app_header" className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                Scanner LJK ArUco
              </h1>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Deteksi Marker 0-3 (Pojok) &gt;10 (Kode Soal)
              </p>
            </div>
          </div>

          {/* Navigation Tabs (Role-Filtered) */}
          <nav id="nav_tabs" className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 overflow-x-auto">
            <button
              id="tab_btn_scan"
              onClick={() => setActiveTab('scan')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === 'scan'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Pemindai LJK</span>
            </button>

            {user.role === 'guru' && (
              <>
                <button
                  id="tab_btn_students"
                  onClick={() => setActiveTab('students')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === 'students'
                      ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Data Siswa (CSV)</span>
                </button>
                <button
                  id="tab_btn_keys"
                  onClick={() => setActiveTab('keys')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === 'keys'
                      ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Kunci Jawaban</span>
                </button>
                <button
                  id="tab_btn_history"
                  onClick={() => {
                    fetchSavedItems();
                    setActiveTab('history');
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === 'history'
                      ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FolderDown className="w-4 h-4" />
                  <span>Berkas Tersimpan</span>
                  {savedItems.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-700 font-semibold">
                      {savedItems.length}
                    </span>
                  )}
                </button>
              </>
            )}

            <button
              id="tab_btn_generator"
              onClick={() => {
                setActiveTab('generator');
                if (!genImage) {
                  handleGenerateLjk();
                }
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === 'generator'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Cetak LJK</span>
            </button>
          </nav>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                user.role === 'guru'
                  ? 'bg-indigo-100 text-indigo-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {user.role === 'guru' ? (
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              ) : (
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span className="hidden md:inline">{user.name}</span>
              <span className="md:hidden capitalize">{user.role}</span>
            </div>

            {user.role === 'guru' && (
              <button
                type="button"
                onClick={() => {
                  setShowChangePinModal(true);
                  setChangePinError(null);
                  setChangePinSuccess(null);
                }}
                title="Ubah Kata Sandi / PIN"
                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
              >
                <Key className="w-4 h-4" />
                <span className="hidden lg:inline">Ubah PIN</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleLogout}
              title="Keluar"
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* TAB 1: SCANNER */}
        {activeTab === 'scan' && (
          <div className="space-y-6">
            {/* Controls Bar & Source Selection */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {!cameraActive ? (
                    <button
                      id="btn_start_camera"
                      onClick={startCamera}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-xs"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Buka Kamera</span>
                    </button>
                  ) : (
                    <>
                      <button
                        id="btn_capture_frame"
                        onClick={captureFrame}
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-xs animate-pulse"
                      >
                        <Play className="w-4 h-4" />
                        <span>Tangkap & Scan LJK</span>
                      </button>
                      <button
                        id="btn_switch_camera"
                        onClick={toggleCameraFacing}
                        className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Kamera {cameraFacing === 'environment' ? 'Belakang' : 'Depan'}</span>
                      </button>
                      <button
                        id="btn_stop_camera"
                        onClick={stopCamera}
                        className="flex items-center gap-2 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        <X className="w-4 h-4" />
                        <span>Tutup Kamera</span>
                      </button>
                    </>
                  )}

                  {/* File Upload Button */}
                  <label
                    id="btn_upload_image"
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Unggah Berkas Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  {/* Quick Sample Button */}
                  <button
                    id="btn_sample_101"
                    onClick={() => handleLoadSample('101', 11)}
                    disabled={loading}
                    className="flex items-center gap-2 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-sm font-medium transition-colors"
                    title="Uji coba lembar contoh siswa Abdiel Naufal (101), kode soal 11"
                  >
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Uji Contoh Siswa 101</span>
                  </button>

                  <button
                    id="btn_sample_102"
                    onClick={() => handleLoadSample('102', 12)}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                    title="Uji coba lembar contoh siswa Adzam Raffasya (102), kode soal 12"
                  >
                    <span>Uji Siswa 102</span>
                  </button>
                </div>

                {/* Configuration Dropdowns & Threshold */}
                <div className="flex flex-wrap items-center gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-200 text-xs">
                  {/* CSV Selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium">CSV:</span>
                    <select
                      id="select_csv_file"
                      value={selectedCsv}
                      onChange={(e) => {
                        setSelectedCsv(e.target.value);
                        fetchStudents(e.target.value);
                      }}
                      className="bg-slate-50 border border-slate-300 text-slate-800 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
                    >
                      {csvFiles.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Key Selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium">Kunci:</span>
                    <select
                      id="select_key_file"
                      value={selectedKey}
                      onChange={(e) => {
                        setSelectedKey(e.target.value);
                        fetchKeys(e.target.value);
                      }}
                      className="bg-slate-50 border border-slate-300 text-slate-800 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
                    >
                      {keyFiles.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Threshold Slider with Live Feedback */}
                  <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                    <Sliders className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-500">Ambang Pensil:</span>
                    <input
                      id="input_threshold_slider"
                      type="range"
                      min="100"
                      max="700"
                      step="25"
                      value={threshold}
                      onChange={(e) => handleThresholdChange(Number(e.target.value))}
                      className="w-24 accent-indigo-600 cursor-pointer"
                      title="Geser untuk mengatur kepekaan deteksi pensil secara live"
                    />
                    <span className="font-mono text-indigo-700 font-bold">{threshold}</span>
                    {isUpdatingThreshold && (
                      <span title="Memperbarui live...">
                        <RefreshCw className="w-3 h-3 text-indigo-600 animate-spin" />
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Camera Preview Live Stream */}
              {cameraActive && (
                <div id="camera_preview_container" className="mt-4 pt-4 border-t border-slate-200">
                  <div className="relative rounded-2xl overflow-hidden bg-slate-950 max-w-3xl mx-auto shadow-lg aspect-video flex items-center justify-center border border-slate-800">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      onLoadedMetadata={() => {
                        if (videoRef.current) {
                          videoRef.current.play().catch(() => {});
                          setCameraReady(true);
                          if (videoRef.current.videoWidth > 0) {
                            setCameraResolution({
                              width: videoRef.current.videoWidth,
                              height: videoRef.current.videoHeight,
                            });
                          }
                        }
                      }}
                      onPlay={() => setCameraReady(true)}
                      className="w-full h-full object-cover"
                    />

                    {/* Camera Status & Resolution Badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        cameraReady ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${cameraReady ? 'bg-white animate-pulse' : 'bg-white'}`} />
                        {cameraReady ? 'Kamera Aktif' : 'Menghubungkan...'}
                      </span>
                      {cameraResolution && (
                        <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-black/60 text-slate-200 text-[11px] font-mono">
                          {cameraResolution.width}x{cameraResolution.height}
                        </span>
                      )}
                    </div>

                    {/* Camera Top Controls */}
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={toggleCameraFacing}
                        className="px-2.5 py-1 bg-black/60 hover:bg-black/80 text-white rounded-lg text-xs backdrop-blur-sm transition-colors flex items-center gap-1.5"
                        title="Balik Kamera Depan / Belakang"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{cameraFacing === 'environment' ? 'Belakang' : 'Depan'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="p-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg text-xs backdrop-blur-sm transition-colors"
                        title="Tutup Kamera"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Visual Overlay Alignment Guide */}
                    <div className="absolute inset-4 sm:inset-6 border-2 border-dashed border-amber-400/80 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                      <div className="flex justify-between items-start">
                        <span className="text-[11px] sm:text-xs text-amber-200 font-mono bg-black/70 px-2.5 py-1 rounded backdrop-blur-xs">
                          Posisikan 4 Marker Pojok (0, 1, 2, 3) di dalam bingkai
                        </span>
                        {autoScan && (
                          <span className="text-[11px] text-emerald-300 font-mono bg-emerald-950/80 border border-emerald-500/50 px-2 py-0.5 rounded animate-pulse">
                            Auto-Scan Aktif
                          </span>
                        )}
                      </div>

                      {/* Bottom Live Action Bar */}
                      <div className="flex items-center justify-between gap-2 pointer-events-auto">
                        <label className="flex items-center gap-2 bg-black/70 text-slate-200 px-3 py-1.5 rounded-lg text-xs cursor-pointer backdrop-blur-xs hover:bg-black/80">
                          <input
                            type="checkbox"
                            checked={autoScan}
                            onChange={(e) => setAutoScan(e.target.checked)}
                            className="rounded text-indigo-500"
                          />
                          <span>Pindai Otomatis (2.5 dtk)</span>
                        </label>

                        <button
                          type="button"
                          id="btn_live_capture"
                          onClick={captureFrame}
                          disabled={loading}
                          className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-lg shadow-lg transition-transform active:scale-95"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Ambil & Pindai LJK</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Loading Indicator */}
            {loading && (
              <div id="loading_banner" className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 text-center space-y-3">
                <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <h4 className="text-base font-semibold text-indigo-900">Memproses Lembar Jawaban...</h4>
                <p className="text-xs text-indigo-600">
                  Mendeteksi marker ArUco, menegakkan perspektif, membaca kode peserta, dan menghitung skor otomatis.
                </p>
              </div>
            )}

            {/* Result Overview Cards */}
            {result && result.success && (
              <div id="result_summary_card" className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                  {/* Nilai Besar */}
                  <div className="col-span-2 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">
                        Nilai Akhir
                      </span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-4xl font-extrabold text-indigo-900 font-mono">
                          {result.nilai}
                        </span>
                        <span className="text-sm text-slate-500 font-medium">
                          / {result.total_soal || 40}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-500 block">Akurasi</span>
                      <span className="text-base font-bold text-emerald-600 font-mono">
                        {Math.round(((result.nilai ?? 0) / (result.total_soal || 40)) * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Nama Peserta */}
                  <div className="col-span-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <span className="text-xs text-slate-500 font-medium block">Nama Peserta</span>
                    <p className="text-sm font-bold text-slate-900 mt-1 truncate">
                      {result.nama_peserta || '-'}
                    </p>
                    <span className="text-xs text-slate-500">
                      Kelas: <strong className="text-slate-700">{result.kelas || '-'}</strong>
                    </span>
                  </div>

                  {/* Kode Peserta */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <span className="text-xs text-slate-500 font-medium block">Kode Peserta</span>
                    <p className="text-base font-bold text-indigo-700 font-mono mt-1">
                      {result.kode_peserta || '-'}
                    </p>
                  </div>

                  {/* Kode Soal */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <span className="text-xs text-slate-500 font-medium block">Kode Soal</span>
                    <p className="text-base font-bold text-emerald-700 font-mono mt-1">
                      {result.kode_soal ?? '-'}
                    </p>
                  </div>
                </div>

                {/* Wrong Answers List & Action to Save */}
                <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-700">Nomor Soal yang Salah:</span>
                      {result.yang_salah && result.yang_salah.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {result.yang_salah.map((no) => (
                            <span
                              key={no}
                              className="px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded text-xs font-mono font-bold"
                            >
                              {no}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-emerald-600 font-semibold">
                          Tidak ada (Semua Benar)
                        </span>
                      )}
                    </div>
                    {result.key_found === false && (
                      <p className="text-xs text-rose-600 font-medium">
                        Perhatian: Kode soal {result.kode_soal} belum terdaftar di file {selectedKey}.
                      </p>
                    )}
                  </div>

                  {/* Primary Save Button as requested */}
                  <button
                    id="btn_simpan_gambar_gb_output"
                    onClick={handleSaveResult}
                    disabled={isSaving}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-semibold transition-all shadow-xs"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? 'Menyimpan...' : 'Simpan Gambar (gb_output)'}</span>
                  </button>
                </div>

                {saveSuccessNotice && (
                  <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>{saveSuccessNotice}</span>
                  </div>
                )}
              </div>
            )}

            {/* Error Display if scan failed */}
            {result && !result.success && (
              <div id="error_alert_banner" className="bg-rose-50 border border-rose-200 rounded-xl p-5 text-rose-900 space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                  <span>Deteksi Belum Berhasil</span>
                </div>
                <p className="text-sm text-rose-700">{result.error}</p>
                {result.ids_found && (
                  <div className="text-xs text-rose-600 mt-2 font-mono">
                    Marker yang terdeteksi: [{result.ids_found.join(', ')}]. Pastikan lembar tidak terpotong dan pencahayaan rata.
                  </div>
                )}
              </div>
            )}

            {/* DEDICATED LIVE AMBANG PENSIL & CITRA BINER CONTROL PANEL */}
            <div id="live_threshold_panel" className="bg-white rounded-xl border border-indigo-200 p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>Pemeriksaan Ambang Pensil &amp; Citra Biner (gb_tegak_th)</span>
                      {isUpdatingThreshold && (
                        <span className="flex items-center gap-1 text-[11px] text-indigo-600 font-normal">
                          <RefreshCw className="w-3 h-3 animate-spin" /> Memperbarui live...
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Sesuaikan ambang (threshold) secara live agar bulatan terbaca akurat — tidak benar semua atau salah semua.
                    </p>
                  </div>
                </div>

                {/* Status Diagnostic Badge */}
                <div>
                  {result?.success ? (
                    (result.total_ganda ?? 0) > 3 ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 border border-amber-300 text-amber-900 rounded-full text-xs font-semibold">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                        <span>Ambang Terlalu Rendah ({result.total_ganda} soal ganda/semua benar)</span>
                      </span>
                    ) : (result.total_kosong ?? 0) > 5 ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-100 border border-rose-300 text-rose-900 rounded-full text-xs font-semibold">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-700" />
                        <span>Ambang Terlalu Tinggi ({result.total_kosong} soal kosong/salah semua)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-full text-xs font-semibold">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Ambang Ideal ({result.total_terisi || 40}/40 terisi, {result.total_ganda || 0} ganda)</span>
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs">
                      <span>Bawaan: 300 px</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Slider & Quick Recommendation */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Sensitivitas Ambang Pensil:</span>
                    <span className="font-mono font-bold text-indigo-700 text-sm bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {threshold} px
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-500 font-medium">100 (Lebih Peka)</span>
                    <input
                      id="input_threshold_slider_large"
                      type="range"
                      min="100"
                      max="700"
                      step="25"
                      value={threshold}
                      onChange={(e) => handleThresholdChange(Number(e.target.value))}
                      className="flex-1 accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                    />
                    <span className="text-[11px] text-slate-500 font-medium">700 (Lebih Ketat)</span>
                  </div>
                </div>

                {/* Quick Auto-threshold button if available */}
                {result?.suggested_batas && result.suggested_batas !== threshold && (
                  <button
                    type="button"
                    id="btn_auto_threshold"
                    onClick={() => handleThresholdChange(result.suggested_batas!)}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold transition-colors flex-shrink-0"
                    title="Gunakan nilai ambang yang dihitung otomatis berdasarkan intensitas arsiran"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Gunakan Ambang Ideal ({result.suggested_batas} px)</span>
                  </button>
                )}
              </div>

              {/* View Switcher Tabs */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                <span className="text-slate-500 font-medium hidden sm:inline">Pilih Tampilan Citra:</span>
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => setActiveDisplayTab('all')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                      activeDisplayTab === 'all'
                        ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Semua Tampilan (3)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDisplayTab('gb_tegak_th')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                      activeDisplayTab === 'gb_tegak_th'
                        ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                    <span>Tampilan 3: Citra Biner (gb_tegak_th)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDisplayTab('gb_output')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                      activeDisplayTab === 'gb_output'
                        ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    <span>Tampilan 2: Hasil Koreksi (gb_output)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDisplayTab('gb_bagus')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                      activeDisplayTab === 'gb_bagus'
                        ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                    <span>Tampilan 1: Marker (gb_bagus)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* THREE VIEWS AS REQUESTED BY USER:
                1. Tampilan 1: gb_bagus (Marker & Kontur)
                2. Tampilan 2: gb_output (Hasil Dinilai)
                3. Tampilan 3: gb_tegak_th (Pemeriksaan Ambang Pensil)
            */}
            <div id="dual_display_section" className="space-y-6">
              {/* TAMPILAN 3: GB_TEGAK_TH (AMBANG PENSIL & BINER LIVE) */}
              {(activeDisplayTab === 'all' || activeDisplayTab === 'gb_tegak_th') && (
                <div
                  id="display_gb_tegak_th_card"
                  className="bg-white rounded-xl border-2 border-indigo-300 overflow-hidden shadow-sm"
                >
                  <div className="px-5 py-3.5 bg-indigo-50/80 border-b border-indigo-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse" />
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <span>Tampilan 3: Visualisasi Pemeriksaan Ambang Pensil (gb_tegak_th)</span>
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-mono rounded font-bold">
                            Live Ambang: {threshold} px
                          </span>
                        </h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="hidden sm:inline text-xs text-slate-500">
                        Kotak Hijau = Terbaca Terisi • Angka px = Kepekatan
                      </span>
                      {result?.gb_tegak_th && (
                        <a
                          id="btn_download_gb_tegak_th"
                          href={formatImageSrc(result.gb_tegak_th)}
                          download={`gb_tegak_th_${result.kode_peserta || 'scan'}_ambang_${threshold}.jpg`}
                          className="flex items-center gap-1.5 px-3 py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 rounded-md text-xs font-semibold transition-colors border border-cyan-200"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Unduh gb_tegak_th</span>
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="p-5 flex flex-col items-center justify-center bg-slate-950 min-h-[350px]">
                    {result?.gb_tegak_th ? (
                      <div className="relative max-w-full rounded-lg overflow-hidden border border-slate-700 shadow-md bg-black">
                        <img
                          id="img_gb_tegak_th"
                          src={formatImageSrc(result.gb_tegak_th)}
                          alt="Tampilan gb_tegak_th"
                          className="max-h-[850px] w-auto max-w-full object-contain"
                        />
                        <div className="absolute top-2 left-2 bg-indigo-900/90 text-white text-xs px-2.5 py-1 rounded font-mono font-semibold border border-indigo-400/40">
                          gb_tegak_th (Biner Ambang {threshold} px)
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-slate-400">
                        <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50 text-slate-500" />
                        <p className="text-sm font-medium text-slate-300">Citra biner gb_tegak_th akan tampil di sini saat pemindaian.</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-md">
                          Gunakan tombol &quot;Ambil &amp; Pindai LJK&quot; atau &quot;Uji Contoh Siswa 101&quot; untuk memeriksa kepekatan pensil dan ambang batas secara visual.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Interpretive guide for teacher */}
                  <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="font-semibold text-slate-800">💡 Panduan Ambang:</span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" />
                        <span>Kotak Hijau: Opsi terisi (&gt; {threshold} px)</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" />
                        <span>Kotak Oranye: Mendekati ambang</span>
                      </span>
                      <span className="text-slate-500">
                        • Jika terbaca ganda (semua benar): <strong>naikkan ambang</strong>.
                      </span>
                      <span className="text-slate-500">
                        • Jika tidak terbaca (semua salah): <strong>turunkan ambang</strong>.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAMPILAN 2: GB_OUTPUT */}
              {(activeDisplayTab === 'all' || activeDisplayTab === 'gb_output') && (
                <div
                  id="display_gb_output_card"
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs"
                >
                  <div className="px-5 py-3.5 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-3 h-3 rounded-full ${result?.success ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <h3 className="text-sm font-bold text-slate-800">
                        Tampilan 2: Lembar Hasil Koreksi Otomatis (gb_output)
                      </h3>
                    </div>
                    {result?.gb_output && (
                      <div className="flex items-center gap-2">
                        <button
                          id="btn_download_gb_output"
                          onClick={handleSaveResult}
                          disabled={isSaving}
                          className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md text-xs font-semibold transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Simpan Gambar</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex flex-col items-center justify-center bg-slate-900/5 min-h-[300px]">
                    {result?.gb_output ? (
                      <div className="relative max-w-full rounded-lg overflow-hidden border border-slate-300 shadow-sm bg-black">
                        <img
                          id="img_gb_output"
                          src={formatImageSrc(result.gb_output)}
                          alt="Tampilan gb_output"
                          className="max-h-[750px] w-auto max-w-full object-contain"
                        />
                        <div className={`absolute top-2 left-2 text-white text-xs px-2.5 py-1 rounded font-mono font-semibold ${
                          result.success ? 'bg-emerald-800/90' : 'bg-rose-800/90'
                        }`}>
                          {result.success ? 'gb_output (Dinilai & Dikoreksi)' : 'gb_output (Panduan Penyesuaian)'}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-slate-400">
                        <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-medium">Hasil penilaian gb_output akan tampil di sini.</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Menampilkan lembar yang telah ditegakkan, nilai siswa, nomor yang salah, dan tanda silang otomatis.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAMPILAN 1: GB_BAGUS */}
              {(activeDisplayTab === 'all' || activeDisplayTab === 'gb_bagus') && (
                <div
                  id="display_gb_bagus_card"
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs"
                >
                  <div className="px-5 py-3.5 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                      <h3 className="text-sm font-bold text-slate-800">
                        Tampilan 1: Hasil Scan &amp; Deteksi Marker ArUco (gb_bagus)
                      </h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="hidden sm:inline text-xs text-slate-500">
                        Marker Pojok (0, 1, 2, 3) &amp; Garis Kuning Tepi
                      </span>
                      {result?.gb_bagus && (
                        <a
                          id="btn_download_gb_bagus"
                          href={formatImageSrc(result.gb_bagus)}
                          download={`gb_bagus_${result.kode_peserta || 'scan'}.jpg`}
                          className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-md text-xs font-semibold transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Unduh gb_bagus</span>
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="p-5 flex flex-col items-center justify-center bg-slate-900/5 min-h-[300px]">
                    {result?.gb_bagus ? (
                      <div className="relative max-w-full rounded-lg overflow-hidden border border-slate-300 shadow-sm bg-black">
                        <img
                          id="img_gb_bagus"
                          src={formatImageSrc(result.gb_bagus)}
                          alt="Tampilan gb_bagus"
                          className="max-h-[650px] w-auto max-w-full object-contain"
                        />
                        <div className="absolute top-2 left-2 bg-black/75 text-white text-xs px-2.5 py-1 rounded font-mono font-semibold">
                          gb_bagus (Marker ArUco &amp; Kontur)
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-slate-400">
                        <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-medium">Belum ada gambar yang dipindai.</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Buka kamera atau unggah berkas foto lembar jawaban siswa untuk melihat hasil visual gb_bagus.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Access Barrier for Pengawas attempting to view sensitive Guru-only tabs */}
        {user.role !== 'guru' && (activeTab === 'students' || activeTab === 'keys' || activeTab === 'history') && (
          <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center max-w-md mx-auto my-12 shadow-sm space-y-4">
            <div className="w-14 h-14 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center mx-auto text-rose-600 shadow-inner">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Akses Terbatas: Data Dilindungi</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Data siswa, kunci jawaban ujian, serta riwayat berkas hanya dapat diakses dan dikelola oleh Guru / Administrator yang memiliki otorisasi penuh.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('scan')}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              Kembali ke Pemindai LJK
            </button>
          </div>
        )}

        {/* TAB 2: DATA SISWA (CSV) */}
        {activeTab === 'students' && user.role === 'guru' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Data Siswa ({selectedCsv})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Basis data siswa untuk pencocokan Kode Peserta LJK dengan Nama dan Kelas.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={selectedCsv}
                  onChange={(e) => {
                    setSelectedCsv(e.target.value);
                    fetchStudents(e.target.value);
                  }}
                  className="bg-slate-50 border border-slate-300 text-slate-800 rounded-md px-3 py-1.5 text-xs font-medium"
                >
                  {csvFiles.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleSaveStudentsCsv}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-medium transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan CSV</span>
                </button>
              </div>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>Total: {studentsList.length} Siswa terdaftar</span>
                <span>Nilai akan otomatis diperbarui saat pemindaian disimpan</span>
              </div>
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0">
                    <tr>
                      <th className="px-4 py-3">Kode</th>
                      <th className="px-4 py-3">Nama Siswa</th>
                      <th className="px-4 py-3">Kelas</th>
                      <th className="px-4 py-3 text-right">Nilai Terakhir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {studentsList.map((stu) => (
                      <tr key={stu.kode} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2.5 font-bold text-indigo-700">{stu.kode}</td>
                        <td className="px-4 py-2.5 font-sans font-medium text-slate-900">{stu.nama}</td>
                        <td className="px-4 py-2.5 text-slate-600">{stu.kelas}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-emerald-700">
                          {stu.nilai !== null ? stu.nilai : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Raw CSV Editor */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">
                Editor Teks Mentah (format: kode,nama,kelas,nilai)
              </label>
              <textarea
                value={rawStudentsCsv}
                onChange={(e) => setRawStudentsCsv(e.target.value)}
                rows={8}
                className="w-full p-3 font-mono text-xs border border-slate-300 rounded-lg bg-slate-50 text-slate-800 focus:bg-white"
              />
            </div>
          </div>
        )}

        {/* TAB 3: KUNCI JAWABAN (TXT) */}
        {activeTab === 'keys' && user.role === 'guru' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Kunci Jawaban ({selectedKey})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Format per baris: <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700 font-mono">11:[2, 3, 4, 0, ...]</code> (0=A, 1=B, 2=C, 3=D, 4=E).
                </p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={selectedKey}
                  onChange={(e) => {
                    setSelectedKey(e.target.value);
                    fetchKeys(e.target.value);
                  }}
                  className="bg-slate-50 border border-slate-300 text-slate-800 rounded-md px-3 py-1.5 text-xs font-medium"
                >
                  {keyFiles.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleSaveKeysTxt}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-medium transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan Kunci</span>
                </button>
              </div>
            </div>

            {/* Parsed Keys Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(parsedKeys).map(([code, answers]) => (
                <div
                  key={code}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-indigo-800">
                      Kode Soal: <strong className="text-sm font-mono">{code}</strong>
                    </span>
                    <span className="text-xs text-slate-500">{answers.length} Butir Soal</span>
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto pt-1 font-mono text-xs">
                    {answers.map((ans, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 text-[10px]"
                      >
                        {idx + 1}:{ans}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Raw Text Editor */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">
                Editor Mentah kunci_kode.txt
              </label>
              <textarea
                value={rawKeysTxt}
                onChange={(e) => setRawKeysTxt(e.target.value)}
                rows={12}
                className="w-full p-3 font-mono text-xs border border-slate-300 rounded-lg bg-slate-50 text-slate-800 focus:bg-white"
              />
            </div>
          </div>
        )}

        {/* TAB 4: RIWAYAT BERKAS TERSIMPAN */}
        {activeTab === 'history' && user.role === 'guru' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Galeri Berkas LJK Dinilai (gb_output)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tersimpan di server per folder kelas: <code className="font-mono">hasil_scan/[kelas]/...</code>
                </p>
              </div>
              <button
                onClick={fetchSavedItems}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Segarkan</span>
              </button>
            </div>

            {savedItems.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
                <FolderDown className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">Belum ada gambar penilaian yang tersimpan.</p>
                <p className="text-xs text-slate-500 mt-1">
                  Gunakan tombol &quot;Simpan Gambar (gb_output)&quot; setelah memindai lembar jawaban siswa.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {savedItems.map((item, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-sm transition-shadow flex flex-col"
                  >
                    <div className="aspect-[4/5] bg-black relative flex items-center justify-center overflow-hidden">
                      <img
                        src={item.path}
                        alt={item.filename}
                        className="w-full h-full object-contain"
                      />
                      <span className="absolute top-2 right-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded font-mono">
                        Kelas: {item.kelas}
                      </span>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <p className="text-xs font-mono font-semibold text-slate-900 truncate" title={item.filename}>
                          {item.filename}
                        </p>
                        <span className="text-[11px] text-slate-500">
                          Ukuran: {Math.round(item.size / 1024)} KB
                        </span>
                      </div>
                      <a
                        href={item.path}
                        download={item.filename}
                        className="flex items-center justify-center gap-1.5 w-full py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-md text-xs font-medium transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Unduh Berkas</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: GENERATOR LJK & EKOSISTEM SOAL ACAK */}
        {activeTab === 'generator' && (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                      Sesuai Format ljk.py & sts_mat_12DI123.py
                    </span>
                    <span className="text-xs text-slate-500 font-mono">DICT_4X4_100</span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mt-2">
                    Generator & Cetak Lembar Jawab Komputer (LJK)
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                    Cetak lembar LJK A4 resmi dengan 4 marker ArUco pojok (ID 0, 1, 2, 3) dan marker Kode Soal (ID &gt; 10).
                    Tersedia mode lembar kosong siap cetak untuk ujian atau lembar simulasi untuk menguji akurasi pemindai.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleGenerateLjk(true)}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors disabled:opacity-50"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Cetak Langsung (A4)</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Generator Controls */}
              <div className="lg:col-span-5 space-y-6">
                {/* Configuration Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                    <span>Pengaturan Lembar LJK</span>
                  </h3>

                  {/* Mode Selector */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-2">
                      Tipe Lembar LJK:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setGenIsBlank(true);
                        }}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          genIsBlank
                            ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <span className="text-xs font-bold text-slate-900 block">
                          Lembar Kosong
                        </span>
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          Siap dicetak & dibagikan ke siswa saat ujian
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setGenIsBlank(false);
                        }}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          !genIsBlank
                            ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <span className="text-xs font-bold text-slate-900 block">
                          Simulasi Jawaban
                        </span>
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          Dilengkapi isian bulatan untuk tes scanner
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Question Code (Marker ArUco ID) */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                      Kode Soal (ID Marker ArUco):
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="11"
                        max="99"
                        value={genQuestionCode}
                        onChange={(e) => setGenQuestionCode(Number(e.target.value) || 11)}
                        className="w-28 p-2 text-sm font-mono border border-slate-300 rounded-lg text-center font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <span className="text-xs text-slate-500">
                        Paket soal 11 s/d 41 tersedia di berkas kunci
                      </span>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {[11, 12, 13, 14, 15, 20, 25, 30].map((code) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => setGenQuestionCode(code)}
                          className={`px-2.5 py-1 text-xs rounded-md font-mono border transition-colors ${
                            genQuestionCode === code
                              ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Kode {code}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Student Code (if simulated) */}
                  {!genIsBlank && (
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        Kode Peserta (3 Digit):
                      </label>
                      <input
                        type="text"
                        maxLength={3}
                        value={genStudentCode}
                        onChange={(e) => setGenStudentCode(e.target.value)}
                        className="w-full p-2 text-sm font-mono border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Contoh: 101"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Siswa 101 terdaftar sebagai &apos;Abdiel Naufal Alfatih&apos; di kode_siswa.csv
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <button
                      type="button"
                      onClick={() => handleGenerateLjk(false)}
                      disabled={isGenerating}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-black text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      {isGenerating ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-amber-400" />
                      )}
                      <span>{isGenerating ? 'Sedang Merender LJK...' : 'Render Lembar LJK'}</span>
                    </button>

                    {genImage && (
                      <button
                        type="button"
                        onClick={() => {
                          processImageBase64(genImage);
                          setActiveTab('scan');
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Play className="w-3.5 h-3.5 fill-emerald-800" />
                        <span>Uji Langsung di Tab Pemindai LJK</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Info Card: Ekosistem Pembuat Soal Acak */}
                <div className="bg-slate-900 text-white rounded-xl p-5 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 text-amber-400">
                    <BookOpen className="w-4 h-4" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">
                      Arsitektur Soal Acak & LJK Otomatis
                    </h4>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Sistem dalam folder <code className="text-amber-300 font-mono">Pembuatan soal acak otomatis dan ljk nya</code> menghubungkan pembuatan bank soal acak hingga pemindaian LJK:
                  </p>
                  <ul className="text-xs text-slate-300 space-y-2 list-disc pl-4">
                    <li>
                      <strong className="text-white">Bank Soal Parametrik (<code className="font-mono text-indigo-300">sts_mat_12DI123.py</code> & <code className="font-mono text-indigo-300">grid.py</code>)</strong>: Menghitung persamaan lingkaran, parabola, dan hiperbola secara dinamis dengan SymPy.
                    </li>
                    <li>
                      <strong className="text-white">Kunci Jawaban Otomatis</strong>: Setiap paket (11 - 41) mengacak urutan pilihan (A-E) dan langsung mengekspor daftar indeks kunci ke <code className="font-mono text-indigo-300">kunci_kode_fix_12DI123.txt</code>.
                    </li>
                    <li>
                      <strong className="text-white">Identifikasi Marker ArUco (<code className="font-mono text-indigo-300">ljk.py</code>)</strong>: Marker ArUco dicetak di lembar soal dan LJK, memungkinkan scanner langsung mengenali paket soal tanpa input manual.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Right Column: Live LJK Preview */}
              <div className="lg:col-span-7">
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col h-full">
                  <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-slate-500" />
                      <span className="text-xs font-bold text-slate-800">
                        Pratinjau Lembar LJK (Kode Soal: {genQuestionCode})
                      </span>
                    </div>

                    {genImage && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handlePrintLjk()}
                          className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md text-xs font-semibold transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Cetak</span>
                        </button>
                        <a
                          href={genImage}
                          download={`LJK_Kode_${genQuestionCode}_${genIsBlank ? 'blank' : 'simulasi'}.jpg`}
                          className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Unduh JPG</span>
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex-1 flex items-center justify-center bg-slate-100 min-h-[520px]">
                    {isGenerating ? (
                      <div className="text-center p-8 text-slate-500">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-3" />
                        <p className="text-sm font-semibold">Sedang merender lembar LJK...</p>
                        <p className="text-xs text-slate-400 mt-1">Menggambar marker ArUco 0-3 dan grid 40 soal</p>
                      </div>
                    ) : genImage ? (
                      <div className="max-w-md w-full bg-white shadow-md border border-slate-200 rounded-sm overflow-hidden p-1">
                        <img
                          src={genImage}
                          alt="Lembar LJK Siap Cetak"
                          className="w-full h-auto object-contain block"
                        />
                      </div>
                    ) : (
                      <div className="text-center p-8 text-slate-400">
                        <Printer className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p className="text-sm font-medium">Klik &quot;Render Lembar LJK&quot; untuk melihat pratinjau.</p>
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-500">
                    Ukuran standar 1500 x 1560 px disesuaikan dengan area warp perspektif ArUco (0=Kiri Atas, 1=Kanan Atas, 2=Kanan Bawah, 3=Kiri Bawah).
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal Ubah PIN (Guru Only) */}
      {showChangePinModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-700 to-indigo-800 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Key className="w-5 h-5 text-indigo-200" />
                <h3 className="text-base font-bold">Ubah Kata Sandi / PIN</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowChangePinModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangePin} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Pilih Peran yang Ingin Diperbarui PIN-nya:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPinRoleToChange('guru');
                      setChangePinError(null);
                    }}
                    className={`p-2.5 rounded-lg border text-xs font-semibold text-center transition-colors ${
                      pinRoleToChange === 'guru'
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-700 ring-2 ring-indigo-600/20'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    PIN Guru / Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPinRoleToChange('pengawas');
                      setChangePinError(null);
                    }}
                    className={`p-2.5 rounded-lg border text-xs font-semibold text-center transition-colors ${
                      pinRoleToChange === 'pengawas'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-700 ring-2 ring-emerald-600/20'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    PIN Pengawas Ujian
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  PIN Guru Saat Ini (Otorisasi Keamanan):
                </label>
                <input
                  type="password"
                  value={currentGuruPin}
                  onChange={(e) => {
                    setCurrentGuruPin(e.target.value);
                    setChangePinError(null);
                  }}
                  placeholder="Masukkan PIN Guru saat ini..."
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  PIN Baru untuk {pinRoleToChange === 'guru' ? 'Guru' : 'Pengawas'}:
                </label>
                <input
                  type="password"
                  value={newPinInput}
                  onChange={(e) => {
                    setNewPinInput(e.target.value);
                    setChangePinError(null);
                  }}
                  placeholder="Minimal 4 karakter..."
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>

              {changePinError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{changePinError}</span>
                </div>
              )}

              {changePinSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{changePinSuccess}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowChangePinModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isChangingPin}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isChangingPin && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan PIN Baru</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
