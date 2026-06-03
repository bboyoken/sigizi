
create table users (
	id int auto_increment primary key,
	username varchar(100) not null unique,
	password varchar(100) not null,
	role varchar (10) not null
);

create table makanan (
	id_makanan int auto_increment primary key,
	nama_makanan varchar(100) not null,
	kategori varchar(100) not null,
	kalori float not null,
	protein float not null,
	karbohidrat float not null,
	lemak float not NULL
);

CREATE TABLE request_user (
    id_request INT AUTO_INCREMENT PRIMARY KEY,
    id_user INT NOT NULL,
    nama_makanan_req VARCHAR(100) NOT NULL,
    status_request VARCHAR(20) DEFAULT 'Pending',
    FOREIGN KEY (id_user) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE log_user (
    id_log INT AUTO_INCREMENT PRIMARY KEY,
    id_user INT NOT NULL,
    aktivitas VARCHAR(255) NOT NULL,
    waktu TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_user) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE manajemen_rekomendasi (
    id_rekomendasi INT AUTO_INCREMENT PRIMARY KEY,
    kategori_bmi VARCHAR(50) NOT NULL,
    saran_diet VARCHAR(255) NOT NULL
);

insert into users values 
(1, 'nabil', '024', 'admin'), 
(2, 'cnopy', '026', 'admin'), 
(3, 'zaki', '020', 'admin'), 
(4, 'senku', '1234', 'user');

insert into makanan values 
(1, 'Nasi putih', 'Makanan utama', 130, 2.7, 28.2, 0.3), 
(2, 'Ayam goreng', 'Lauk pauk', 260, 27.3, 1.8, 16.8), 
(3, 'Sate ayam', 'Lauk pauk', 200, 20, 15, 10), 
(4, 'Rendang daging', 'Lauk pauk', 468, 47, 10.5, 30), 
(5, 'Pisang rebus', 'Cemilan', 110, 1.2, 28, 0.3); 

INSERT INTO manajemen_rekomendasi (kategori_bmi, saran_diet) VALUES
('Kekurangan Berat Badan (Underweight)', 'Tingkatkan asupan kalori harian secara bertahap. Konsumsi makanan padat gizi tinggi protein dan karbohidrat kompleks seperti daging sapi, telur, kacang-kacangan, dan susu.'),
('Normal (Ideal)', 'Pertahankan pola makan Anda saat ini! Pastikan gizi tetap seimbang dengan porsi sayur, buah, dan protein yang cukup setiap harinya.'),
('Kelebihan Berat Badan (Overweight)', 'Mulai lakukan defisit kalori ringan. Kurangi asupan karbohidrat sederhana (gula, tepung) dan lemak jenuh. Perbanyak konsumsi serat dan air putih.'),
('Obesitas', 'Lakukan program defisit kalori secara disiplin. Hindari makanan manis, minuman kemasan, dan gorengan. Sangat disarankan untuk berkonsultasi langsung dengan ahli gizi.');

INSERT INTO request_user (id_user, nama_makanan_req, status_request) VALUES
(4, 'Gulai Kambing', 'Pending'),
(2, 'Salad Buah Yogurt', 'Pending'),
(2, 'Seblak Mercon Level 5', 'Pending'),
(4, 'Oatmeal Susu Pisang', 'Pending');

INSERT INTO log_user (id_user, aktivitas) VALUES 
(4, 'Login ke dalam sistem (User)'),
(2, 'Melakukan kalkulasi BMI dengan hasil Normal (Ideal)'),
(2, 'Melakukan request makanan baru: Gulai Kambing'),
(4, 'Mencari makanan menggunakan fitur Binary Search'),
(1, 'Login ke dalam sistem (Admin)'),
(1, 'Admin menolak request makanan: Seblak Mercon Level 5'),
(2, 'Admin menambahkan data makanan baru ke katalog gizi');