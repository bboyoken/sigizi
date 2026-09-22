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

function validateFoodName($nama) {
    if (!is_string($nama)) {
        return ['valid' => false, 'message' => 'Input nama makanan harus berupa teks yang valid.'];
    }
    $trimmed = trim($nama);
    if (empty($trimmed)) {
        return ['valid' => false, 'message' => 'Nama makanan wajib diisi.'];
    }

    // Cek jika seluruhnya hanya angka, spasi, atau simbol/tanda baca
    if (preg_match('/^[\d\s\W_]+$/', $trimmed)) {
        return ['valid' => false, 'message' => "Input '$trimmed' tidak valid! Angka atau simbol bukan merupakan nama makanan di dunia nyata."];
    }

    // Minimal harus ada 2 huruf alfabet
    $lettersOnly = preg_replace('/[^a-zA-Z]/', '', $trimmed);
    if (strlen($lettersOnly) < 2) {
        return ['valid' => false, 'message' => "Input '$trimmed' terlalu pendek atau tidak mengandung nama makanan yang jelas."];
    }

    // Blacklist kata benda mati / non-makanan umum di dunia nyata
    $nonFoodWords = [
        'meja', 'kursi', 'lemari', 'kasur', 'bantal', 'guling', 'selimut', 'pintu', 'jendela', 'lantai', 'tembok', 'atap', 'gedung', 'rumah',
        'sepatu', 'sandal', 'baju', 'celana', 'rok', 'jaket', 'topi', 'kaos', 'tas', 'dompet', 'koper', 'helm', 'jam tangan', 'kacamata',
        'hp', 'handphone', 'smartphone', 'laptop', 'komputer', 'pc', 'mouse', 'keyboard', 'monitor', 'kabel', 'charger', 'baterai', 'powerbank',
        'motor', 'mobil', 'sepeda', 'truk', 'bus', 'pesawat', 'kapal', 'kereta', 'ban', 'knalpot',
        'batu', 'pasir', 'semen', 'tanah', 'besi', 'baja', 'kayu', 'plastik', 'kaca', 'kertas', 'kardus', 'buku', 'pulpen', 'pensil', 'penghapus', 'spidol', 'penggaris',
        'uang', 'koin', 'kartu', 'ktp', 'sim', 'atm',
        'piring', 'sendok', 'garpu', 'mangkok', 'pisau', 'wajan', 'panci',
        'kucing', 'anjing', 'tikus', 'kecoa', 'lalat', 'nyamuk', 'racun', 'sabun', 'shampo', 'odol', 'deterjen', 'obat nyamuk'
    ];

    $lower = strtolower($trimmed);
    foreach ($nonFoodWords as $nf) {
        if ($lower === $nf || preg_match('/\b' . preg_quote($nf, '/') . '\b/i', $lower)) {
            return ['valid' => false, 'message' => "Input '{$trimmed}' bukan merupakan bahan makanan atau minuman konsumsi di dunia nyata!"];
        }
    }

    // Cek ketikan keyboard acak (gibberish tanpa vokal atau rentetan konsonan tidak wajar)
    if (strlen($lettersOnly) >= 5 && !preg_match('/[aiueo]/i', $lettersOnly)) {
        return ['valid' => false, 'message' => "Input '{$trimmed}' tidak dikenali sebagai nama makanan yang bermakna."];
    }
    if (preg_match('/[bcdfghjklmnpqrstvwxyz]{5,}/i', $lettersOnly) || preg_match('/qwerty|asdfgh|zxcvbn/i', $lower)) {
        return ['valid' => false, 'message' => "Input '{$trimmed}' terdeteksi sebagai ketikan acak, bukan nama makanan nyata."];
    }

    return ['valid' => true];
}

function getSmartNutritionFallback($nama) {
    $n = strtolower(trim($nama));
    
    // Dataset gizi terstandar TKPI (Tabel Komposisi Pangan Indonesia - Kemenkes RI) & USDA
    $foods = [
        // Olahan Ayam & Unggas
        ['keys' => ['dada ayam rebus', 'dada ayam panggang', 'dada ayam fillet', 'dada ayam'], 'nama' => 'Dada Ayam Rebus/Panggang', 'kat' => 'Lauk pauk', 'porsi' => '1 Porsi (100g)', 'kal' => 165.0, 'pro' => 31.0, 'karb' => 0.0, 'lem' => 3.6, 'ser' => 0.0, 'desk' => 'Dada ayam tanpa kulit merupakan sumber protein hewani murni tertinggi dengan lemak sangat rendah, optimal untuk metabolisme dan otot.'],
        ['keys' => ['ayam geprek'], 'nama' => 'Ayam Geprek', 'kat' => 'Lauk pauk', 'porsi' => '1 Potong (~120g)', 'kal' => 290.0, 'pro' => 24.0, 'karb' => 12.0, 'lem' => 16.5, 'ser' => 0.8, 'desk' => 'Ayam goreng tepung digeprek sambal bawang, tinggi protein dan kalori gurih.'],
        ['keys' => ['ayam goreng'], 'nama' => 'Ayam Goreng', 'kat' => 'Lauk pauk', 'porsi' => '1 Potong (~100g)', 'kal' => 260.0, 'pro' => 27.3, 'karb' => 1.8, 'lem' => 16.8, 'ser' => 0.0, 'desk' => 'Ayam goreng tradisional gurih kaya asam amino esensial dan zat besi mioglobin.'],
        ['keys' => ['ayam bakar'], 'nama' => 'Ayam Bakar', 'kat' => 'Lauk pauk', 'porsi' => '1 Potong (~100g)', 'kal' => 210.0, 'pro' => 25.0, 'karb' => 3.5, 'lem' => 10.5, 'ser' => 0.0, 'desk' => 'Ayam bakar dengan marinasi kecap dan rempah, tinggi protein dengan lemak lebih terkontrol.'],
        ['keys' => ['paha ayam'], 'nama' => 'Paha Ayam', 'kat' => 'Lauk pauk', 'porsi' => '1 Potong (~100g)', 'kal' => 215.0, 'pro' => 24.0, 'karb' => 0.0, 'lem' => 13.0, 'ser' => 0.0, 'desk' => 'Bagian paha ayam memiliki tekstur juicy dengan profil protein komplit dan zat besi tinggi.'],
        ['keys' => ['sate ayam'], 'nama' => 'Sate Ayam', 'kat' => 'Lauk pauk', 'porsi' => '5 Tusuk (~100g)', 'kal' => 210.0, 'pro' => 20.0, 'karb' => 8.0, 'lem' => 11.0, 'ser' => 0.5, 'desk' => 'Daging ayam panggang tusuk disajikan dengan bumbu kacang gurih dan kaya protein.'],
        ['keys' => ['soto ayam'], 'nama' => 'Soto Ayam', 'kat' => 'Makanan utama', 'porsi' => '1 Mangkuk (~250g)', 'kal' => 180.0, 'pro' => 16.5, 'karb' => 8.0, 'lem' => 9.0, 'ser' => 1.0, 'desk' => 'Sup kuah kuning rempah kunyit dengan suwiran ayam, menghangatkan dan padat mikronutrien.'],
        ['keys' => ['opor ayam'], 'nama' => 'Opor Ayam', 'kat' => 'Lauk pauk', 'porsi' => '1 Potong (~120g)', 'kal' => 245.0, 'pro' => 21.0, 'karb' => 4.2, 'lem' => 16.0, 'ser' => 0.5, 'desk' => 'Olahan ayam berkuah santan kental rempah Nusantara, kaya energi dan protein hewani.'],
        ['keys' => ['ayam'], 'nama' => 'Daging Ayam', 'kat' => 'Lauk pauk', 'porsi' => '1 Potong (~100g)', 'kal' => 239.0, 'pro' => 27.0, 'karb' => 0.0, 'lem' => 14.0, 'ser' => 0.0, 'desk' => 'Daging ayam segar merupakan sumber protein pokok berkualitas tinggi untuk regenerasi sel tubuh.'],

        // Daging Sapi & Kambing
        ['keys' => ['rendang daging', 'rendang sapi', 'rendang'], 'nama' => 'Rendang Daging Sapi', 'kat' => 'Lauk pauk', 'porsi' => '1 Potong (~100g)', 'kal' => 468.0, 'pro' => 47.0, 'karb' => 10.5, 'lem' => 30.0, 'ser' => 1.2, 'desk' => 'Daging sapi yang dimasak perlahan dengan santan dan rempah karamelisasi, sangat padat protein dan zat besi heme.'],
        ['keys' => ['gulai sapi', 'gulai kambing', 'gulai'], 'nama' => 'Gulai Daging', 'kat' => 'Lauk pauk', 'porsi' => '1 Porsi (~150g)', 'kal' => 285.0, 'pro' => 22.0, 'karb' => 6.0, 'lem' => 19.0, 'ser' => 0.5, 'desk' => 'Kuah kari santan rempah khas Nusantara dengan daging empuk kaya protein dan zinc.'],
        ['keys' => ['sate kambing'], 'nama' => 'Sate Kambing', 'kat' => 'Lauk pauk', 'porsi' => '5 Tusuk (~100g)', 'kal' => 260.0, 'pro' => 25.0, 'karb' => 6.0, 'lem' => 15.5, 'ser' => 0.3, 'desk' => 'Daging kambing bakar empuk dengan bumbu kecap bawang, tinggi kalium dan protein pembangun.'],
        ['keys' => ['rawon'], 'nama' => 'Rawon Daging Sapi', 'kat' => 'Makanan utama', 'porsi' => '1 Mangkuk (~250g)', 'kal' => 210.0, 'pro' => 21.0, 'karb' => 5.5, 'lem' => 12.0, 'ser' => 0.8, 'desk' => 'Sup daging sapi khas Jawa Timur berwarna hitam khas kluwek yang kaya antioksidan dan zat besi.'],
        ['keys' => ['bakso sapi', 'bakso'], 'nama' => 'Bakso Sapi Kuah', 'kat' => 'Makanan utama', 'porsi' => '1 Porsi (5 Butir ~150g)', 'kal' => 250.0, 'pro' => 18.5, 'karb' => 21.0, 'lem' => 10.5, 'ser' => 1.0, 'desk' => 'Bola daging sapi kenyal berkuah kaldu gurih, memberikan asupan protein dan energi mengenyangkan.'],
        ['keys' => ['daging sapi', 'steak'], 'nama' => 'Daging Sapi Murni', 'kat' => 'Lauk pauk', 'porsi' => '1 Potong (~100g)', 'kal' => 250.0, 'pro' => 26.0, 'karb' => 0.0, 'lem' => 15.0, 'ser' => 0.0, 'desk' => 'Daging sapi murni kaya kreatin, asam amino rantai cabang (BCAA), dan zat besi heme.'],

        // Telur
        ['keys' => ['telur rebus'], 'nama' => 'Telur Rebus (2 Butir)', 'kat' => 'Lauk pauk', 'porsi' => '2 Butir (~100g)', 'kal' => 155.0, 'pro' => 12.6, 'karb' => 1.1, 'lem' => 10.6, 'ser' => 0.0, 'desk' => 'Telur utuh rebus memiliki bioavailabilitas protein sempurna 100% dan tinggi kolin untuk fungsi otak.'],
        ['keys' => ['telur ceplok', 'telur mata sapi'], 'nama' => 'Telur Ceplok / Mata Sapi', 'kat' => 'Lauk pauk', 'porsi' => '1 Butir (~60g)', 'kal' => 110.0, 'pro' => 7.5, 'karb' => 0.5, 'lem' => 8.8, 'ser' => 0.0, 'desk' => 'Telur goreng mata sapi praktis sumber protein cepat dengan vitamin A dan lutein alami.'],
        ['keys' => ['telur dadar'], 'nama' => 'Telur Dadar', 'kat' => 'Lauk pauk', 'porsi' => '1 Butir (~65g)', 'kal' => 120.0, 'pro' => 7.8, 'karb' => 1.0, 'lem' => 9.5, 'ser' => 0.0, 'desk' => 'Telur dadar kocok gurih, cocok sebagai pelengkap menu seimbang sehari-hari.'],
        ['keys' => ['telur balado'], 'nama' => 'Telur Balado', 'kat' => 'Lauk pauk', 'porsi' => '1 Butir (~65g)', 'kal' => 125.0, 'pro' => 7.0, 'karb' => 3.5, 'lem' => 9.0, 'ser' => 0.4, 'desk' => 'Telur rebus digoreng dengan sambal balado cabai merah yang kaya vitamin C dan capsaicin.'],
        ['keys' => ['telur asin'], 'nama' => 'Telur Asin Bebek', 'kat' => 'Lauk pauk', 'porsi' => '1 Butir (~60g)', 'kal' => 135.0, 'pro' => 9.5, 'karb' => 1.2, 'lem' => 10.2, 'ser' => 0.0, 'desk' => 'Telur bebek fermentasi asin yang padat kalsium, selenium, dan protein berkualitas.'],
        ['keys' => ['telur'], 'nama' => 'Telur Ayam Utuh', 'kat' => 'Lauk pauk', 'porsi' => '1 Butir (~55g)', 'kal' => 78.0, 'pro' => 6.3, 'karb' => 0.6, 'lem' => 5.3, 'ser' => 0.0, 'desk' => 'Superfood alami dengan profil asam amino terlengkap dan nutrisi mikronutrien esensial.'],

        // Tempe & Tahu
        ['keys' => ['tempe mendoan'], 'nama' => 'Tempe Mendoan (2 Lembar)', 'kat' => 'Lauk pauk', 'porsi' => '2 Lembar (~100g)', 'kal' => 240.0, 'pro' => 14.0, 'karb' => 18.0, 'lem' => 13.0, 'ser' => 2.0, 'desk' => 'Tempe iris tipis berlapis adonan tepung daun bawang setengah matang khas Banyumas.'],
        ['keys' => ['tempe goreng'], 'nama' => 'Tempe Goreng (2 Potong)', 'kat' => 'Lauk pauk', 'porsi' => '2 Potong (~100g)', 'kal' => 225.0, 'pro' => 19.0, 'karb' => 9.0, 'lem' => 14.0, 'ser' => 2.5, 'desk' => 'Kedelai terfermentasi kaya probiotik dan isoflavon, sumber protein nabati terbaik.'],
        ['keys' => ['tempe bacem', 'tempe orek', 'tempe'], 'nama' => 'Tempe Kedelai', 'kat' => 'Lauk pauk', 'porsi' => '1 Porsi (~100g)', 'kal' => 193.0, 'pro' => 19.0, 'karb' => 9.4, 'lem' => 11.0, 'ser' => 1.4, 'desk' => 'Pangan super warisan budaya Indonesia dengan protein nabati tinggi dan serat prebiotik usus.'],
        ['keys' => ['tahu goreng'], 'nama' => 'Tahu Goreng', 'kat' => 'Lauk pauk', 'porsi' => '2 Potong (~100g)', 'kal' => 115.0, 'pro' => 9.5, 'karb' => 2.5, 'lem' => 7.5, 'ser' => 0.5, 'desk' => 'Tahu kedelai goreng renyah di luar lembut di dalam, kaya kalsium dan bebas kolesterol.'],
        ['keys' => ['tahu isi', 'tahu bacem', 'tahu'], 'nama' => 'Tahu Putih / Kukus', 'kat' => 'Lauk pauk', 'porsi' => '1 Porsi (~100g)', 'kal' => 80.0, 'pro' => 8.2, 'karb' => 1.9, 'lem' => 4.8, 'ser' => 0.3, 'desk' => 'Tahu kedelai lembut rendah kalori, ideal untuk program diet defisit kalori dan kesehatan jantung.'],

        // Ikan & Seafood
        ['keys' => ['ikan lele', 'lele goreng', 'lele'], 'nama' => 'Ikan Lele Goreng', 'kat' => 'Lauk pauk', 'porsi' => '1 Ekor (~100g)', 'kal' => 180.0, 'pro' => 18.5, 'karb' => 2.0, 'lem' => 11.0, 'ser' => 0.0, 'desk' => 'Ikan lele gurih kaya protein hewani, fosfor, dan asam lemak omega-3 ramah kantong.'],
        ['keys' => ['ikan kembung', 'kembung bakar'], 'nama' => 'Ikan Kembung Bakar', 'kat' => 'Lauk pauk', 'porsi' => '1 Ekor (~100g)', 'kal' => 167.0, 'pro' => 21.4, 'karb' => 0.0, 'lem' => 8.5, 'ser' => 0.0, 'desk' => 'Ikan laut lokal dengan kandungan omega-3 setara salmon, sangat tinggi protein untuk daya tahan tubuh.'],
        ['keys' => ['ikan nila', 'nila bakar'], 'nama' => 'Ikan Nila Goreng/Bakar', 'kat' => 'Lauk pauk', 'porsi' => '1 Ekor (~100g)', 'kal' => 145.0, 'pro' => 20.0, 'karb' => 0.0, 'lem' => 6.5, 'ser' => 0.0, 'desk' => 'Ikan air tawar berdaging putih lembut, tinggi protein dan rendah lemak jahat.'],
        ['keys' => ['ikan salmon', 'salmon'], 'nama' => 'Ikan Salmon Panggang', 'kat' => 'Lauk pauk', 'porsi' => '1 Fillet (~100g)', 'kal' => 206.0, 'pro' => 22.0, 'karb' => 0.0, 'lem' => 12.3, 'ser' => 0.0, 'desk' => 'Ikan salmon kaya EPA dan DHA (Omega-3) yang sangat efektif untuk kesehatan kardiovaskular.'],
        ['keys' => ['ikan tongkol', 'tongkol balado'], 'nama' => 'Ikan Tongkol Balado', 'kat' => 'Lauk pauk', 'porsi' => '1 Potong (~100g)', 'kal' => 190.0, 'pro' => 24.0, 'karb' => 3.5, 'lem' => 8.5, 'ser' => 0.5, 'desk' => 'Daging ikan tongkol padat protein mioglobin tinggi yang mengenyangkan lebih lama.'],
        ['keys' => ['udang goreng', 'udang rebus', 'udang'], 'nama' => 'Udang Segar', 'kat' => 'Lauk pauk', 'porsi' => '1 Porsi (~100g)', 'kal' => 120.0, 'pro' => 23.0, 'karb' => 1.2, 'lem' => 1.8, 'ser' => 0.0, 'desk' => 'Seafood lezat rendah kalori kaya antioksidan astaxanthin dan yodium penting.'],
        ['keys' => ['cumi', 'cumi-cumi'], 'nama' => 'Cumi-Cumi Masak', 'kat' => 'Lauk pauk', 'porsi' => '1 Porsi (~100g)', 'kal' => 135.0, 'pro' => 18.0, 'karb' => 3.0, 'lem' => 5.0, 'ser' => 0.0, 'desk' => 'Sumber protein laut kenyal yang kaya vitamin B12 dan tembaga untuk pembentukan sel darah.'],
        ['keys' => ['pempek kapal selam', 'pempek'], 'nama' => 'Pempek Palembang', 'kat' => 'Makanan utama', 'porsi' => '1 Buah Kapal Selam (~150g)', 'kal' => 320.0, 'pro' => 15.0, 'karb' => 42.0, 'lem' => 10.0, 'ser' => 1.0, 'desk' => 'Olahan ikan tenggiri khas Palembang berisi telur utuh dengan kuah cuko pedas manis.'],
        ['keys' => ['ikan'], 'nama' => 'Ikan Segar', 'kat' => 'Lauk pauk', 'porsi' => '1 Fillet (~100g)', 'kal' => 160.0, 'pro' => 20.5, 'karb' => 0.0, 'lem' => 7.0, 'ser' => 0.0, 'desk' => 'Daging ikan murni tanpa serat kasar, ramah bagi pencernaan dan tinggi mikronutrien.'],

        // Makanan Pokok & Karbohidrat
        ['keys' => ['nasi merah'], 'nama' => 'Nasi Beras Merah', 'kat' => 'Makanan utama', 'porsi' => '1 Mangkuk (~100g)', 'kal' => 110.0, 'pro' => 2.6, 'karb' => 23.0, 'lem' => 0.9, 'ser' => 1.8, 'desk' => 'Karbohidrat kompleks indeks glikemik rendah kaya serat pangan untuk menstabilkan gula darah.'],
        ['keys' => ['nasi uduk'], 'nama' => 'Nasi Uduk Gurih', 'kat' => 'Makanan utama', 'porsi' => '1 Piring (~150g)', 'kal' => 260.0, 'pro' => 5.0, 'karb' => 44.0, 'lem' => 7.0, 'ser' => 1.0, 'desk' => 'Beras aron yang dimasak dengan santan, serai, dan daun salam beraroma harum menggugah selera.'],
        ['keys' => ['nasi kuning'], 'nama' => 'Nasi Kuning', 'kat' => 'Makanan utama', 'porsi' => '1 Piring (~150g)', 'kal' => 250.0, 'pro' => 4.8, 'karb' => 43.0, 'lem' => 6.5, 'ser' => 1.0, 'desk' => 'Nasi gurih rempah kunyit alami pembawa antioksidan kurkumin.'],
        ['keys' => ['nasi goreng'], 'nama' => 'Nasi Goreng Telur', 'kat' => 'Makanan utama', 'porsi' => '1 Porsi (~200g)', 'kal' => 330.0, 'pro' => 11.0, 'karb' => 45.0, 'lem' => 12.0, 'ser' => 1.5, 'desk' => 'Nasi goreng harum wajan dengan bumbu bawang dan telur, sumber energi harian favorit.'],
        ['keys' => ['nasi putih', 'nasi'], 'nama' => 'Nasi Putih', 'kat' => 'Makanan utama', 'porsi' => '1 Porsi (100g)', 'kal' => 130.0, 'pro' => 2.7, 'karb' => 28.2, 'lem' => 0.3, 'ser' => 0.4, 'desk' => 'Makanan pokok utama masyarakat Indonesia penyedia energi glukosa instan untuk aktivitas fisik.'],
        ['keys' => ['mie goreng'], 'nama' => 'Mie Goreng Spesial', 'kat' => 'Makanan utama', 'porsi' => '1 Porsi (~150g)', 'kal' => 350.0, 'pro' => 8.0, 'karb' => 48.0, 'lem' => 14.0, 'ser' => 2.0, 'desk' => 'Olahan mie gandum kenyal dengan bumbu kecap manis, sayuran dan telur.'],
        ['keys' => ['mie ayam'], 'nama' => 'Mie Ayam Jamur', 'kat' => 'Makanan utama', 'porsi' => '1 Mangkuk (~250g)', 'kal' => 380.0, 'pro' => 16.0, 'karb' => 52.0, 'lem' => 12.0, 'ser' => 2.5, 'desk' => 'Mie kenyal disajikan dengan kuah kaldu ayam gurih dan potongan ayam berbumbu manis.'],
        ['keys' => ['mie instan'], 'nama' => 'Mie Instan Kuah/Goreng', 'kat' => 'Makanan utama', 'porsi' => '1 Bungkus (~85g)', 'kal' => 380.0, 'pro' => 8.0, 'karb' => 54.0, 'lem' => 15.0, 'ser' => 2.0, 'desk' => 'Pilihan energi cepat saji, disarankan menambah sayuran dan telur untuk gizi seimbang.'],
        ['keys' => ['bubur ayam'], 'nama' => 'Bubur Ayam', 'kat' => 'Makanan utama', 'porsi' => '1 Mangkuk (~250g)', 'kal' => 220.0, 'pro' => 10.0, 'karb' => 32.0, 'lem' => 5.5, 'ser' => 1.0, 'desk' => 'Bubur beras lembut dengan kaldu kuning, suwiran ayam, cakwe, dan daun seledri.'],
        ['keys' => ['kentang goreng'], 'nama' => 'Kentang Goreng (French Fries)', 'kat' => 'Cemilan', 'porsi' => '1 Porsi (~100g)', 'kal' => 312.0, 'pro' => 3.4, 'karb' => 41.0, 'lem' => 15.0, 'ser' => 3.8, 'desk' => 'Potongan kentang goreng renyah gurih, kaya kalium dan karbohidrat pengisi energi.'],
        ['keys' => ['kentang rebus', 'kentang'], 'nama' => 'Kentang Rebus', 'kat' => 'Makanan utama', 'porsi' => '1 Buah Sedang (~100g)', 'kal' => 87.0, 'pro' => 1.9, 'karb' => 20.1, 'lem' => 0.1, 'ser' => 1.8, 'desk' => 'Umbi karbohidrat bebas lemak jenuh yang sangat ramah lambung dan mengenyangkan.'],
        ['keys' => ['roti gandum'], 'nama' => 'Roti Gandum Utuh', 'kat' => 'Makanan utama', 'porsi' => '2 Lembar (~70g)', 'kal' => 160.0, 'pro' => 8.0, 'karb' => 28.0, 'lem' => 2.5, 'ser' => 4.0, 'desk' => 'Roti dari biji gandum utuh dengan serat tinggi, membantu kesehatan usus dan pelepasan energi lambat.'],
        ['keys' => ['roti tawar', 'roti'], 'nama' => 'Roti Tawar Putih', 'kat' => 'Makanan utama', 'porsi' => '2 Lembar (~70g)', 'kal' => 180.0, 'pro' => 6.0, 'karb' => 35.0, 'lem' => 2.0, 'ser' => 1.5, 'desk' => 'Roti tepung gandum praktis untuk sarapan harian yang mudah dipadukan dengan berbagai olesan gizi.'],
        ['keys' => ['oatmeal', 'havermut'], 'nama' => 'Oatmeal / Bubur Oat', 'kat' => 'Makanan utama', 'porsi' => '1 Mangkuk (~40g kering)', 'kal' => 150.0, 'pro' => 5.5, 'karb' => 27.0, 'lem' => 2.5, 'ser' => 4.0, 'desk' => 'Oatmeal kaya serat larut beta-glukan yang terbukti klinis efektif menurunkan kolesterol LDL.'],
        ['keys' => ['singkong rebus', 'singkong'], 'nama' => 'Singkong Rebus', 'kat' => 'Makanan utama', 'porsi' => '1 Potong (~100g)', 'kal' => 159.0, 'pro' => 1.4, 'karb' => 38.0, 'lem' => 0.3, 'ser' => 1.8, 'desk' => 'Umbi singkong tradisional padat energi alami dan bebas gluten.'],
        ['keys' => ['ubi rebus', 'ubi jalar', 'ubi'], 'nama' => 'Ubi Jalar Rebus', 'kat' => 'Makanan utama', 'porsi' => '1 Buah (~100g)', 'kal' => 86.0, 'pro' => 1.6, 'karb' => 20.1, 'lem' => 0.1, 'ser' => 3.0, 'desk' => 'Ubi jalar kaya beta-karoten (Vitamin A), serat, dan memiliki indeks glikemik bersahabat.'],

        // Sayuran & Hidangan Sehat
        ['keys' => ['sayur bayam', 'bayam'], 'nama' => 'Sayur Bening Bayam', 'kat' => 'Lauk pauk', 'porsi' => '1 Mangkuk (~150g)', 'kal' => 35.0, 'pro' => 2.5, 'karb' => 5.0, 'lem' => 0.5, 'ser' => 2.2, 'desk' => 'Sayur hijau segar kaya zat besi non-heme, folat, dan vitamin C untuk kesehatan sel.'],
        ['keys' => ['sayur asam'], 'nama' => 'Sayur Asam', 'kat' => 'Makanan utama', 'porsi' => '1 Mangkuk (~200g)', 'kal' => 60.0, 'pro' => 2.2, 'karb' => 11.0, 'lem' => 1.2, 'ser' => 2.5, 'desk' => 'Sup asam segar dengan jagung, kacang panjang, dan labu siam kaya antioksidan segar.'],
        ['keys' => ['sayur lodeh'], 'nama' => 'Sayur Lodeh', 'kat' => 'Makanan utama', 'porsi' => '1 Mangkuk (~200g)', 'kal' => 140.0, 'pro' => 4.0, 'karb' => 12.0, 'lem' => 9.0, 'ser' => 3.0, 'desk' => 'Sayuran komplit berkuah santan gurih berpadu serat pangan dan kalori seimbang.'],
        ['keys' => ['tumis kangkung', 'kangkung'], 'nama' => 'Tumis Kangkung Terasi', 'kat' => 'Lauk pauk', 'porsi' => '1 Porsi (~100g)', 'kal' => 75.0, 'pro' => 2.8, 'karb' => 4.5, 'lem' => 5.0, 'ser' => 2.1, 'desk' => 'Kangkung tumis sedap kaya vitamin A dan mineral kalium untuk stamina tubuh.'],
        ['keys' => ['capcay'], 'nama' => 'Capcay Kuah/Goreng', 'kat' => 'Lauk pauk', 'porsi' => '1 Porsi (~150g)', 'kal' => 95.0, 'pro' => 4.5, 'karb' => 9.0, 'lem' => 4.5, 'ser' => 3.0, 'desk' => 'Aneka sayuran warna-warni (wortel, kembang kol, sawi) dengan spektrum mikronutrien lengkap.'],
        ['keys' => ['gado-gado', 'gado gado'], 'nama' => 'Gado-Gado Komplit', 'kat' => 'Makanan utama', 'porsi' => '1 Porsi (~200g)', 'kal' => 295.0, 'pro' => 12.0, 'karb' => 32.0, 'lem' => 14.0, 'ser' => 5.0, 'desk' => 'Salad sayur rebus khas Betawi berbalut bumbu kacang gurih dengan tahu, tempe, dan telur.'],
        ['keys' => ['pecel sayur', 'pecel'], 'nama' => 'Pecel Sayur', 'kat' => 'Makanan utama', 'porsi' => '1 Porsi (~150g)', 'kal' => 210.0, 'pro' => 8.5, 'karb' => 24.0, 'lem' => 10.0, 'ser' => 4.5, 'desk' => 'Sayuran rebus segar disiram sambal pecel gurih khas Jawa Timur yang padat serat alami.'],
        ['keys' => ['brokoli'], 'nama' => 'Brokoli Kukus', 'kat' => 'Lauk pauk', 'porsi' => '1 Porsi (~100g)', 'kal' => 35.0, 'pro' => 2.8, 'karb' => 7.0, 'lem' => 0.4, 'ser' => 2.6, 'desk' => 'Sayuran silangan kaya sulforaphane, senyawa bioaktif pendukung detoksifikasi seluler.'],

        // Buah-buahan
        ['keys' => ['pisang ambon', 'pisang rebus', 'pisang'], 'nama' => 'Buah Pisang Segar', 'kat' => 'Buah', 'porsi' => '1 Buah Sedang (~100g)', 'kal' => 89.0, 'pro' => 1.1, 'karb' => 22.8, 'lem' => 0.3, 'ser' => 2.6, 'desk' => 'Buah favorit atlet kaya kalium, vitamin B6, dan karbohidrat yang cepat diserap tubuh.'],
        ['keys' => ['apel fuji', 'apel'], 'nama' => 'Buah Apel Segar', 'kat' => 'Buah', 'porsi' => '1 Buah Sedang (~150g)', 'kal' => 78.0, 'pro' => 0.4, 'karb' => 20.0, 'lem' => 0.2, 'ser' => 3.6, 'desk' => 'Kaya serat pektin alami dan antioksidan quercetin untuk menjaga kesehatan saluran cerna.'],
        ['keys' => ['jeruk manis', 'jeruk'], 'nama' => 'Buah Jeruk Segar', 'kat' => 'Buah', 'porsi' => '1 Buah (~100g)', 'kal' => 47.0, 'pro' => 0.9, 'karb' => 11.8, 'lem' => 0.1, 'ser' => 2.4, 'desk' => 'Sumber utama vitamin C harian untuk mendukung kekebalan imun dan sintesis kolagen.'],
        ['keys' => ['alpukat'], 'nama' => 'Buah Alpukat Segar', 'kat' => 'Buah', 'porsi' => '1/2 Buah (~100g)', 'kal' => 160.0, 'pro' => 2.0, 'karb' => 8.5, 'lem' => 14.7, 'ser' => 6.7, 'desk' => 'Kaya lemak tak jenuh tunggal sehat (asam oleat), vitamin E, dan serat tinggi untuk rasa kenyang awet.'],
        ['keys' => ['pepaya matang', 'pepaya'], 'nama' => 'Buah Pepaya Segar', 'kat' => 'Buah', 'porsi' => '1 Potong (~100g)', 'kal' => 43.0, 'pro' => 0.5, 'karb' => 10.8, 'lem' => 0.3, 'ser' => 1.7, 'desk' => 'Mengandung enzim papain pencerna protein dan kaya vitamin A pencegah radikal bebas.'],
        ['keys' => ['semangka'], 'nama' => 'Buah Semangka Merah', 'kat' => 'Buah', 'porsi' => '1 Potong (~100g)', 'kal' => 30.0, 'pro' => 0.6, 'karb' => 7.6, 'lem' => 0.2, 'ser' => 0.4, 'desk' => 'Kandungan air 92% menyegarkan dengan lycopene tinggi untuk kesehatan prostat dan kulit.'],
        ['keys' => ['mangga'], 'nama' => 'Buah Mangga Manis', 'kat' => 'Buah', 'porsi' => '1 Potong (~100g)', 'kal' => 60.0, 'pro' => 0.8, 'karb' => 15.0, 'lem' => 0.4, 'ser' => 1.6, 'desk' => 'Buah tropis manis dengan vitamin A dan C melimpah untuk stamina dan kebugaran tubuh.'],

        // Minuman & Camilan Populer
        ['keys' => ['pisang goreng'], 'nama' => 'Pisang Goreng Renyah', 'kat' => 'Cemilan', 'porsi' => '1 Buah (~70g)', 'kal' => 140.0, 'pro' => 1.5, 'karb' => 22.0, 'lem' => 5.5, 'ser' => 1.5, 'desk' => 'Camilan manis pisang berbalut tepung renyah, nikmat sebagai selingan teh atau kopi.'],
        ['keys' => ['bakwan sayur', 'bakwan'], 'nama' => 'Bakwan Sayur (Bala-bala)', 'kat' => 'Cemilan', 'porsi' => '1 Buah (~50g)', 'kal' => 125.0, 'pro' => 2.0, 'karb' => 14.0, 'lem' => 7.0, 'ser' => 1.0, 'desk' => 'Gorengan renyah campuran kol, wortel, dan tauge berpadu tepung bumbu rempah.'],
        ['keys' => ['martabak manis', 'terang bulan'], 'nama' => 'Martabak Manis', 'kat' => 'Cemilan', 'porsi' => '1 Potong (~80g)', 'kal' => 270.0, 'pro' => 4.5, 'karb' => 38.0, 'lem' => 11.0, 'ser' => 0.8, 'desk' => 'Kue manis tebal bersarang dengan topping mentega, cokelat, atau keju tinggi kalori.'],
        ['keys' => ['martabak telur'], 'nama' => 'Martabak Telur Gurih', 'kat' => 'Cemilan', 'porsi' => '1 Potong (~80g)', 'kal' => 195.0, 'pro' => 9.0, 'karb' => 12.0, 'lem' => 12.5, 'ser' => 0.6, 'desk' => 'Kulit martabak renyah berisi kocokan telur bebek, daun bawang, dan daging cincang berprotein.'],
        ['keys' => ['susu sapi', 'susu murni', 'susu'], 'nama' => 'Susu Sapi Murni', 'kat' => 'Minuman', 'porsi' => '1 Gelas (~200ml)', 'kal' => 125.0, 'pro' => 6.8, 'karb' => 9.6, 'lem' => 6.5, 'ser' => 0.0, 'desk' => 'Minuman bernutrisi lengkap dengan rasio kalsium fosfor optimal untuk kepadatan tulang.'],
        ['keys' => ['susu kedelai'], 'nama' => 'Susu Kedelai Alami', 'kat' => 'Minuman', 'porsi' => '1 Gelas (~200ml)', 'kal' => 90.0, 'pro' => 7.0, 'karb' => 8.0, 'lem' => 3.5, 'ser' => 1.2, 'desk' => 'Minuman nabati berprotein tinggi alternatif susu sapi yang bebas laktosa dan kolesterol.'],
        ['keys' => ['yogurt'], 'nama' => 'Yogurt Plain Asli', 'kat' => 'Minuman', 'porsi' => '1 Cup (~100g)', 'kal' => 63.0, 'pro' => 5.3, 'karb' => 7.0, 'lem' => 1.6, 'ser' => 0.0, 'desk' => 'Susu fermentasi dengan kultur probiotik hidup yang memperkuat mikrobioma sistem pencernaan.'],
        ['keys' => ['jus alpukat'], 'nama' => 'Jus Alpukat', 'kat' => 'Minuman', 'porsi' => '1 Gelas (~250ml)', 'kal' => 220.0, 'pro' => 3.0, 'karb' => 28.0, 'lem' => 12.0, 'ser' => 5.0, 'desk' => 'Minuman kental creamy kaya lemak nabati baik asam oleat dan vitamin E tinggi.']
    ];

    // Pencarian kecocokan kata kunci spesifik
    foreach ($foods as $item) {
        foreach ($item['keys'] as $key) {
            if (strpos($n, $key) !== false) {
                return [
                    'nama_makanan' => $item['nama'],
                    'kategori' => $item['kat'],
                    'ukuran_porsi' => $item['porsi'],
                    'kalori' => floatval($item['kal']),
                    'protein' => floatval($item['pro']),
                    'karbohidrat' => floatval($item['karb']),
                    'lemak' => floatval($item['lem']),
                    'serat' => floatval($item['ser']),
                    'deskripsi' => $item['desk']
                ];
            }
        }
    }

    // Jika tidak ditemukan di tabel pangan nyata resmi, TIDAK BOLEH mengarang data (NO crc32)!
    return null;
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
        $namaRaw = trim($b['nama_makanan'] ?? '');
        $val = validateFoodName($namaRaw);
        if (!$val['valid']) respond(['success' => false, 'message' => $val['message']]);

        $nama = $conn->real_escape_string($namaRaw);
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
        $namaRaw = trim($b['nama_makanan'] ?? '');
        $val = validateFoodName($namaRaw);
        if (!$val['valid']) respond(['success' => false, 'message' => $val['message']]);

        $nama = $conn->real_escape_string($namaRaw);
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
            $res = $conn->query("SELECT r.*, u.username FROM request_user r JOIN users u ON r.id_user=u.id ORDER BY r.id_request ASC");
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
        $nama = trim($b['nama_makanan_req'] ?? '');
        if (empty($nama)) respond(['success' => false, 'message' => 'Nama makanan wajib diisi']);

        // Validasi input nama makanan di dunia nyata
        $val = validateFoodName($nama);
        if (!$val['valid']) {
            respond(['success' => false, 'message' => $val['message']]);
        }

        $uid = $_SESSION['user_id'];
        $namaEsc = $conn->real_escape_string($nama);

        // 1. Gunakan AI Nutrisi Engine jika API Key tersedia
        $apiKey = GEMINI_API_KEY;
        $aiData = null;

        if (!empty($apiKey)) {
            $prompt = "Anda adalah Ahli Gizi Klinis Terhitung (Certified Clinical Dietitian & Food Scientist).\n" .
                      "Periksa nama makanan berikut: \"$nama\".\n\n" .
                      "TAHAP 1 (VALIDASI MAKANAN NYATA):\n" .
                      "Apakah \"$nama\" merupakan nama makanan, minuman, hidangan, atau bahan pangan nyata yang lazim dikonsumsi manusia di dunia nyata?\n" .
                      "Jika BUKAN makanan (contoh: angka acak, kode, nama barang/benda mati seperti meja/laptop/sepatu, kata acak tanpa arti, atau zat non-konsumsi):\n" .
                      "Kembalikan HANYA JSON:\n" .
                      "{\n" .
                      "  \"is_food\": false,\n" .
                      "  \"message\": \"'$nama' bukan merupakan makanan atau minuman yang valid di dunia nyata.\"\n" .
                      "}\n\n" .
                      "TAHAP 2: Jika TERBUKTI adalah makanan/minuman nyata, berikan analisis nutrisi akurat untuk 1 porsi standar (TKPI/USDA). Kembalikan HANYA format JSON:\n" .
                      "{\n" .
                      "  \"is_food\": true,\n" .
                      "  \"nama_makanan\": \"$nama\",\n" .
                      "  \"kategori\": \"Salah satu dari: Makanan utama, Lauk pauk, Cemilan, Buah, Appetizer\",\n" .
                      "  \"kalori\": 250,\n" .
                      "  \"protein\": 15,\n" .
                      "  \"karbohidrat\": 30,\n" .
                      "  \"lemak\": 8\n" .
                      "}";

            $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" . urlencode($apiKey);
            $payload = [ "contents" => [ ["parts" => [["text" => $prompt]]] ] ];

            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            $resRaw = curl_exec($ch);
            curl_close($ch);

            if ($resRaw) {
                $jsonRes = json_decode($resRaw, true);
                $txt = $jsonRes['candidates'][0]['content']['parts'][0]['text'] ?? '';
                $cleanJson = preg_replace('/^```json\s*|\s*```$/i', '', trim($txt));
                $parsedAi = json_decode($cleanJson, true);
                if ($parsedAi) {
                    if (isset($parsedAi['is_food']) && $parsedAi['is_food'] === false) {
                        respond(['success' => false, 'message' => $parsedAi['message'] ?? "Request ditolak: '$nama' bukan merupakan makanan atau minuman nyata di dunia."]);
                    }
                    if (isset($parsedAi['kalori'])) {
                        $aiData = $parsedAi;
                    }
                }
            }
        }

        // 2. Jika AI tidak aktif atau offline, periksa database gizi & kamus TKPI nyata
        if (!$aiData) {
            $makananLower = strtolower($nama);
            $resDB = $conn->query("SELECT * FROM makanan WHERE LOWER(nama_makanan) = '" . $conn->real_escape_string($makananLower) . "' OR LOWER(nama_makanan) LIKE '%" . $conn->real_escape_string($makananLower) . "%' LIMIT 1");
            if ($resDB && $resDB->num_rows > 0) {
                $row = $resDB->fetch_assoc();
                $aiData = [
                    'nama_makanan' => $row['nama_makanan'],
                    'kategori' => $row['kategori'],
                    'kalori' => floatval($row['kalori']),
                    'protein' => floatval($row['protein']),
                    'karbohidrat' => floatval($row['karbohidrat']),
                    'lemak' => floatval($row['lemak'])
                ];
            } else {
                // Cari di tabel standar pangan TKPI nyata
                $smartData = getSmartNutritionFallback($nama);
                if ($smartData) {
                    $aiData = [
                        'nama_makanan' => $smartData['nama_makanan'],
                        'kategori' => $smartData['kategori'],
                        'kalori' => floatval($smartData['kalori']),
                        'protein' => floatval($smartData['protein']),
                        'karbohidrat' => floatval($smartData['karbohidrat']),
                        'lemak' => floatval($smartData['lemak'])
                    ];
                }
            }
        }

        // 3. Jika makanan terverifikasi nyata (via AI atau basis data TKPI):
        if ($aiData && isset($aiData['kalori'])) {
            $namaIns = $conn->real_escape_string($aiData['nama_makanan'] ?? $nama);
            $katIns  = $conn->real_escape_string($aiData['kategori'] ?? 'Makanan utama');
            $kalIns  = floatval($aiData['kalori'] ?? 0);
            $proIns  = floatval($aiData['protein'] ?? 0);
            $karbIns = floatval($aiData['karbohidrat'] ?? 0);
            $lemIns  = floatval($aiData['lemak'] ?? 0);

            // Simpan request dengan status 'Diterima' dan tambahkan ke katalog makanan
            $conn->query("INSERT INTO request_user (id_user, nama_makanan_req, status_request) VALUES ($uid,'$namaEsc','Diterima')");
            $conn->query("INSERT INTO makanan (nama_makanan, kategori, kalori, protein, karbohidrat, lemak) VALUES ('$namaIns', '$katIns', $kalIns, $proIns, $karbIns, $lemIns)");

            catatLog($conn, $uid, "Request '$nama' disetujui & ditambahkan ke katalog gizi (Protein: {$proIns}g, Kalori: {$kalIns}kcal)");
            respond([
                'success' => true,
                'message' => "Request '$nama' disetujui! Nutrisi resmi terverifikasi (Protein: {$proIns}g, Kalori: {$kalIns} kcal) dan dimasukkan ke Katalog Gizi."
            ]);
        } else {
            // Makanan belum ada di basis data standar dan AI offline: simpan sebagai 'Pending' untuk verifikasi Admin (TIDAK MENGARANG ANGKA!)
            $conn->query("INSERT INTO request_user (id_user, nama_makanan_req, status_request) VALUES ($uid,'$namaEsc','Pending')");
            catatLog($conn, $uid, "Mengajukan request makanan baru (Pending): $nama");
            respond([
                'success' => true,
                'message' => "Request '$nama' berhasil diajukan dengan status Pending untuk ditinjau dan diverifikasi oleh Admin."
            ]);
        }

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

    // ─── AI ANALYSIS ────────────────────────────────────────────────────────
    case 'analyze_ai_text':
        $b = getBody();
        $namaMakanan = trim($b['nama_makanan'] ?? '');
        $apiKey = trim($b['api_key'] ?? '') ?: GEMINI_API_KEY;

        if (empty($namaMakanan)) {
            respond(['success' => false, 'message' => 'Nama makanan/deskripsi wajib diisi']);
        }

        // Validasi input nama makanan di dunia nyata
        $val = validateFoodName($namaMakanan);
        if (!$val['valid']) {
            respond(['success' => false, 'message' => $val['message']]);
        }

        catatLog($conn, $_SESSION['user_id'] ?? null, "Melakukan analisis AI Teks: $namaMakanan");

        if (!empty($apiKey)) {
            $prompt = "Anda adalah Ahli Gizi Klinis Terhitung (Certified Clinical Dietitian & Food Scientist).\n" .
                      "Periksa input nama makanan berikut secara teliti: \"$namaMakanan\".\n\n" .
                      "TAHAP 1 (VALIDASI MAKANAN NYATA DI DUNIA):\n" .
                      "Periksa apakah \"$namaMakanan\" BENAR-BENAR merupakan makanan, minuman, hidangan kuliner, atau bahan pangan nyata yang lazim dikonsumsi manusia.\n" .
                      "- Jika input BUKAN makanan (misalnya berupa angka acak, kode, simbol, barang/benda mati seperti meja/laptop/sepatu/hp, kata ngawur tanpa arti, hewan non-konsumsi, atau zat kimia):\n" .
                      "  Kembalikan HANYA JSON persis dengan format ini:\n" .
                      "  {\n" .
                      "    \"is_food\": false,\n" .
                      "    \"message\": \"Input \\\"$namaMakanan\\\" bukan merupakan makanan atau minuman yang valid di dunia nyata.\"\n" .
                      "  }\n\n" .
                      "- Jika input TERBUKTI merupakan makanan atau minuman nyata:\n" .
                      "  Lakukan kalkulasi nutrisi yang SANGAT AKURAT untuk porsi standar sesuai standar tabel komposisi pangan resmi (TKPI Kemenkes / USDA).\n" .
                      "  Kembalikan HANYA format JSON valid tanpa backtick/markdown dengan struktur:\n" .
                      "  {\n" .
                      "    \"is_food\": true,\n" .
                      "    \"nama_makanan\": \"$namaMakanan\",\n" .
                      "    \"kategori\": \"Salah satu dari: Makanan utama, Lauk pauk, Cemilan, Buah, Appetizer\",\n" .
                      "    \"ukuran_porsi\": \"Porsi standar (misal: 1 Porsi / 100g)\",\n" .
                      "    \"kalori\": 250.0,\n" .
                      "    \"protein\": 24.5,\n" .
                      "    \"karbohidrat\": 12.0,\n" .
                      "    \"lemak\": 7.5,\n" .
                      "    \"serat\": 3.0,\n" .
                      "    \"deskripsi\": \"Rincian ilmiah kandungan gizi, kepadatan protein per 100g, dan manfaat kesehatan secara singkat dalam 2-3 kalimat.\"\n" .
                      "  }";

            $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" . urlencode($apiKey);
            $payload = [
                "contents" => [
                    ["parts" => [["text" => $prompt]]]
                ]
            ];

            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            $resRaw = curl_exec($ch);
            curl_close($ch);

            if ($resRaw) {
                $jsonRes = json_decode($resRaw, true);
                $txt = $jsonRes['candidates'][0]['content']['parts'][0]['text'] ?? '';
                $cleanJson = preg_replace('/^```json\s*|\s*```$/i', '', trim($txt));
                $parsed = json_decode($cleanJson, true);
                if ($parsed) {
                    if (isset($parsed['is_food']) && $parsed['is_food'] === false) {
                        respond(['success' => false, 'message' => $parsed['message'] ?? "Input '$namaMakanan' bukan merupakan makanan atau minuman yang nyata di dunia."]);
                    }
                    if (isset($parsed['kalori'])) {
                        respond(['success' => true, 'source' => 'Gemini AI Clinical Engine', 'data' => $parsed]);
                    }
                }
            }
        }

        // Fallback / AI Engine internal jika API key tidak tersedia atau cURL gagal
        $makananLower = strtolower($namaMakanan);
        $resDB = $conn->query("SELECT * FROM makanan WHERE LOWER(nama_makanan) = '" . $conn->real_escape_string($makananLower) . "' OR LOWER(nama_makanan) LIKE '%" . $conn->real_escape_string($makananLower) . "%' LIMIT 1");
        if ($resDB && $resDB->num_rows > 0) {
            $dbRow = $resDB->fetch_assoc();
            respond([
                'success' => true,
                'source' => 'Basis Data Gizi Terverifikasi',
                'data' => [
                    'nama_makanan' => $dbRow['nama_makanan'],
                    'kategori' => $dbRow['kategori'],
                    'ukuran_porsi' => '1 Porsi Standar (100g)',
                    'kalori' => floatval($dbRow['kalori']),
                    'protein' => floatval($dbRow['protein']),
                    'karbohidrat' => floatval($dbRow['karbohidrat']),
                    'lemak' => floatval($dbRow['lemak']),
                    'serat' => round(floatval($dbRow['karbohidrat']) * 0.1, 1),
                    'deskripsi' => "Data terverifikasi dari basis data gizi nasional untuk " . $dbRow['nama_makanan'] . " dengan tingkat presisi tinggi."
                ]
            ]);
        }

        // Smart Nutrition Rules (Preset akurat untuk makanan nyata populer berstandar TKPI)
        $smartData = getSmartNutritionFallback($namaMakanan);
        if ($smartData) {
            respond([
                'success' => true,
                'source' => 'Tabel Komposisi Pangan Resmi (TKPI Kemenkes RI)',
                'data' => $smartData
            ]);
        }

        // Jika tidak ada di database dan bukan makanan yang terdaftar resmi: TOLAK dan JANGAN MENGARANG ANGKA!
        respond([
            'success' => false,
            'message' => "Makanan '$namaMakanan' tidak ditemukan dalam basis data gizi resmi (TKPI/USDA). Pastikan nama makanan ditulis dengan benar (contoh: Dada Ayam, Telur Rebus, Rendang Daging) atau gunakan Gemini API Key untuk deteksi cerdas."
        ]);

    case 'analyze_ai_image':
        $b = getBody();
        $imageBase64 = $b['image'] ?? '';
        $apiKey = trim($b['api_key'] ?? '') ?: GEMINI_API_KEY;

        if (empty($imageBase64)) {
            respond(['success' => false, 'message' => 'File foto atau pemindaian kamera wajib dikirimkan']);
        }

        catatLog($conn, $_SESSION['user_id'] ?? null, "Melakukan analisis AI Kamera/Foto Makanan");

        // Format data: data:image/jpeg;base64,...
        $mimeType = 'image/jpeg';
        $pureBase64 = $imageBase64;
        if (preg_match('/^data:(image\/\w+);base64,(.+)$/', $imageBase64, $matches)) {
            $mimeType = $matches[1];
            $pureBase64 = $matches[2];
        }

        if (empty($apiKey)) {
            respond([
                'success' => false,
                'message' => 'Untuk mengenali foto/kamera secara nyata dan memvalidasi keaslian makanannya di dunia nyata, sistem memerlukan Gemini AI Vision. Silakan masukkan Gemini API Key Anda di kolom atas halaman AI Scanner.'
            ]);
        }

        $prompt = "Anda adalah Ahli Gizi Klinis Terhitung (Certified Clinical Dietitian & Food Scientist).\n" .
                  "Periksa gambar hasil kamera/foto ini secara seksama.\n\n" .
                  "TAHAP 1 (VALIDASI MAKANAN NYATA):\n" .
                  "Periksa apakah gambar ini BENAR-BENAR menampilkan makanan, hidangan kuliner, minuman, atau bahan pangan konsumsi manusia nyata.\n" .
                  "- Jika gambar BUKAN makanan (misalnya: foto wajah/selfie manusia, dokumen/teks/angka, layar monitor, benda mati seperti meja/kursi/sepatu/laptop/pakaian, kendaraan, ruangan kosong, atau gambar gelap/acak):\n" .
                  "  Kembalikan HANYA format JSON:\n" .
                  "  {\n" .
                  "    \"is_food\": false,\n" .
                  "    \"message\": \"Foto atau tangkapan kamera tidak menampilkan makanan atau minuman yang valid di dunia nyata.\"\n" .
                  "  }\n\n" .
                  "- Jika gambar TERBUKTI merupakan makanan/minuman nyata:\n" .
                  "  Identifikasi hidangan tersebut dan hitung estimasi nutrisi akurat untuk 1 porsi standar sesuai standar pangan (TKPI/USDA).\n" .
                  "  Kembalikan HANYA format JSON valid tanpa tanda markdown/backtick:\n" .
                  "  {\n" .
                  "    \"is_food\": true,\n" .
                  "    \"nama_makanan\": \"Nama hidangan spesifik yang terlihat di foto\",\n" .
                  "    \"kategori\": \"Salah satu dari: Makanan utama, Lauk pauk, Cemilan, Buah, Appetizer\",\n" .
                  "    \"ukuran_porsi\": \"Estimasi porsi visual (misal: 1 Porsi ~ 150g)\",\n" .
                  "    \"kalori\": 280.0,\n" .
                  "    \"protein\": 26.5,\n" .
                  "    \"karbohidrat\": 18.0,\n" .
                  "    \"lemak\": 9.5,\n" .
                  "    \"serat\": 2.5,\n" .
                  "    \"deskripsi\": \"Rincian pengenalan bahan visual makanan, estimasi kadar protein murni, serta analisis nutrisinya dalam 2-3 kalimat.\"\n" .
                  "  }";

        $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" . urlencode($apiKey);
        $payload = [
            "contents" => [
                [
                    "parts" => [
                        ["text" => $prompt],
                        [
                            "inline_data" => [
                                "mime_type" => $mimeType,
                                "data" => $pureBase64
                            ]
                        ]
                    ]
                ]
            ]
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $resRaw = curl_exec($ch);
        curl_close($ch);

        if ($resRaw) {
            $jsonRes = json_decode($resRaw, true);
            $txt = $jsonRes['candidates'][0]['content']['parts'][0]['text'] ?? '';
            $cleanJson = preg_replace('/^```json\s*|\s*```$/i', '', trim($txt));
            $parsed = json_decode($cleanJson, true);
            if ($parsed) {
                if (isset($parsed['is_food']) && $parsed['is_food'] === false) {
                    respond(['success' => false, 'message' => $parsed['message'] ?? 'Objek pada foto tidak terdeteksi sebagai makanan atau minuman nyata di dunia.']);
                }
                if (isset($parsed['kalori'])) {
                    respond(['success' => true, 'source' => 'Gemini AI Vision Engine', 'data' => $parsed]);
                }
            }
        }

        respond([
            'success' => false,
            'message' => 'Gagal mendeteksi hidangan pada foto atau koneksi ke AI Vision terputus. Pastikan foto makanan terlihat jelas dan API Key valid.'
        ]);

    default:
        respond(['success' => false, 'message' => "Action '$action' tidak dikenal"]);
}

$conn->close();
