import { ReactNode } from 'react';

export interface Slide {
  id: number;
  title: string;
  content: ReactNode;
  hasVideo?: boolean;
  videoUrl?: string;
}

export const slidesL5: Slide[] = [
  {
    id: 1,
    title: "Apa Itu Online & Offline?",
    content: (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-orange-600 mb-6">
            🌐 Online & Offline
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-200">
            <div className="text-center">
              <div className="text-6xl mb-4">🌐</div>
              <h3 className="text-2xl font-bold text-blue-600 mb-3">Online</h3>
              <p className="text-lg text-gray-700">
                Butuh internet untuk berjalan
              </p>
            </div>
          </div>
          
          <div className="bg-gray-50 p-6 rounded-lg border-2 border-gray-200">
            <div className="text-center">
              <div className="text-6xl mb-4">📴</div>
              <h3 className="text-2xl font-bold text-gray-600 mb-3">Offline</h3>
              <p className="text-lg text-gray-700">
                Tidak butuh internet
              </p>
            </div>
          </div>
        </div>
        
        <div className="text-center p-4 bg-yellow-50 rounded-lg">
          <p className="text-lg text-gray-700">
            <strong>Ingat:</strong> Online perlu internet, offline tidak perlu!
          </p>
        </div>
      </div>
    )
  },
  {
    id: 2,
    title: "Contoh Kegiatan Online",
    content: (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-blue-600 mb-2">
            🌐 Kegiatan Online
          </h2>
          <p className="text-lg text-gray-600 mb-6">
            Aktivitas yang membutuhkan internet
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-md border-2 border-blue-200">
            <div className="text-center">
              <div className="text-5xl mb-3">📺</div>
              <h3 className="text-xl font-bold mb-2">Nonton YouTube</h3>
              <p className="text-gray-600">Video streaming butuh internet</p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md border-2 border-blue-200">
            <div className="text-center">
              <div className="text-5xl mb-3">🎮</div>
              <h3 className="text-xl font-bold mb-2">Main Game Online</h3>
              <p className="text-gray-600">Bermain dengan teman jauh</p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md border-2 border-blue-200">
            <div className="text-center">
              <div className="text-5xl mb-3">📞</div>
              <h3 className="text-xl font-bold mb-2">Video Call</h3>
              <p className="text-gray-600">Bicara dengan keluarga jauh</p>
            </div>
          </div>
        </div>
        
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <p className="text-lg text-blue-700">
            <strong>Ciri khas:</strong> Semua butuh koneksi internet! 📶
          </p>
        </div>
      </div>
    )
  },
  {
    id: 3,
    title: "Contoh Kegiatan Offline",
    content: (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-600 mb-2">
            📴 Kegiatan Offline
          </h2>
          <p className="text-lg text-gray-600 mb-6">
            Aktivitas yang tidak membutuhkan internet
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-md border-2 border-gray-200">
            <div className="text-center">
              <div className="text-5xl mb-3">🧩</div>
              <h3 className="text-xl font-bold mb-2">Main Puzzle</h3>
              <p className="text-gray-600">Game sudah ada di tablet</p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md border-2 border-gray-200">
            <div className="text-center">
              <div className="text-5xl mb-3">🎨</div>
              <h3 className="text-xl font-bold mb-2">Menggambar</h3>
              <p className="text-gray-600">Pakai aplikasi drawing</p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md border-2 border-gray-200">
            <div className="text-center">
              <div className="text-5xl mb-3">📖</div>
              <h3 className="text-xl font-bold mb-2">Baca E-book</h3>
              <p className="text-gray-600">Buku digital yang sudah diunduh</p>
            </div>
          </div>
        </div>
        
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-lg text-gray-700">
            <strong>Ciri khas:</strong> Tetap bisa digunakan tanpa internet! 📵
          </p>
        </div>
      </div>
    )
  },
  {
    id: 4,
    title: "Perbedaan Online dan Offline",
    content: (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-purple-600 mb-6">
            ⚖️ Apa Bedanya?
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-500">
            <h3 className="text-2xl font-bold text-blue-600 mb-4 flex items-center">
              🌐 Online
            </h3>
            <ul className="space-y-3 text-lg">
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Harus terhubung internet
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Bisa main dengan teman jauh
              </li>
              <li className="flex items-center">
                <span className="text-red-500 mr-2">✗</span>
                Tidak bisa jika wifi mati
              </li>
              <li className="flex items-center">
                <span className="text-red-500 mr-2">✗</span>
                Pakai kuota internet
              </li>
            </ul>
          </div>
          
          <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-gray-500">
            <h3 className="text-2xl font-bold text-gray-600 mb-4 flex items-center">
              📴 Offline
            </h3>
            <ul className="space-y-3 text-lg">
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Tidak butuh internet
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Bisa digunakan kapan saja
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Tidak pakai kuota
              </li>
              <li className="flex items-center">
                <span className="text-red-500 mr-2">✗</span>
                Tidak bisa main dengan teman jauh
              </li>
            </ul>
          </div>
        </div>
        
        <div className="text-center p-6 bg-purple-50 rounded-lg">
          <h4 className="text-xl font-bold text-purple-600 mb-2">
            Kesimpulan
          </h4>
          <p className="text-lg text-gray-700">
            Keduanya punya kelebihan! Online untuk bermain bersama, offline untuk bermain kapan saja.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 5,
    title: "Preferensi dan Diskusi",
    content: (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-green-600 mb-2">
            🤔 Mana yang Kamu Suka?
          </h2>
          <p className="text-lg text-gray-600 mb-6">
            Mari diskusikan preferensi kita!
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-300">
            <h3 className="text-2xl font-bold text-blue-600 mb-4 text-center">
              🌐 Tim Online
            </h3>
            <div className="space-y-3">
              <div className="bg-white p-3 rounded">
                <p className="font-semibold">Alasan memilih online:</p>
                <ul className="list-disc list-inside text-gray-700 mt-2">
                  <li>Bisa main dengan teman</li>
                  <li>Konten selalu baru</li>
                  <li>Video dan musik streaming</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 p-6 rounded-lg border-2 border-gray-300">
            <h3 className="text-2xl font-bold text-gray-600 mb-4 text-center">
              📴 Tim Offline
            </h3>
            <div className="space-y-3">
              <div className="bg-white p-3 rounded">
                <p className="font-semibold">Alasan memilih offline:</p>
                <ul className="list-disc list-inside text-gray-700 mt-2">
                  <li>Tidak pakai kuota</li>
                  <li>Bisa main di mana saja</li>
                  <li>Tidak tergantung wifi</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-center p-6 bg-yellow-50 rounded-lg border-2 border-yellow-300">
          <h4 className="text-xl font-bold text-yellow-700 mb-3">
            💡 Pertanyaan Diskusi
          </h4>
          <div className="space-y-2 text-lg text-gray-700">
            <p>• Kamu lebih suka main online atau offline?</p>
            <p>• Kapan waktu yang tepat untuk main online?</p>
            <p>• Apa yang kamu lakukan kalau internet mati?</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 6,
    title: "Kesimpulan dan Tips",
    content: (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-orange-600 mb-6">
            🎯 Yang Sudah Kita Pelajari
          </h2>
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
          <h3 className="text-2xl font-bold text-center mb-4">📚 Ringkasan Materi</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-4xl mb-2">🎯</div>
              <p className="font-semibold">Apa itu online dan offline</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2">📝</div>
              <p className="font-semibold">Contoh kegiatan keduanya</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2">⚖️</div>
              <p className="font-semibold">Perbedaan dan kelebihan</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 p-6 rounded-lg border-2 border-green-300">
          <h3 className="text-2xl font-bold text-green-600 mb-4 text-center">
            💡 Tips Bijak Menggunakan Internet
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="text-2xl">⏰</div>
                <div>
                  <p className="font-semibold">Atur Waktu</p>
                  <p className="text-sm text-gray-600">Seimbangkan online dan offline</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="text-2xl">📱</div>
                <div>
                  <p className="font-semibold">Pilih Konten</p>
                  <p className="text-sm text-gray-600">Pilih yang edukatif dan aman</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="text-2xl">👨‍👩‍👧‍👦</div>
                <div>
                  <p className="font-semibold">Minta Bantuan</p>
                  <p className="text-sm text-gray-600">Bertanya pada orang dewasa</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="text-2xl">🛡️</div>
                <div>
                  <p className="font-semibold">Tetap Aman</p>
                  <p className="text-sm text-gray-600">Jaga informasi pribadi</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-center bg-orange-50 p-6 rounded-lg">
          <h3 className="text-2xl font-bold text-orange-600 mb-3">
            🚀 Selamat!
          </h3>
          <p className="text-lg text-gray-700">
            Kamu sekarang tahu perbedaan online dan offline. 
            Yuk, selalu pakai internet dengan bijak!
          </p>
        </div>
      </div>
    )
  }
];