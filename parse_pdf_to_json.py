import sys
import json

try:
    import fitz  # PyMuPDF

    def extract_text(path: str) -> str:
        doc = fitz.open(path)
        text = ""
        for page in doc:
            text += page.get_text("text") + "\n"
        doc.close()
        return text
except Exception:  # pragma: no cover - fallback when PyMuPDF is missing
    import re

    def extract_text(path: str) -> str:
        """Very naive text extractor for simple PDFs.

        It looks for strings inside text drawing operators (Tj/TJ). This is not
        a complete PDF parser but allows basic extraction without external
        dependencies when PyMuPDF is unavailable.
        """
        with open(path, "rb") as f:
            content = f.read().decode("latin1", errors="ignore")

        # Collect strings within parentheses used by Tj/TJ operators
        parts = []
        for txt in re.findall(r"\(([^)]{1,200})\)\s*Tj", content):
            parts.append(txt)
        for arr in re.findall(r"\[(.*?)\]\s*TJ", content):
            for txt in re.findall(r"\(([^)]{1,200})\)", arr):
                parts.append(txt)

        return "\n".join(parts)

if __name__ == '__main__':
    # order: materi+kode, soal, jawaban, lesson_id, lesson_title
    materi_path, soal_path, answer_path, lesson_id, lesson_title = sys.argv[1:6]
    materi = extract_text(materi_path)
    soal = extract_text(soal_path)
    jawaban = extract_text(answer_path)

    slides = []
    for idx, chunk in enumerate(materi.split('\n\n')):
        chunk = chunk.strip()
        if not chunk:
            continue
        slides.append({"title": f"Slide {idx+1}", "text": chunk})

    quiz_part_1 = [q.strip() for q in soal.split('\n') if q.strip()]
    quiz_part_2 = [a.strip() for a in jawaban.split('\n') if a.strip()]

    data = {
        "lesson_id": lesson_id,
        "lesson_title": lesson_title,
        "slides": slides,
        "quiz_part_1": quiz_part_1,
        "quiz_part_2": quiz_part_2,
    }
    print(json.dumps(data))
