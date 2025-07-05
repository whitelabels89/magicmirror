export interface QuizQuestion {
  question: string;
  type: 'multiple' | 'text';
  options?: string[];
  correct?: number;
  placeholder?: string;
}

export const quizQuestionsL4: QuizQuestion[] = [
  {
    question: "Apa itu aplikasi edukasi?",
    type: "text",
    placeholder: "Jelaskan dengan bahasamu sendiri..."
  },
  {
    question: "Manakah yang merupakan contoh aplikasi belajar?",
    type: "multiple",
    options: [
      "Game puzzle alfabet",
      "Video kartun biasa", 
      "Musik pop",
      "Film action"
    ],
    correct: 0
  },
  {
    question: "Sebutkan 2 contoh aplikasi belajar yang kamu ketahui:",
    type: "text",
    placeholder: "Contoh: game angka, puzzle huruf..."
  },
  {
    question: "Apa yang membuat aplikasi belajar menjadi seru?",
    type: "multiple",
    options: [
      "Ada suara dan gambar menarik",
      "Tidak ada suara sama sekali",
      "Hanya tulisan saja",
      "Tidak bisa dimainkan"
    ],
    correct: 0
  },
  {
    question: "Kenapa kita harus mencoba aplikasi edukasi?",
    type: "text",
    placeholder: "Tuliskan alasanmu..."
  },
  {
    question: "Apa perbedaan aplikasi edukasi dengan game biasa?",
    type: "multiple",
    options: [
      "Aplikasi edukasi membantu kita belajar",
      "Tidak ada perbedaan",
      "Game biasa lebih sulit",
      "Aplikasi edukasi tidak menyenangkan"
    ],
    correct: 0
  },
  {
    question: "Apa yang bisa kamu pelajari dari aplikasi belajar?",
    type: "text",
    placeholder: "Contoh: huruf, angka, warna..."
  },
  {
    question: "Bagaimana cara menggunakan aplikasi belajar?",
    type: "multiple",
    options: [
      "Tap huruf/angka dan ikuti instruksi",
      "Hanya melihat saja",
      "Mendengarkan musik",
      "Tidak perlu melakukan apa-apa"
    ],
    correct: 0
  },
  {
    question: "Hal baru apa yang kamu pelajari hari ini?",
    type: "text",
    placeholder: "Ceritakan 3 hal yang kamu pelajari..."
  },
  {
    question: "Apakah kamu ingin mencoba aplikasi belajar lagi?",
    type: "multiple",
    options: [
      "Ya, karena seru dan bisa belajar",
      "Tidak, karena membosankan",
      "Mungkin nanti",
      "Tidak tahu"
    ],
    correct: 0
  }
];