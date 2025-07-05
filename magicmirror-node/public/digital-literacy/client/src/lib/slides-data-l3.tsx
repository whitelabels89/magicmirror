import { ReactNode } from "react";
import VideoPlayer from "@/components/video-player";
import AnimatedGesture from "@/components/animated-gesture";

export interface Slide {
  id: number;
  title: string;
  content: ReactNode;
  hasVideo?: boolean;
  videoUrl?: string;
}

export const slidesL3: Slide[] = [
  {
    id: 1,
    title: "Pentingnya Waktu Layar yang Sehat 🕒",
    content: (
      <div className="space-y-6">
        <div className="bg-blue-50 p-6 rounded-lg">
          <h3 className="text-xl font-bold text-blue-800 mb-4">
            Apa yang terjadi kalau kita main gadget terlalu lama?
          </h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">👀</span>
              <span className="text-lg">Mata bisa lelah</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🤕</span>
              <span className="text-lg">Kepala pusing</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-2xl">😣</span>
              <span className="text-lg">Badan pegal</span>
            </div>
          </div>
        </div>
        
        <VideoPlayer
          title="Kenapa Mata Bisa Lelah?"
          description="Mari pelajari mengapa mata kita bisa lelah saat menatap layar terlalu lama"
          thumbnailUrl="/api/placeholder/400/225"
          autoPlay={false}
          className="rounded-lg"
        />
      </div>
    ),
    hasVideo: true,
    videoUrl: "/videos/l3-screen-time-effects.mp4"
  },
  {
    id: 2,
    title: "Aturan Durasi Main Gadget ✅",
    content: (
      <div className="space-y-6">
        <div className="bg-green-50 p-6 rounded-lg">
          <h3 className="text-xl font-bold text-green-800 mb-4">
            Berapa lama boleh main gadget?
          </h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-white rounded-lg">
              <span className="text-3xl">⏰</span>
              <span className="text-lg font-semibold">Maksimal 30 menit sekali main</span>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-white rounded-lg">
              <span className="text-3xl">⏸️</span>
              <span className="text-lg font-semibold">Istirahat 5–10 menit setelahnya</span>
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded-lg">
          <p className="text-center text-lg font-medium text-yellow-800">
            Ingat! Timer akan membantu kamu mengatur waktu
          </p>
        </div>
      </div>
    )
  },
  {
    id: 3,
    title: "Posisi Duduk yang Benar 🪑",
    content: (
      <div className="space-y-6">
        <div className="bg-purple-50 p-6 rounded-lg">
          <h3 className="text-xl font-bold text-purple-800 mb-4">
            Cara duduk yang sehat saat main gadget:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg text-center">
              <div className="text-4xl mb-2">📏</div>
              <h4 className="font-semibold mb-2">Punggung Lurus</h4>
              <p className="text-sm">Sandaran kursi menyentuh punggung</p>
            </div>
            <div className="bg-white p-4 rounded-lg text-center">
              <div className="text-4xl mb-2">🦵</div>
              <h4 className="font-semibold mb-2">Kaki Menyentuh Lantai</h4>
              <p className="text-sm">Kaki tidak menggantung</p>
            </div>
            <div className="bg-white p-4 rounded-lg text-center">
              <div className="text-4xl mb-2">📱</div>
              <h4 className="font-semibold mb-2">Layar Sejajar Mata</h4>
              <p className="text-sm">Tidak terlalu tinggi atau rendah</p>
            </div>
          </div>
        </div>
        
        <VideoPlayer
          title="Posisi Duduk yang Benar"
          description="Lihat cara duduk yang sehat saat menggunakan gadget"
          thumbnailUrl="/api/placeholder/400/225"
          autoPlay={false}
          className="rounded-lg"
        />
      </div>
    ),
    hasVideo: true,
    videoUrl: "/videos/l3-proper-sitting.mp4"
  },
  {
    id: 4,
    title: "Senam Mata yang Mudah 👀",
    content: (
      <div className="space-y-6">
        <div className="bg-orange-50 p-6 rounded-lg">
          <h3 className="text-xl font-bold text-orange-800 mb-4">
            Latihan untuk mata yang sehat:
          </h3>
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-2xl">🔍</span>
                <span className="font-semibold">Lihat jauh ke luar jendela</span>
              </div>
              <p className="text-sm ml-8">Fokus pada objek yang jauh selama 5 detik</p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-2xl">😌</span>
                <span className="font-semibold">Tutup mata 5 detik</span>
              </div>
              <p className="text-sm ml-8">Biarkan mata istirahat sejenak</p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-2xl">🔄</span>
                <span className="font-semibold">Ulangi 3 kali</span>
              </div>
              <p className="text-sm ml-8">Lakukan rutin ini setiap istirahat</p>
            </div>
          </div>
        </div>
        
        <div className="text-center">
          <AnimatedGesture 
            type="tap" 
            size="lg" 
            autoPlay={true}
            className="mx-auto"
          />
          <p className="mt-2 text-sm text-gray-600">Tap untuk mulai senam mata</p>
        </div>
      </div>
    )
  },
  {
    id: 5,
    title: "Apa yang Harus Dilakukan Saat Mata Lelah?",
    content: (
      <div className="space-y-6">
        <div className="bg-red-50 p-6 rounded-lg">
          <h3 className="text-xl font-bold text-red-800 mb-4">
            Kalau mata mulai lelah, segera:
          </h3>
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg flex items-center space-x-3">
              <span className="text-3xl">🛑</span>
              <div>
                <h4 className="font-semibold">Berhenti main</h4>
                <p className="text-sm text-gray-600">Matikan gadget sebentar</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg flex items-center space-x-3">
              <span className="text-3xl">😴</span>
              <div>
                <h4 className="font-semibold">Istirahat</h4>
                <p className="text-sm text-gray-600">Pejamkan mata atau lihat yang jauh</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg flex items-center space-x-3">
              <span className="text-3xl">💧</span>
              <div>
                <h4 className="font-semibold">Minum air putih</h4>
                <p className="text-sm text-gray-600">Jaga tubuh tetap terhidrasi</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-100 p-4 rounded-lg">
          <p className="text-center text-lg font-medium text-blue-800">
            💡 Ingat: Kesehatan mata lebih penting dari game!
          </p>
        </div>
      </div>
    )
  },
  {
    id: 6,
    title: "Terima Kasih! 🚀",
    content: (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg">
          <h3 className="text-xl font-bold text-green-800 mb-4">
            Hari ini kamu sudah belajar:
          </h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">✅</span>
              <span className="text-lg">Durasi aman main gadget</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-2xl">✅</span>
              <span className="text-lg">Posisi duduk yang benar</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-2xl">✅</span>
              <span className="text-lg">Cara menjaga mata tetap sehat</span>
            </div>
          </div>
        </div>
        
        <div className="text-center bg-yellow-50 p-6 rounded-lg">
          <h3 className="text-2xl font-bold text-yellow-800 mb-4">
            Siap jadi pengguna gadget yang sehat? 🚀
          </h3>
          <p className="text-lg text-yellow-700">
            Selamat! Kamu sekarang tahu cara menggunakan gadget dengan aman dan sehat!
          </p>
        </div>
      </div>
    )
  }
];