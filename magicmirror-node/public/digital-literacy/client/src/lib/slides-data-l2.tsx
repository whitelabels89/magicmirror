import { Slide } from "./slides-data";
import VideoPlayer from "@/components/video-player";
import AnimatedGesture from "@/components/animated-gesture";

export const slidesL2: Slide[] = [
  {
    id: 1,
    title: "Belajar Gerakan di Tablet 🌸",
    content: (
      <div className="text-center">
        <div className="text-6xl mb-6">👆✨👉</div>
        <p className="text-xl text-gray-700 mb-4">Hari ini kita belajar:</p>
        <div className="bg-gradient-to-r from-pink-100 to-purple-100 text-2xl font-fredoka py-6 px-8 rounded-2xl inline-block">
          Tap, Drag, dan Swipe dengan seru!
        </div>
      </div>
    )
  },
  {
    id: 2,
    title: "Apa itu Tap? 👆",
    hasVideo: true,
    content: (
      <div className="space-y-6">
        <VideoPlayer
          title="Belajar Gerakan Tap"
          description="Video demonstrasi cara melakukan tap yang benar"
          className="mb-6"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 rounded-2xl p-6 text-center">
            <div className="text-4xl mb-4">👆</div>
            <h3 className="text-xl font-fredoka text-gray-800 mb-4">Tap = ketuk layar satu kali</h3>
            <p className="text-gray-600">Contoh: buka aplikasi dengan tap ikon</p>
          </div>
          <div className="flex items-center justify-center">
            <AnimatedGesture type="tap" size="md" />
          </div>
        </div>
        <div className="bg-white border-2 border-blue-200 rounded-xl p-6">
          <div className="flex items-center justify-center space-x-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center text-white text-2xl mb-2">📱</div>
              <p className="text-sm text-gray-600">Ketuk sekali</p>
            </div>
            <div className="text-3xl text-gray-400">→</div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-xl flex items-center justify-center text-white text-2xl mb-2">✅</div>
              <p className="text-sm text-gray-600">Aplikasi terbuka</p>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 3,
    title: "Apa itu Drag? ✨",
    hasVideo: true,
    content: (
      <div className="space-y-6">
        <VideoPlayer
          title="Belajar Gerakan Drag"
          description="Video demonstrasi cara melakukan drag yang benar"
          className="mb-6"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-purple-50 rounded-2xl p-6 text-center">
            <div className="text-4xl mb-4">✨</div>
            <h3 className="text-xl font-fredoka text-gray-800 mb-4">Drag = tahan & geser benda di layar</h3>
            <p className="text-gray-600">Contoh: geser puzzle ke tempatnya</p>
          </div>
          <div className="flex items-center justify-center">
            <AnimatedGesture type="drag" size="md" />
          </div>
        </div>
        <div className="bg-white border-2 border-purple-200 rounded-xl p-6">
          <div className="flex items-center justify-center space-x-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-500 rounded-xl flex items-center justify-center text-white text-2xl mb-2">🧩</div>
              <p className="text-sm text-gray-600">Tahan & geser</p>
            </div>
            <div className="text-3xl text-gray-400">↗️</div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-xl flex items-center justify-center text-white text-2xl mb-2">🎯</div>
              <p className="text-sm text-gray-600">Puzzle tersusun</p>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 4,
    title: "Apa itu Swipe? 👉",
    hasVideo: true,
    content: (
      <div className="space-y-6">
        <VideoPlayer
          title="Belajar Gerakan Swipe"
          description="Video demonstrasi cara melakukan swipe yang benar"
          className="mb-6"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-green-50 rounded-2xl p-6 text-center">
            <div className="text-4xl mb-4">👉</div>
            <h3 className="text-xl font-fredoka text-gray-800 mb-4">Swipe = usap layar ke kiri/kanan/atas/bawah</h3>
            <p className="text-gray-600">Contoh: ganti gambar di galeri</p>
          </div>
          <div className="flex items-center justify-center">
            <AnimatedGesture type="swipe" size="md" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border-2 border-green-200 rounded-xl p-4 text-center">
            <div className="text-3xl mb-2">⬅️</div>
            <p className="text-sm text-gray-600">Swipe kiri</p>
          </div>
          <div className="bg-white border-2 border-green-200 rounded-xl p-4 text-center">
            <div className="text-3xl mb-2">➡️</div>
            <p className="text-sm text-gray-600">Swipe kanan</p>
          </div>
          <div className="bg-white border-2 border-green-200 rounded-xl p-4 text-center">
            <div className="text-3xl mb-2">⬆️</div>
            <p className="text-sm text-gray-600">Swipe atas</p>
          </div>
          <div className="bg-white border-2 border-green-200 rounded-xl p-4 text-center">
            <div className="text-3xl mb-2">⬇️</div>
            <p className="text-sm text-gray-600">Swipe bawah</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 5,
    title: "Kenapa Kita Harus Bisa?",
    content: (
      <div className="text-center">
        <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-2xl p-8">
          <div className="text-5xl mb-6">🤔💡</div>
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 flex items-center space-x-4">
              <div className="text-3xl">🎮</div>
              <p className="text-lg text-gray-700">Supaya bisa main game belajar</p>
            </div>
            <div className="bg-white rounded-lg p-4 flex items-center space-x-4">
              <div className="text-3xl">✍️</div>
              <p className="text-lg text-gray-700">Bisa latihan menulis digital</p>
            </div>
            <div className="bg-white rounded-lg p-4 flex items-center space-x-4">
              <div className="text-3xl">📱</div>
              <p className="text-lg text-gray-700">Bisa buka aplikasi dengan mudah</p>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 6,
    title: "Yuk, Kita Coba!",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-gray-700 text-center mb-6">
          Mari kita praktik gerakan dasar!
        </p>
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-blue-50 rounded-xl p-6 text-center">
            <div className="text-4xl mb-4">👆</div>
            <h3 className="text-lg font-fredoka text-gray-800 mb-2">Tap</h3>
            <p className="text-gray-600">Ketuk balon yang muncul</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-6 text-center">
            <div className="text-4xl mb-4">✨</div>
            <h3 className="text-lg font-fredoka text-gray-800 mb-2">Drag</h3>
            <p className="text-gray-600">Geser puzzle ke tempatnya</p>
          </div>
          <div className="bg-green-50 rounded-xl p-6 text-center">
            <div className="text-4xl mb-4">👉</div>
            <h3 className="text-lg font-fredoka text-gray-800 mb-2">Swipe</h3>
            <p className="text-gray-600">Usap layar ganti gambar</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 7,
    title: "Terima Kasih! 🌟",
    content: (
      <div className="text-center">
        <div className="bg-gradient-to-r from-green-100 to-blue-100 rounded-2xl p-8">
          <div className="text-5xl mb-6">🎉✨</div>
          <p className="text-lg text-gray-700 mb-6">Hari ini kamu belajar:</p>
          <ul className="text-left space-y-2 mb-6 inline-block">
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Tap, Drag, dan Swipe
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Cara menggunakannya
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Latihan gerakan dasar di layar
            </li>
          </ul>
          <div className="bg-accent text-white text-xl font-fredoka py-4 px-6 rounded-2xl inline-block">
            Yuk terus belajar di rumah! 🌟
          </div>
        </div>
      </div>
    )
  }
];