import VideoPlayer from "@/components/video-player";
import AnimatedGesture from "@/components/animated-gesture";

export interface Slide {
  id: number;
  title: string;
  content: React.ReactNode;
  hasVideo?: boolean;
  videoUrl?: string;
}

export const slides: Slide[] = [
  {
    id: 1,
    title: "Apa Itu Alat Digital?",
    hasVideo: true,
    content: (
      <div className="space-y-6">
        <VideoPlayer
          title="Pengenalan Alat Digital"
          description="Video singkat tentang berbagai perangkat digital di sekitar kita"
          className="mb-6"
        />
        <div className="text-center">
          <div className="text-6xl mb-6">📱💻⌚📺</div>
          <p className="text-xl text-gray-700 mb-4">Pernah lihat handphone, tablet, atau jam digital?</p>
          <div className="bg-accent text-white text-2xl font-fredoka py-4 px-6 rounded-2xl inline-block">
            Itu semua disebut alat digital!
          </div>
        </div>
      </div>
    )
  },
  {
    id: 2,
    title: "Contoh Alat Digital",
    content: (
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-blue-50 rounded-xl p-6 text-center">
          <div className="text-4xl mb-4">📱</div>
          <h3 className="text-lg font-fredoka text-gray-800 mb-2">Handphone</h3>
          <p className="text-gray-600">untuk menelpon & main game</p>
        </div>
        <div className="bg-green-50 rounded-xl p-6 text-center">
          <div className="text-4xl mb-4">💻</div>
          <h3 className="text-lg font-fredoka text-gray-800 mb-2">Laptop</h3>
          <p className="text-gray-600">untuk belajar & mengetik</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-6 text-center">
          <div className="text-4xl mb-4">⌚</div>
          <h3 className="text-lg font-fredoka text-gray-800 mb-2">Jam Digital</h3>
          <p className="text-gray-600">untuk lihat waktu</p>
        </div>
        <div className="bg-orange-50 rounded-xl p-6 text-center">
          <div className="text-4xl mb-4">📺</div>
          <h3 className="text-lg font-fredoka text-gray-800 mb-2">TV</h3>
          <p className="text-gray-600">untuk menonton kartun</p>
        </div>
      </div>
    )
  },
  {
    id: 3,
    title: "Kenapa Disebut Digital?",
    content: (
      <div className="text-center">
        <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl p-8 mb-6">
          <div className="text-5xl mb-4">🔢📱</div>
          <p className="text-xl text-gray-700 leading-relaxed">
            Karena alat ini pakai layar dan angka yang muncul otomatis, 
            bukan jarum atau manual.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 4,
    title: "Bandingkan dengan Non-Digital",
    content: (
      <div className="space-y-6">
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="text-3xl mb-2">🕐</div>
              <h3 className="font-fredoka text-gray-800">Jam Digital</h3>
              <p className="text-sm text-gray-600">angka berubah otomatis</p>
            </div>
            <div className="text-2xl text-gray-400">VS</div>
            <div className="text-center">
              <div className="text-3xl mb-2">🕒</div>
              <h3 className="font-fredoka text-gray-800">Jam Analog</h3>
              <p className="text-sm text-gray-600">pakai jarum yang muter</p>
            </div>
          </div>
        </div>
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="text-3xl mb-2">🧮</div>
              <h3 className="font-fredoka text-gray-800">Kalkulator</h3>
              <p className="text-sm text-gray-600">digital</p>
            </div>
            <div className="text-2xl text-gray-400">VS</div>
            <div className="text-center">
              <div className="text-3xl mb-2">📏</div>
              <h3 className="font-fredoka text-gray-800">Penggaris Kayu</h3>
              <p className="text-sm text-gray-600">non-digital</p>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 5,
    title: "Alat Digital Favoritmu?",
    content: (
      <div className="text-center">
        <div className="bg-gradient-to-r from-pink-100 to-purple-100 rounded-2xl p-8">
          <div className="text-5xl mb-6">🤔💭</div>
          <div className="space-y-4">
            <p className="text-xl text-gray-700">Alat digital apa yang paling kamu suka?</p>
            <p className="text-xl text-gray-700">Apa yang kamu lakukan pakai alat itu?</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 6,
    title: "Daftar Alat Digital Kita",
    content: (
      <div className="bg-yellow-50 rounded-2xl p-6">
        <p className="text-lg text-gray-700 text-center mb-6">
          Bersama-sama kita sebutkan alat digital yang pernah kita lihat:
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-3xl mb-2">📺</div>
            <p className="font-fredoka text-gray-800">TV</p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-3xl mb-2">📱</div>
            <p className="font-fredoka text-gray-800">Tablet</p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-3xl mb-2">📷</div>
            <p className="font-fredoka text-gray-800">Kamera Digital</p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-3xl mb-2">⌚</div>
            <p className="font-fredoka text-gray-800">Jam Digital</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 7,
    title: "Terima Kasih!",
    content: (
      <div className="text-center">
        <div className="bg-gradient-to-r from-green-100 to-blue-100 rounded-2xl p-8">
          <div className="text-5xl mb-6">🎉✨</div>
          <p className="text-lg text-gray-700 mb-6">Hari ini kamu belajar:</p>
          <ul className="text-left space-y-2 mb-6 inline-block">
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Mengenal alat digital di sekitar kita
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Membandingkan digital vs non-digital
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Menceritakan pengalaman dengan alat digital
            </li>
          </ul>
          <div className="bg-accent text-white text-xl font-fredoka py-4 px-6 rounded-2xl inline-block">
            Siap belajar lebih seru di lesson selanjutnya?
          </div>
        </div>
      </div>
    )
  }
];
