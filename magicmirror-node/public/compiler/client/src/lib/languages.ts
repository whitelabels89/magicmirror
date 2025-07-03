import type { Language } from "@shared/schema";

export const SUPPORTED_LANGUAGES: Language[] = [
  {
    id: "python",
    name: "python",
    displayName: "Python",
    icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzMwNzZhYSI+PHBhdGggZD0iTTEyIDJjLS44IDAtMS41LjctMS41IDEuNXY1aDNWN2gtMS41YzAtLjMuMy0uNS41LS41czEuNS0uNSAxLjUtLjVINiA5djNIMThjLjguMCAxLjUtLjcgMS41LTEuNVYzLjVjMC0uOC0uNy0xLjUtMS41LTEuNWgtNnptLTUgMTJjLS44IDAtMS41LjctMS41IDEuNXY1YzAgLjguNyAxLjUgMS41IDEuNWg2YzAtLjggMC0xLjUgMC0xLjVzMC0uNS41LS41IDEuNS41IDEuNS41aDEuNWMuOCAwIDEuNS0uNyAxLjUtMS41di01YzAtLjgtLjctMS41LTEuNS0xLjVINy41em0tMyAxaDNjLjMgMCAuNS4yLjUuNXMtLjIuNS0uNS41aC0zVjE1em0xMiAxYy4zIDAgLjUuMi41LjVzLS4yLjUtLjUuNWgtMVYxNWgxeiIvPjwvc3ZnPg==",
    judge0Id: 71,
    filename: "main.py",
    extension: "py",
    defaultCode: `# Online Python compiler (interpreter) to run Python online.
# Write Python 3 code in this online editor and run it.

print("Welcome to Queen's Academy iCoding!")`
  },
  {
    id: "javascript",
    name: "javascript",
    displayName: "JavaScript",
    icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2Y3ZGYxZSI+PHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjZjdkZjFlIiByeD0iMyIvPjx0ZXh0IHg9IjEyIiB5PSIxNiIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0iIzAwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+SlM8L3RleHQ+PC9zdmc+",
    judge0Id: 63,
    filename: "main.js",
    extension: "js",
    defaultCode: `// Online JavaScript compiler (interpreter) to run JavaScript online.
// Write JavaScript code in this online editor and run it.

console.log("Welcome to Queen's Academy iCoding!");`
  },
  {
    id: "java",
    name: "java",
    displayName: "Java",
    icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2VkOGIwMCI+PHBhdGggZD0iTTEyIDJjLTIuMiAwLTQgMS44LTQgNHM0IDEwIDQgMTBzNC03LjggNC0xMFMxNC4yIDIgMTIgMnptMCAxNmMtLjYgMC0xLS40LTEtMXMuNC0xIDEtMSAxIC40IDEgMS0uNCAxLTEgMXptMS0zSDExVjhjMC0uNi40LTEgMS0xczEgLjQgMSAxdjZ6Ii8+PC9zdmc+",
    judge0Id: 62,
    filename: "Main.java",
    extension: "java",
    defaultCode: `// Online Java compiler (interpreter) to run Java online.
// Write Java code in this online editor and run it.

public class Main {
    public static void main(String[] args) {
        System.out.println("Welcome to Queen's Academy iCoding!");
    }
}`
  },
  {
    id: "c",
    name: "c",
    displayName: "C",
    icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzAwNTk5YyI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiMwMDU5OWMiLz48dGV4dCB4PSIxMiIgeT0iMTYiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5DPC90ZXh0Pjwvc3ZnPg==",
    judge0Id: 50,
    filename: "main.c",
    extension: "c",
    defaultCode: `// Online C compiler (interpreter) to run C online.
// Write C code in this online editor and run it.

#include <stdio.h>

int main() {
    printf("Welcome to Queen's Academy iCoding!\\n");
    return 0;
}`
  },
  {
    id: "html",
    name: "html",
    displayName: "HTML/CSS",
    icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2U1NGMyNyI+PHBhdGggZD0iTTMgMmgxOGwtMS42IDE2TDEyIDIwIDQuNiAxOEwzIDJ6bTQuNCA0bDEuMiAxMkg5bC44LThoLTEuNEw3LjQgNnptNi4yIDBoMS40bC0uOCA4SDEzTDE0LjIgNnptLTIuNiAyaC0ydjJoMlY4eiIvPjwvc3ZnPg==",
    judge0Id: -1,
    filename: "index.html",
    extension: "html",
    defaultCode: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HTML/CSS Editor</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            text-align: center;
            margin-top: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .message {
            font-size: 28px;
            font-weight: bold;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
    </style>
</head>
<body>
    <div class="message">Welcome to Queen's Academy iCoding!</div>
</body>
</html>`
  }
];

export const getLanguageById = (id: string): Language | undefined => {
  return SUPPORTED_LANGUAGES.find(lang => lang.id === id);
};

export const getDefaultLanguage = (): Language => {
  return SUPPORTED_LANGUAGES[0]; // Python
};
