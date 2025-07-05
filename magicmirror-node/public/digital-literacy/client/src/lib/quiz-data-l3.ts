export interface QuizQuestion {
  question: string;
  type: 'multiple' | 'text';
  options?: string[];
  correct?: number;
  placeholder?: string;
}

export const quizQuestionsL3: QuizQuestion[] = [
  {
    question: "Berapa lama waktu aman bermain gadget dalam sekali waktu?",
    type: "multiple",
    options: [
      "15 menit",
      "30 menit",
      "1 jam",
      "2 jam"
    ],
    correct: 1
  },
  {
    question: "Kenapa kita harus istirahat setelah main gadget?",
    type: "text",
    placeholder: "Tuliskan alasan mengapa kita perlu istirahat..."
  },
  {
    question: "Apa yang bisa terjadi kalau main gadget terlalu lama?",
    type: "multiple",
    options: [
      "Mata lelah dan kepala pusing",
      "Badan jadi kuat",
      "Tidur lebih nyenyak",
      "Tidak ada efek apa-apa"
    ],
    correct: 0
  },
  {
    question: "Sebutkan 2 cara menjaga mata tetap sehat saat pakai gadget",
    type: "text",
    placeholder: "Contoh: Senam mata dan..."
  },
  {
    question: "Bagaimana posisi duduk yang benar saat main gadget?",
    type: "multiple",
    options: [
      "Tiduran di kasur",
      "Duduk di lantai",
      "Punggung lurus, kaki menyentuh lantai, layar sejajar mata",
      "Berdiri sambil main"
    ],
    correct: 2
  },
  {
    question: "Berapa lama waktu istirahat yang disarankan setelah main gadget?",
    type: "multiple",
    options: [
      "1-2 menit",
      "5-10 menit",
      "15-20 menit",
      "30 menit"
    ],
    correct: 1
  },
  {
    question: "Apa yang harus dilakukan saat mata mulai lelah?",
    type: "multiple",
    options: [
      "Terus main sampai selesai",
      "Berhenti main, istirahat, dan minum air",
      "Pindah ke ruangan yang lebih gelap",
      "Mainkan game yang berbeda"
    ],
    correct: 1
  },
  {
    question: "Sebutkan 3 langkah senam mata yang mudah",
    type: "text",
    placeholder: "1. Lihat jauh ke luar jendela, 2. ..."
  },
  {
    question: "Mengapa layar gadget harus sejajar dengan mata?",
    type: "multiple",
    options: [
      "Supaya terlihat lebih besar",
      "Supaya tidak sakit leher dan mata",
      "Supaya bisa main lebih lama",
      "Supaya suara lebih keras"
    ],
    correct: 1
  },
  {
    question: "Apa yang paling penting saat menggunakan gadget?",
    type: "multiple",
    options: [
      "Menang dalam game",
      "Mengatur waktu dan menjaga kesehatan",
      "Bermain sampai baterai habis",
      "Main tanpa istirahat"
    ],
    correct: 1
  }
];