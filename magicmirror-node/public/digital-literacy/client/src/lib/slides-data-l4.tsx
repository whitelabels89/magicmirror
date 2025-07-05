import { ReactNode } from "react";

export interface Slide {
  id: number;
  title: string;
  content: ReactNode;
  hasVideo?: boolean;
  videoUrl?: string;
}

export const slidesL4: Slide[] = [
  {
    id: 1,
    title: "Apa Itu Aplikasi Belajar?",
    content: (
      <div className="space-y-6 text-center">
        <div className="text-6xl mb-4">📱</div>
        <h2 className="text-3xl font-bold text-blue-600 mb-4">
          Apa Itu Aplikasi Belajar?
        </h2>
        <div className="bg-blue-50 p-6 rounded-lg">
          <p className="text-xl text-gray-700 leading-relaxed">
            Aplikasi belajar adalah <strong>game seru</strong> di tablet/HP yang bisa bantu kita belajar!
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-yellow-100 p-4 rounded-lg">
            <div className="text-3xl mb-2">🎮</div>
            <p className="text-sm font-medium">Game Seru</p>
          </div>
          <div className="bg-green-100 p-4 rounded-lg">
            <div className="text-3xl mb-2">📚</div>
            <p className="text-sm font-medium">Belajar</p>
          </div>
          <div className="bg-purple-100 p-4 rounded-lg">
            <div className="text-3xl mb-2">🤝</div>
            <p className="text-sm font-medium">Bersama</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 2,
    title: "Jenis-Jenis Aplikasi Belajar",
    content: (
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-6xl mb-4">🧩</div>
          <h2 className="text-3xl font-bold text-green-600 mb-6">
            Contoh Aplikasi Belajar
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-red-50 p-6 rounded-lg border-2 border-red-200">
            <div className="text-4xl mb-3 text-center">🔤</div>
            <h3 className="font-bold text-lg mb-2 text-center">Game Puzzle Alfabet</h3>
            <p className="text-sm text-gray-600 text-center">
              Belajar huruf A-Z dengan puzzle seru
            </p>
          </div>
          
          <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-200">
            <div className="text-4xl mb-3 text-center">🔢</div>
            <h3 className="font-bold text-lg mb-2 text-center">Game Mengenal Angka</h3>
            <p className="text-sm text-gray-600 text-center">
              Belajar angka 1-10 sambil bermain
            </p>
          </div>
          
          <div className="bg-yellow-50 p-6 rounded-lg border-2 border-yellow-200">
            <div className="text-4xl mb-3 text-center">🎨</div>
            <h3 className="font-bold text-lg mb-2 text-center">Game Warna & Bentuk</h3>
            <p className="text-sm text-gray-600 text-center">
              Mengenal warna dan bentuk-bentuk
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 3,
    title: "Kenapa Aplikasi Belajar Itu Seru?",
    content: (
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-6xl mb-4">🌟</div>
          <h2 className="text-3xl font-bold text-purple-600 mb-6">
            Kenapa Aplikasi Belajar Itu Seru?
          </h2>
        </div>
        
        <div className="space-y-4">
          <div className="bg-orange-50 p-6 rounded-lg border-l-4 border-orange-400">
            <div className="flex items-center">
              <div className="text-3xl mr-4">🎵</div>
              <div>
                <h3 className="font-bold text-lg">Ada suara dan gambar menarik</h3>
                <p className="text-gray-600">Musik, efek suara, dan animasi yang colorful!</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-400">
            <div className="flex items-center">
              <div className="text-3xl mr-4">🎮</div>
              <div>
                <h3 className="font-bold text-lg">Bisa belajar sambil main</h3>
                <p className="text-gray-600">Tidak terasa sedang belajar karena seru!</p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-400">
            <div className="flex items-center">
              <div className="text-3xl mr-4">✨</div>
              <div>
                <h3 className="font-bold text-lg">Belajar huruf & angka jadi mudah</h3>
                <p className="text-gray-600">Step by step dengan cara yang menyenangkan</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 4,
    title: "Yuk, Kita Coba Bareng!",
    content: (
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-6xl mb-4">👨‍🎓</div>
          <h2 className="text-3xl font-bold text-indigo-600 mb-6">
            Yuk, Kita Coba Bareng!
          </h2>
        </div>
        
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-lg">
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="bg-indigo-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">1</div>
              <div className="flex items-center">
                <span className="text-2xl mr-3">📱</span>
                <span className="font-semibold">Buka aplikasi belajar</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="bg-indigo-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">2</div>
              <div className="flex items-center">
                <span className="text-2xl mr-3">👆</span>
                <span className="font-semibold">Ikuti instruksi: tap huruf/angka</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="bg-indigo-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">3</div>
              <div className="flex items-center">
                <span className="text-2xl mr-3">🧩</span>
                <span className="font-semibold">Selesaikan puzzle bersama</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-100 p-4 rounded-lg text-center">
          <p className="text-lg font-medium text-yellow-800">
            💡 Jangan khawatir salah - belajar itu proses!
          </p>
        </div>
      </div>
    )
  },
  {
    id: 5,
    title: "Apa yang Kamu Pelajari?",
    content: (
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-6xl mb-4">🤔</div>
          <h2 className="text-3xl font-bold text-teal-600 mb-6">
            Apa yang Kamu Pelajari?
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-red-50 p-6 rounded-lg text-center border-2 border-red-200 hover:shadow-lg transition-shadow">
            <div className="text-4xl mb-3">🔤</div>
            <h3 className="font-bold text-lg mb-2">Huruf Baru?</h3>
            <p className="text-sm text-gray-600">
              A, B, C... atau huruf lainnya
            </p>
          </div>
          
          <div className="bg-blue-50 p-6 rounded-lg text-center border-2 border-blue-200 hover:shadow-lg transition-shadow">
            <div className="text-4xl mb-3">🔢</div>
            <h3 className="font-bold text-lg mb-2">Angka Baru?</h3>
            <p className="text-sm text-gray-600">
              1, 2, 3... atau angka lainnya
            </p>
          </div>
          
          <div className="bg-green-50 p-6 rounded-lg text-center border-2 border-green-200 hover:shadow-lg transition-shadow">
            <div className="text-4xl mb-3">🎨</div>
            <h3 className="font-bold text-lg mb-2">Warna atau Bentuk?</h3>
            <p className="text-sm text-gray-600">
              Merah, bulat, segitiga...
            </p>
          </div>
        </div>
        
        <div className="bg-purple-50 p-6 rounded-lg">
          <h3 className="font-bold text-lg mb-3 text-center">🌟 Yang Penting...</h3>
          <p className="text-center text-gray-700">
            Setiap kali kamu coba aplikasi belajar, kamu pasti dapat ilmu baru!
          </p>
        </div>
      </div>
    )
  },
  {
    id: 6,
    title: "Terima Kasih!",
    content: (
      <div className="space-y-6 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-3xl font-bold text-pink-600 mb-6">
          Terima Kasih!
        </h2>
        
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-6 rounded-lg">
          <h3 className="font-bold text-xl mb-4">Hari ini kamu belajar:</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-center">
              <span className="text-2xl mr-3">✅</span>
              <span className="font-medium">Mengenal aplikasi edukasi</span>
            </div>
            <div className="flex items-center justify-center">
              <span className="text-2xl mr-3">✅</span>
              <span className="font-medium">Cara bermain aplikasi belajar</span>
            </div>
            <div className="flex items-center justify-center">
              <span className="text-2xl mr-3">✅</span>
              <span className="font-medium">Manfaat belajar pakai aplikasi</span>
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-100 p-6 rounded-lg">
          <div className="text-4xl mb-3">🚀</div>
          <p className="text-xl font-bold text-yellow-800">
            Siap coba aplikasi seru lagi di rumah?
          </p>
        </div>
        
        <div className="text-4xl">👏👏👏</div>
      </div>
    )
  }
];