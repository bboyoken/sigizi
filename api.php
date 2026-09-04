<?php
require_once 'config.php';
session_start();

$action = $_GET['action'] ?? '';
$conn = getConnection();

function respond($data) {
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}

function catatLog($conn, $id_user, $aktivitas) {
    if (!$id_user) return;
    $stmt = $conn->prepare("INSERT INTO log_user (id_user, aktivitas, waktu) VALUES (?, ?, NOW())");
    $stmt->bind_param("is", $id_user, $aktivitas);
    $stmt->execute();
}

function getBody() {
    return json_decode(file_get_contents('php://input'), true) ?? [];
}

switch ($action) {

    // ─── AUTH ────────────────────────────────────────────────────────────────
    case 'login':
        $b = getBody();
        $usn = $conn->real_escape_string($b['username'] ?? '');
        $pass = $conn->real_escape_string($b['password'] ?? '');
        $res = $conn->query("SELECT * FROM users WHERE username='$usn' AND password='$pass'");
        if ($res && $res->num_rows > 0) {
            $row = $res->fetch_assoc();
            $_SESSION['user_id'] = $row['id'];
            $_SESSION['username'] = $row['username'];
            $_SESSION['role'] = $row['role'];
            catatLog($conn, $row['id'], "Login ke dalam sistem ({$row['role']})");
            respond(['success' => true, 'user' => ['id' => $row['id'], 'username' => $row['username'], 'role' => $row['role']]]);
        }
        respond(['success' => false, 'message' => 'Username atau password salah']);

    case 'register':
        $b = getBody();
        $usn = $conn->real_escape_string($b['username'] ?? '');
        $pass = $conn->real_escape_string($b['password'] ?? '');
        if (empty($usn) || empty($pass)) respond(['success' => false, 'message' => 'Username dan password wajib diisi']);
        $chk = $conn->query("SELECT id FROM users WHERE username='$usn'");
        if ($chk->num_rows > 0) respond(['success' => false, 'message' => 'Username sudah digunakan']);
        $conn->query("INSERT INTO users (username, password, role) VALUES ('$usn','$pass','user')");
        respond(['success' => true, 'message' => 'Registrasi berhasil! Silakan login.']);

    case 'logout':
        session_destroy();
        respond(['success' => true]);

    case 'check_session':
        if (!empty($_SESSION['user_id'])) {
            respond(['success' => true, 'user' => ['id' => $_SESSION['user_id'], 'username' => $_SESSION['username'], 'role' => $_SESSION['role']]]);
        }
        respond(['success' => false]);

    // ─── MAKANAN ─────────────────────────────────────────────────────────────
    case 'get_makanan':
        $sort = $_GET['sort'] ?? 'id';
        $dir = $_GET['dir'] ?? 'ASC';
        $allowedSort = ['id_makanan','nama_makanan','kategori','kalori','protein','karbohidrat','lemak'];
        if (!in_array($sort, $allowedSort)) $sort = 'id_makanan';
        $dir = strtoupper($dir) === 'DESC' ? 'DESC' : 'ASC';
        $res = $conn->query("SELECT * FROM makanan ORDER BY $sort $dir");
        $rows = [];
        while ($r = $res->fetch_assoc()) $rows[] = $r;
        respond(['success' => true, 'data' => $rows]);

    case 'get_makanan_by_id':
        $id = intval($_GET['id']);
        $res = $conn->query("SELECT * FROM makanan WHERE id_makanan=$id");
        if ($res->num_rows === 0) respond(['success' => false, 'message' => 'Data tidak ditemukan']);
        respond(['success' => true, 'data' => $res->fetch_assoc()]);

    case 'create_makanan':
        if (empty($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') respond(['success' => false, 'message' => 'Akses ditolak']);
        $b = getBody();
        $nama = $conn->real_escape_string($b['nama_makanan'] ?? '');
        $kat  = $conn->real_escape_string($b['kategori'] ?? '');
        $kal  = floatval($b['kalori'] ?? 0);
        $pro  = floatval($b['protein'] ?? 0);
        $karb = floatval($b['karbohidrat'] ?? 0);
        $lem  = floatval($b['lemak'] ?? 0);
        if (empty($nama) || empty($kat)) respond(['success' => false, 'message' => 'Nama dan kategori wajib diisi']);
        $conn->query("INSERT INTO makanan (nama_makanan,kategori,kalori,protein,karbohidrat,lemak) VALUES ('$nama','$kat',$kal,$pro,$karb,$lem)");
        catatLog($conn, $_SESSION['user_id'], "Menambahkan data makanan baru: $nama");
        respond(['success' => true, 'message' => "Data makanan '$nama' berhasil ditambahkan"]);

    case 'update_makanan':
        if (empty($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') respond(['success' => false, 'message' => 'Akses ditolak']);
        $b = getBody();
        $id   = intval($b['id_makanan']);
        $nama = $conn->real_escape_string($b['nama_makanan'] ?? '');
        $kat  = $conn->real_escape_string($b['kategori'] ?? '');
        $kal  = floatval($b['kalori'] ?? 0);
        $pro  = floatval($b['protein'] ?? 0);
        $karb = floatval($b['karbohidrat'] ?? 0);
        $lem  = floatval($b['lemak'] ?? 0);
        $conn->query("UPDATE makanan SET nama_makanan='$nama',kategori='$kat',kalori=$kal,protein=$pro,karbohidrat=$karb,lemak=$lem WHERE id_makanan=$id");
        catatLog($conn, $_SESSION['user_id'], "Mengubah data makanan ID: $id");
        respond(['success' => true, 'message' => 'Data makanan berhasil diupdate']);

    case 'delete_makanan':
        if (empty($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') respond(['success' => false, 'message' => 'Akses ditolak']);
        $id = intval(getBody()['id'] ?? 0);
        $conn->query("DELETE FROM makanan WHERE id_makanan=$id");
        catatLog($conn, $_SESSION['user_id'], "Menghapus data makanan ID: $id");
        respond(['success' => true, 'message' => 'Data makanan berhasil dihapus']);

    case 'search_makanan':
        $q = $conn->real_escape_string($_GET['q'] ?? '');
        $by = $_GET['by'] ?? 'nama';
        if ($by === 'kalori') {
            $res = $conn->query("SELECT * FROM makanan WHERE kalori=$q");
        } else {
            $res = $conn->query("SELECT * FROM makanan WHERE LOWER(nama_makanan) LIKE LOWER('%$q%')");
        }
        $rows = [];
        while ($r = $res->fetch_assoc()) $rows[] = $r;
        catatLog($conn, $_SESSION['user_id'] ?? 0, "Mencari makanan: $q");
        respond(['success' => true, 'data' => $rows]);

// ─── REQUEST ─────────────────────────────────────────────────────────────
    case 'get_requests':
        if (empty($_SESSION['user_id'])) respond(['success' => false, 'message' => 'Login terlebih dahulu']);
        if ($_SESSION['role'] === 'admin') {
            $res = $conn->query("SELECT r.*, u.username FROM request_user r JOIN users u ON r.id_user=u.id ORDER BY r.id_request DESC");
        } else {
            $uid = $_SESSION['user_id'];
            $res = $conn->query("SELECT r.*, u.username FROM request_user r JOIN users u ON r.id_user=u.id WHERE r.id_user=$uid ORDER BY r.id_request DESC");
        }
        $rows = [];
        while ($r = $res->fetch_assoc()) $rows[] = $r;
        respond(['success' => true, 'data' => $rows]);

    case 'create_request':
        if (empty($_SESSION['user_id'])) respond(['success' => false, 'message' => 'Login terlebih dahulu']);
        $b = getBody();
        $nama = $conn->real_escape_string($b['nama_makanan_req'] ?? '');
        if (empty($nama)) respond(['success' => false, 'message' => 'Nama makanan wajib diisi']);
        $uid = $_SESSION['user_id'];
        $conn->query("INSERT INTO request_user (id_user, nama_makanan_req, status_request) VALUES ($uid,'$nama','Pending')");
        catatLog($conn, $uid, "Mengirim request makanan baru: $nama");
        respond(['success' => true, 'message' => "Request '$nama' berhasil dikirim ke Admin"]);

    case 'konfirmasi_request':
        if (empty($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') respond(['success' => false, 'message' => 'Akses ditolak']);
        $b = getBody();
        $id_req = intval($b['id_request']);
        $aksi = $b['aksi'] ?? '';
        $stat = ($aksi === 'terima') ? 'Diterima' : 'Ditolak';

        // Jika diterima, tambahkan ke makanan
        if ($aksi === 'terima') {
            $nama = $conn->real_escape_string($b['nama_makanan_req'] ?? '');
            $kat  = $conn->real_escape_string($b['kategori'] ?? '');
            $kal  = floatval($b['kalori'] ?? 0);
            $pro  = floatval($b['protein'] ?? 0);
            $karb = floatval($b['karbohidrat'] ?? 0);
            $lem  = floatval($b['lemak'] ?? 0);
            $conn->query("INSERT INTO makanan (nama_makanan,kategori,kalori,protein,karbohidrat,lemak) VALUES ('$nama','$kat',$kal,$pro,$karb,$lem)");
        }

        $conn->query("UPDATE request_user SET status_request='$stat' WHERE id_request=$id_req");
        catatLog($conn, $_SESSION['user_id'], "Konfirmasi request ID $id_req menjadi $stat");
        respond(['success' => true, 'message' => "Request berhasil di-$stat"]);

// ─── LOG ─────────────────────────────────────────────────────────────────
    case 'get_logs':
        if (empty($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') respond(['success' => false, 'message' => 'Akses ditolak']);
        $q = $conn->real_escape_string($_GET['q'] ?? '');
        if ($q) {
            $res = $conn->query("SELECT l.*, u.username FROM log_user l JOIN users u ON l.id_user=u.id WHERE LOWER(l.aktivitas) LIKE LOWER('%$q%') ORDER BY l.waktu DESC");
        } else {
            $res = $conn->query("SELECT l.*, u.username FROM log_user l JOIN users u ON l.id_user=u.id ORDER BY l.waktu DESC LIMIT 100");
        }
        $rows = [];
        while ($r = $res->fetch_assoc()) $rows[] = $r;
        respond(['success' => true, 'data' => $rows]);

    // ─── REKOMENDASI ─────────────────────────────────────────────────────────
    case 'get_rekomendasi':
        $res = $conn->query("SELECT * FROM manajemen_rekomendasi ORDER BY id_rekomendasi");
        $rows = [];
        while ($r = $res->fetch_assoc()) $rows[] = $r;
        respond(['success' => true, 'data' => $rows]);

    case 'get_rekomendasi_bmi':
        $bmi = floatval($_GET['bmi'] ?? 0);
        if ($bmi < 18.5)      $kat = 'Kekurangan Berat Badan (Underweight)';
        elseif ($bmi <= 24.9) $kat = 'Normal (Ideal)';
        elseif ($bmi <= 29.9) $kat = 'Kelebihan Berat Badan (Overweight)';
        else                   $kat = 'Obesitas';
        $k = $conn->real_escape_string($kat);
        $res = $conn->query("SELECT * FROM manajemen_rekomendasi WHERE kategori_bmi LIKE '%$k%' LIMIT 1");
        if ($res->num_rows > 0) respond(['success' => true, 'data' => $res->fetch_assoc(), 'kategori' => $kat]);
        respond(['success' => true, 'data' => null, 'kategori' => $kat]);

    case 'create_rekomendasi':
        if (empty($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') respond(['success' => false, 'message' => 'Akses ditolak']);
        $b = getBody();
        $kat  = $conn->real_escape_string($b['kategori_bmi'] ?? '');
        $saran = $conn->real_escape_string($b['saran_diet'] ?? '');
        if (empty($kat) || empty($saran)) respond(['success' => false, 'message' => 'Semua field wajib diisi']);
        $conn->query("INSERT INTO manajemen_rekomendasi (kategori_bmi, saran_diet) VALUES ('$kat','$saran')");
        respond(['success' => true, 'message' => 'Rekomendasi berhasil ditambahkan']);

    case 'update_rekomendasi':
        if (empty($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') respond(['success' => false, 'message' => 'Akses ditolak']);
        $b = getBody();
        $id   = intval($b['id_rekomendasi']);
        $kat  = $conn->real_escape_string($b['kategori_bmi'] ?? '');
        $saran = $conn->real_escape_string($b['saran_diet'] ?? '');
        $conn->query("UPDATE manajemen_rekomendasi SET kategori_bmi='$kat', saran_diet='$saran' WHERE id_rekomendasi=$id");
        respond(['success' => true, 'message' => 'Rekomendasi berhasil diupdate']);

    case 'delete_rekomendasi':
        if (empty($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') respond(['success' => false, 'message' => 'Akses ditolak']);
        $id = intval(getBody()['id'] ?? 0);
        $conn->query("DELETE FROM manajemen_rekomendasi WHERE id_rekomendasi=$id");
        respond(['success' => true, 'message' => 'Rekomendasi berhasil dihapus']);

    // ─── USERS ───────────────────────────────────────────────────────────────
    case 'get_users':
        if (empty($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') respond(['success' => false, 'message' => 'Akses ditolak']);
        $q = $conn->real_escape_string($_GET['q'] ?? '');
        $res = $conn->query("SELECT id, username, role FROM users WHERE username LIKE '%$q%' ORDER BY id");
        $rows = [];
        while ($r = $res->fetch_assoc()) $rows[] = $r;
        respond(['success' => true, 'data' => $rows]);

    case 'get_stats':
        if (empty($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') respond(['success' => false]);
        $totalMakanan = $conn->query("SELECT COUNT(*) as c FROM makanan")->fetch_assoc()['c'];
        $totalUsers   = $conn->query("SELECT COUNT(*) as c FROM users WHERE role='user'")->fetch_assoc()['c'];
        $totalReq     = $conn->query("SELECT COUNT(*) as c FROM request_user WHERE status_request='Pending'")->fetch_assoc()['c'];
        $totalLogs    = $conn->query("SELECT COUNT(*) as c FROM log_user")->fetch_assoc()['c'];
        respond(['success' => true, 'data' => compact('totalMakanan','totalUsers','totalReq','totalLogs')]);

    default:
        respond(['success' => false, 'message' => "Action '$action' tidak dikenal"]);
}

$conn->close();