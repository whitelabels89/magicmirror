export interface QuizQuestion {
  question: string;
  type: 'multiple' | 'text';
  options?: string[];
  correct?: number;
  placeholder?: string;
}

export const quizQuestionsL2: QuizQuestion[] = [
  {
    question: "Apa itu tap?",
    type: "multiple",
    options: [
      "Ketuk layar satu kali",
      "Geser benda di layar",
      "Usap layar ke samping",
      "Tekan layar lama"
    ],
    correct: 0
  },
  {
    question: "Jelaskan apa itu drag dengan contoh",
    type: "text",
    placeholder: "Contoh: tahan dan geser puzzle ke tempatnya..."
  },
  {
    question: "Apa itu swipe?",
    type: "multiple",
    options: [
      "Usap layar ke kiri/kanan/atas/bawah",
      "Ketuk layar dua kali",
      "Tekan layar dengan keras",
      "Menggoyangkan tablet"
    ],
    correct: 0
  },
  {
    question: "Sebutkan perbedaan drag dan swipe",
    type: "text",
    placeholder: "Jelaskan perbedaan antara drag dan swipe..."
  },
  {
    question: "Mengapa kita harus belajar tap, drag, dan swipe?",
    type: "multiple",
    options: [
      "Supaya bisa menggunakan tablet dengan mudah",
      "Supaya tablet tidak rusak",
      "Supaya tangan lebih kuat",
      "Supaya lebih pintar"
    ],
    correct: 0
  }
];