export interface QuizQuestion {
  question: string;
  type: 'multiple' | 'text';
  options?: string[];
  correct?: number;
  placeholder?: string;
}

export const quizQuestions: QuizQuestion[] = [
  {
    question: "Apa itu alat digital?",
    type: "multiple",
    options: [
      "Alat yang menggunakan layar dan teknologi",
      "Alat yang terbuat dari kayu",
      "Alat yang tidak membutuhkan listrik",
      "Alat yang sangat berat"
    ],
    correct: 0
  },
  {
    question: "Sebutkan 3 contoh alat digital",
    type: "text",
    placeholder: "Tulis 3 alat digital yang kamu tahu..."
  },
  {
    question: "Apa perbedaan jam digital dengan jam analog?",
    type: "multiple",
    options: [
      "Jam digital menggunakan angka, jam analog menggunakan jarum",
      "Jam digital lebih mahal",
      "Jam analog lebih akurat",
      "Tidak ada perbedaan"
    ],
    correct: 0
  },
  {
    question: "Mengapa handphone termasuk alat digital?",
    type: "multiple",
    options: [
      "Karena menggunakan layar dan teknologi digital",
      "Karena berwarna hitam",
      "Karena bisa dibawa kemana-mana",
      "Karena mahal harganya"
    ],
    correct: 0
  },
  {
    question: "Sebutkan satu alat non-digital",
    type: "text",
    placeholder: "Contoh: pensil, buku, dll..."
  },
  {
    question: "Apa fungsi dari kalkulator digital?",
    type: "multiple",
    options: [
      "Untuk menghitung angka",
      "Untuk bermain game",
      "Untuk menonton video",
      "Untuk mendengarkan musik"
    ],
    correct: 0
  },
  {
    question: "Mengapa TV disebut alat digital?",
    type: "multiple",
    options: [
      "Karena menggunakan layar dan sinyal digital",
      "Karena bentuknya kotak",
      "Karena ada remotenya",
      "Karena bisa menyala"
    ],
    correct: 0
  },
  {
    question: "Mana yang termasuk alat digital?",
    type: "multiple",
    options: [
      "Tablet",
      "Buku cerita",
      "Pensil",
      "Kertas"
    ],
    correct: 0
  },
  {
    question: "Sebutkan alat digital favoritmu dan alasannya",
    type: "text",
    placeholder: "Contoh: Tablet, karena bisa digunakan untuk belajar dan bermain..."
  },
  {
    question: "Bagaimana cara membedakan alat digital dan non-digital?",
    type: "multiple",
    options: [
      "Alat digital menggunakan layar dan listrik",
      "Alat digital lebih berat",
      "Alat digital selalu berwarna hitam",
      "Alat digital selalu mahal"
    ],
    correct: 0
  }
];
