# Online Code Compiler Integration

Fitur online code compiler yang dapat diintegrasikan ke dalam aplikasi web existing.

## Fitur Utama

- **Multi-language Support**: Python, JavaScript, Java, C, HTML/CSS
- **Local Code Execution**: Tidak memerlukan API eksternal berbayar
- **Monaco Editor**: Code editor profesional dengan syntax highlighting
- **Theme Support**: Light/dark mode
- **Code Sharing**: Generate shareable links untuk code snippets
- **Responsive Design**: Works on desktop dan mobile

## Struktur File

```
compiler-integration/
├── frontend/               # Komponen React frontend
│   ├── components/        # Komponen UI utama
│   ├── lib/              # Utilities dan helpers
│   └── hooks/            # Custom React hooks
├── backend/              # API dan server logic
│   ├── routes/           # Express routes
│   └── storage/          # Database operations
├── shared/               # Shared types dan schemas
├── assets/               # Static assets
└── docs/                 # Dokumentasi integrasi
```

## Dependencies

### Frontend
- react, react-dom
- monaco-editor
- @tanstack/react-query
- tailwindcss
- lucide-react

### Backend  
- express
- typescript
- drizzle-orm (optional, untuk database)

## Quick Start

1. Copy files yang dibutuhkan ke project Anda
2. Install dependencies
3. Integrate komponen ke aplikasi existing
4. Setup API routes di backend
5. Configure database (optional)

## Dokumentasi Lengkap

Lihat folder `docs/` untuk panduan integrasi detail.