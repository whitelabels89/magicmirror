// Opsional: mapping path absolut -> { course_id, lesson_id }
// Boleh dikosongkan; kalau ada entri, harus override deteksi otomatis.
window.LESSON_MANIFEST = {
  "/elearn/calistung/level/A1.html": { course_id: "numbers-basic", lesson_id: "L1" },
  "/elearn/calistung/level/A2.html": { course_id: "numbers-basic", lesson_id: "L2" },
  // Contoh lainnya:
  // "/elearn/worlds/calistung/number/A4a.html": { course_id: "numbers-basic", lesson_id: "L4" },
  // "/elearn/worlds/calistung/number/B2.html": { course_id: "numbers-basic", lesson_id: "L7" },
};
