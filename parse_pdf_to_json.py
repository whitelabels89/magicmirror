import sys, json
import fitz  # PyMuPDF


def extract_text(path):
    doc = fitz.open(path)
    text = ""
    for page in doc:
        text += page.get_text("text") + "\n"
    doc.close()
    return text

if __name__ == '__main__':
    materi_path, contoh_path, soal_path, lesson_id, lesson_title = sys.argv[1:6]
    materi = extract_text(materi_path)
    contoh = extract_text(contoh_path)
    soal = extract_text(soal_path)

    slides = []
    for idx, chunk in enumerate(materi.split('\n\n')):
        chunk = chunk.strip()
        if not chunk:
            continue
        slides.append({"title": f"Slide {idx+1}", "text": chunk})
    # attach contoh code to last slide if available
    if contoh.strip():
        slides.append({"title": "Contoh Kode", "code": contoh.strip()})

    quiz_lines = [q.strip() for q in soal.split('\n') if q.strip()]
    quiz_part_1 = quiz_lines[:len(quiz_lines)//2]
    quiz_part_2 = quiz_lines[len(quiz_lines)//2:]

    data = {
        "lesson_id": lesson_id,
        "lesson_title": lesson_title,
        "slides": slides,
        "quiz_part_1": quiz_part_1,
        "quiz_part_2": quiz_part_2,
    }
    print(json.dumps(data))
