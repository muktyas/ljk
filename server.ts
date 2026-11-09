import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { spawn } from 'child_process';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const ROOT_DIR = process.cwd();
const DEFAULT_CSV = fs.existsSync(path.join(ROOT_DIR, 'kode_siswa.csv'))
  ? 'kode_siswa.csv'
  : 'kode_peserta.csv';

const DEFAULT_KEY = fs.existsSync(path.join(ROOT_DIR, 'kunci_kode_12.txt'))
  ? 'kunci_kode_12.txt'
  : 'kunci_kode.txt';

const SAVED_DIR = path.join(ROOT_DIR, 'hasil_scan');
if (!fs.existsSync(SAVED_DIR)) {
  fs.mkdirSync(SAVED_DIR, { recursive: true });
}

// -------------------------------------------------------------
// AUTH SUBSYSTEM (Option A: Simple Role-Based PIN/Password)
// -------------------------------------------------------------
const AUTH_FILE = path.join(ROOT_DIR, 'auth_config.json');

function getAuthConfig(): { guruPin: string; pengawasPin: string } {
  if (!fs.existsSync(AUTH_FILE)) {
    const defaultConfig = {
      guruPin: 'guru123',
      pengawasPin: 'pengawas123',
    };
    fs.writeFileSync(AUTH_FILE, JSON.stringify(defaultConfig, null, 2), 'utf8');
    return defaultConfig;
  }
  try {
    return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
  } catch {
    return { guruPin: 'guru123', pengawasPin: 'pengawas123' };
  }
}

function saveAuthConfig(config: { guruPin: string; pengawasPin: string }) {
  fs.writeFileSync(AUTH_FILE, JSON.stringify(config, null, 2), 'utf8');
}

interface SessionData {
  role: 'guru' | 'pengawas';
  name: string;
  expiresAt: number;
}

const sessions = new Map<string, SessionData>();

function createSession(role: 'guru' | 'pengawas') {
  const token = crypto.randomBytes(24).toString('hex');
  const name = role === 'guru' ? 'Guru / Administrator' : 'Pengawas Ujian';
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  sessions.set(token, { role, name, expiresAt });

  const permissions =
    role === 'guru'
      ? ['scan', 'students_view', 'students_edit', 'keys_view', 'keys_edit', 'history_view', 'generator', 'pin_manage']
      : ['scan', 'generator'];

  return { token, role, name, permissions, expiresAt };
}

function getSessionFromReq(req: express.Request) {
  let token = '';
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.query.token && typeof req.query.token === 'string') {
    token = req.query.token.trim();
  }
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return { ...session, token };
}

function requireAuth(permission?: string) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const session = getSessionFromReq(req);
    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Sesi masuk tidak valid atau telah berakhir. Harap login terlebih dahulu.',
      });
    }

    if (permission) {
      const isGuru = session.role === 'guru';
      const allowed =
        isGuru || (session.role === 'pengawas' && ['scan', 'generator'].includes(permission));
      if (!allowed) {
        return res.status(403).json({
          success: false,
          error: 'Akses ditolak. Fitur data siswa, kunci jawaban, dan rekap nilai hanya untuk Guru/Admin.',
        });
      }
    }

    (req as any).user = session;
    next();
  };
}

// Auth API Endpoints
app.post('/api/auth/login', (req, res) => {
  const { role, pin } = req.body;
  if (!role || !pin) {
    return res.status(400).json({ success: false, error: 'Pilih peran dan masukkan kata sandi / PIN.' });
  }

  const config = getAuthConfig();
  let isValid = false;

  if (role === 'guru') {
    isValid = String(pin).trim() === config.guruPin;
  } else if (role === 'pengawas') {
    isValid = String(pin).trim() === config.pengawasPin;
  }

  if (!isValid) {
    return res.status(401).json({
      success: false,
      error: `Kata sandi / PIN ${role === 'guru' ? 'Guru' : 'Pengawas'} salah. Silakan periksa kembali.`,
    });
  }

  const session = createSession(role as 'guru' | 'pengawas');
  res.json({ success: true, session });
});

app.get('/api/auth/me', (req, res) => {
  const session = getSessionFromReq(req);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Belum masuk.' });
  }
  const permissions =
    session.role === 'guru'
      ? ['scan', 'students_view', 'students_edit', 'keys_view', 'keys_edit', 'history_view', 'generator', 'pin_manage']
      : ['scan', 'generator'];
  res.json({
    success: true,
    user: {
      role: session.role,
      name: session.name,
      permissions,
      token: session.token,
    },
  });
});

app.post('/api/auth/logout', (req, res) => {
  const session = getSessionFromReq(req);
  if (session) {
    sessions.delete(session.token);
  }
  res.json({ success: true, message: 'Berhasil keluar.' });
});

app.post('/api/auth/change-pin', requireAuth('pin_manage'), (req, res) => {
  try {
    const { roleToChange, oldPin, newPin } = req.body;
    if (!newPin || newPin.trim().length < 4) {
      return res.status(400).json({ success: false, error: 'PIN baru minimal 4 karakter.' });
    }

    const config = getAuthConfig();
    if (oldPin !== config.guruPin) {
      return res.status(400).json({ success: false, error: 'PIN Guru saat ini tidak sesuai.' });
    }

    if (roleToChange === 'guru') {
      config.guruPin = newPin.trim();
    } else if (roleToChange === 'pengawas') {
      config.pengawasPin = newPin.trim();
    } else {
      return res.status(400).json({ success: false, error: 'Peran tidak valid.' });
    }

    saveAuthConfig(config);
    res.json({ success: true, message: `PIN ${roleToChange === 'guru' ? 'Guru' : 'Pengawas'} berhasil diperbarui.` });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    default_csv: DEFAULT_CSV,
    default_key: DEFAULT_KEY,
  });
});

// 2. List available CSV and Key files
app.get('/api/files-list', requireAuth(), (req, res) => {
  try {
    const allFiles = fs.readdirSync(ROOT_DIR);
    const csvFiles = allFiles.filter((f) => f.endsWith('.csv'));
    const keyFiles = allFiles.filter((f) => f.startsWith('kunci_') && f.endsWith('.txt') || f === 'kunci_kode.txt');

    res.json({
      csvFiles,
      keyFiles,
      defaultCsv: DEFAULT_CSV,
      defaultKey: DEFAULT_KEY,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

let lastScanCache: {
  image_base64: string;
  csv_file: string;
  key_file: string;
} | null = null;

// Helper to run python scanner
function runPythonScanner(payloadObj: any, res: express.Response) {
  const payload = JSON.stringify(payloadObj);
  const py = spawn('python3', ['scanner_core.py', 'process']);

  let outputData = '';
  let errorData = '';

  py.stdout.on('data', (chunk) => {
    outputData += chunk.toString();
  });

  py.stderr.on('data', (chunk) => {
    errorData += chunk.toString();
  });

  py.on('close', (code) => {
    if (code !== 0 && !outputData) {
      console.error('Python scanner error:', errorData);
      return res.status(500).json({
        success: false,
        error: errorData || `Scanner gagal dengan kode ${code}`,
      });
    }

    try {
      const parsed = JSON.parse(outputData.trim());
      res.json(parsed);
    } catch (err: any) {
      console.error('JSON parse error from scanner:', outputData);
      res.status(500).json({
        success: false,
        error: 'Gagal membaca respon scanner: ' + err.message,
        raw: outputData.slice(0, 500),
      });
    }
  });

  py.stdin.write(payload);
  py.stdin.end();
}

// 3. Scan image endpoint
app.post('/api/scan', requireAuth('scan'), (req, res) => {
  const {
    image_base64,
    batas = 300,
    csv_file = DEFAULT_CSV,
    key_file = DEFAULT_KEY,
  } = req.body;

  if (!image_base64) {
    return res.status(400).json({ success: false, error: 'Gambar tidak disertakan.' });
  }

  lastScanCache = {
    image_base64,
    csv_file: csv_file || DEFAULT_CSV,
    key_file: key_file || DEFAULT_KEY,
  };

  const csvPath = path.join(ROOT_DIR, csv_file || DEFAULT_CSV);
  const keyPath = path.join(ROOT_DIR, key_file || DEFAULT_KEY);

  runPythonScanner({
    image_base64,
    csv_path: csvPath,
    key_path: keyPath,
    batas: Number(batas) || 300,
  }, res);
});

// 3b. Live re-threshold endpoint for gb_tegak_th & scoring updates
app.post('/api/rethreshold', requireAuth('scan'), (req, res) => {
  const {
    image_base64,
    batas = 300,
    csv_file,
    key_file,
  } = req.body;

  const targetImg = image_base64 || lastScanCache?.image_base64;
  if (!targetImg) {
    return res.status(400).json({
      success: false,
      error: 'Belum ada lembar yang dipindai untuk disesuaikan ambangnya.',
    });
  }

  const targetCsv = csv_file || lastScanCache?.csv_file || DEFAULT_CSV;
  const targetKey = key_file || lastScanCache?.key_file || DEFAULT_KEY;

  const csvPath = path.join(ROOT_DIR, targetCsv);
  const keyPath = path.join(ROOT_DIR, targetKey);

  runPythonScanner({
    image_base64: targetImg,
    csv_path: csvPath,
    key_path: keyPath,
    batas: Number(batas) || 300,
  }, res);
});

// 4. Generate sample or blank printable LJK endpoint
app.post('/api/sample-ljk', requireAuth('generator'), (req, res) => {
  const { student_code = '101', question_code = 11, is_blank = false } = req.body;
  const py = spawn('python3', [
    '-c',
    `
import json, base64, cv2
from generate_test_sheet import create_sample_ljk

if ${is_blank ? 'True' : 'False'}:
    sheet = create_sample_ljk(student_code="", question_code=${question_code}, filled_answers="empty")
else:
    sheet = create_sample_ljk(student_code="${student_code}", question_code=${question_code})

_, buf = cv2.imencode('.jpg', sheet, [cv2.IMWRITE_JPEG_QUALITY, 95])
b64 = base64.b64encode(buf).decode('utf-8')
print(json.dumps({"success": True, "image_base64": "data:image/jpeg;base64," + b64}))
`,
  ]);

  let stdout = '';
  let stderr = '';

  py.stdout.on('data', (d) => (stdout += d.toString()));
  py.stderr.on('data', (d) => (stderr += d.toString()));

  py.on('close', (code) => {
    if (code !== 0) {
      return res.status(500).json({ success: false, error: stderr });
    }
    try {
      const data = JSON.parse(stdout.trim());
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
});

// 5. Get & Update Students (CSV)
app.get('/api/students', requireAuth('students_view'), (req, res) => {
  try {
    const file = (req.query.file as string) || DEFAULT_CSV;
    const filePath = path.join(ROOT_DIR, file);
    if (!fs.existsSync(filePath)) {
      return res.json({ students: [], raw: '', file });
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const lines = raw.trim().split('\n');
    const students = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(',').map((p) => p.trim());
      students.push({
        kode: parts[0] || '',
        nama: parts[1] || '',
        kelas: parts[2] || '',
        nilai: parts[3] !== undefined && parts[3] !== '' ? Number(parts[3]) : null,
      });
    }

    res.json({ students, raw, file });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/students', requireAuth('students_edit'), (req, res) => {
  try {
    const { raw, file = DEFAULT_CSV } = req.body;
    const filePath = path.join(ROOT_DIR, file);
    fs.writeFileSync(filePath, raw, 'utf8');
    res.json({ success: true, message: `Data siswa ${file} berhasil disimpan.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Get & Update Keys (TXT)
app.get('/api/keys', requireAuth('keys_view'), (req, res) => {
  try {
    const file = (req.query.file as string) || DEFAULT_KEY;
    const filePath = path.join(ROOT_DIR, file);
    if (!fs.existsSync(filePath)) {
      return res.json({ raw: '', parsed: {}, file });
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const lines = raw.split('\n');
    const parsed: Record<string, string[]> = {};

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      if (trimmed.includes(':')) {
        const [code, arrStr] = trimmed.split(':', 2);
        try {
          const cleaned = arrStr.replace(/,\s*\]/, ']').trim();
          const list = cleaned
            .replace(/[\[\]]/g, '')
            .split(',')
            .map((s) => s.trim().replace(/['"]/g, ''))
            .filter(Boolean)
            .map((item) => {
              const num = parseInt(item, 10);
              if (!isNaN(num) && num >= 0 && num < 5) {
                return 'ABCDE'[num];
              }
              return item.toUpperCase();
            });
          parsed[code.trim()] = list;
        } catch {}
      }
    }

    res.json({ raw, parsed, file });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/keys', requireAuth('keys_edit'), (req, res) => {
  try {
    const { raw, file = DEFAULT_KEY } = req.body;
    const filePath = path.join(ROOT_DIR, file);
    fs.writeFileSync(filePath, raw, 'utf8');
    res.json({ success: true, message: `Kunci kode ${file} berhasil disimpan.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Save scanned result to disk & CSV
app.post('/api/save-result', requireAuth('scan'), (req, res) => {
  try {
    const {
      image_base64,
      filename,
      kode_peserta,
      nilai,
      kelas,
      csv_file = DEFAULT_CSV,
    } = req.body;

    if (!image_base64 || !filename) {
      return res.status(400).json({ success: false, error: 'Data gambar atau nama berkas tidak lengkap.' });
    }

    const cleanBase64 = image_base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    const sanitizedClass = (kelas || 'UMUM').replace(/[^a-zA-Z0-9_\s-]/g, '').trim() || 'UMUM';
    const classDir = path.join(SAVED_DIR, sanitizedClass);
    if (!fs.existsSync(classDir)) {
      fs.mkdirSync(classDir, { recursive: true });
    }

    const safeFilename = filename.replace(/[^a-zA-Z0-9_\.-]/g, '_');
    const filePath = path.join(classDir, safeFilename);
    fs.writeFileSync(filePath, buffer);

    // Also update student score in CSV
    let updatedInCsv = false;
    const csvPath = path.join(ROOT_DIR, csv_file || DEFAULT_CSV);
    if (kode_peserta && nilai !== undefined && fs.existsSync(csvPath)) {
      const raw = fs.readFileSync(csvPath, 'utf8');
      const lines = raw.trim().split('\n');
      const newLines = lines.map((line, idx) => {
        if (idx === 0) return line;
        const parts = line.split(',').map((p) => p.trim());
        if (parts[0] === String(kode_peserta).trim()) {
          parts[3] = String(nilai);
          updatedInCsv = true;
        }
        return parts.join(',');
      });
      fs.writeFileSync(csvPath, newLines.join('\n') + '\n', 'utf8');
    }

    res.json({
      success: true,
      message: `Gambar ${safeFilename} berhasil disimpan di folder ${sanitizedClass}.`,
      path: filePath,
      updatedInCsv,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Saved results gallery
app.get('/api/saved-results', requireAuth('history_view'), (req, res) => {
  try {
    const list: Array<{ filename: string; kelas: string; path: string; size: number }> = [];
    if (!fs.existsSync(SAVED_DIR)) {
      return res.json({ list });
    }

    const classes = fs.readdirSync(SAVED_DIR);
    for (const cls of classes) {
      const clsPath = path.join(SAVED_DIR, cls);
      if (fs.statSync(clsPath).isDirectory()) {
        const files = fs.readdirSync(clsPath);
        for (const file of files) {
          if (file.endsWith('.png') || file.endsWith('.jpg')) {
            const fpath = path.join(clsPath, file);
            const st = fs.statSync(fpath);
            list.push({
              filename: file,
              kelas: cls,
              path: `/saved_images/${encodeURIComponent(cls)}/${encodeURIComponent(file)}`,
              size: st.size,
            });
          }
        }
      }
    }

    res.json({ list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.use('/saved_images', requireAuth('history_view'), express.static(SAVED_DIR));

// Start server with Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(ROOT_DIR, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Scanner Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
