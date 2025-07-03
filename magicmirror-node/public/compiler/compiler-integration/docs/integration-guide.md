# Integration Guide - Online Code Compiler

## Prerequisites

Pastikan project Anda menggunakan:
- React 18+
- TypeScript
- Node.js 16+
- Modern bundler (Vite/Webpack/Next.js)

## 1. Install Dependencies

```bash
npm install monaco-editor @tanstack/react-query lucide-react clsx tailwind-merge
```

### Optional (untuk styling):
```bash
npm install tailwindcss class-variance-authority
```

## 2. Setup Monaco Editor Workers

Tambahkan ke `vite.config.js` atau webpack config:

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['monaco-editor']
  }
})
```

## 3. Integrate Frontend Components

### Basic Usage

```tsx
import { CodeEditor } from './components/code-editor'
import { OutputPanel } from './components/output-panel'
import { LanguageSelector } from './components/language-selector'
import { getDefaultLanguage } from './lib/languages'

function CompilerPage() {
  const [language, setLanguage] = useState(getDefaultLanguage())
  const [code, setCode] = useState(language.defaultCode)

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <LanguageSelector 
          selectedLanguage={language}
          onLanguageChange={setLanguage}
        />
        <CodeEditor
          language={language}
          code={code}
          onCodeChange={setCode}
        />
      </div>
      <div>
        <OutputPanel
          language={language}
          code={code}
        />
      </div>
    </div>
  )
}
```

## 4. Setup Backend API

### Express.js Integration

```javascript
// routes/compiler.js
import { registerRoutes } from './compiler-integration/backend/routes/routes'

const app = express()
app.use(express.json())

// Register compiler routes
registerRoutes(app)
```

### Custom API Implementation

Jika tidak menggunakan Express, implement endpoints berikut:

```
POST /api/execute
- Body: { language: string, code: string, languageId: number }
- Response: { id: number, output: string, error: string?, status: string, executionTime: string }

POST /api/share
- Body: { language: string, code: string, title?: string }
- Response: { shareId: string, url: string }

GET /api/shared/:shareId
- Response: { id: string, language: string, code: string, title?: string }
```

## 5. Environment Setup

### Required Environment Variables

```env
# Optional - untuk production database
DATABASE_URL=postgresql://user:pass@host:port/db

# Optional - untuk external code execution
JUDGE0_API_KEY=your_api_key
```

## 6. Styling Integration

### With Tailwind CSS

Copy classes yang digunakan atau sesuaikan dengan design system Anda.

### Without Tailwind

Ganti className dengan CSS modules atau styled-components:

```css
/* compiler.module.css */
.editor-container {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  height: 500px;
}

.output-panel {
  background: #f9fafb;
  padding: 16px;
}
```

## 7. Advanced Configuration

### Custom Language Support

Edit `frontend/lib/languages.ts`:

```typescript
export const SUPPORTED_LANGUAGES: Language[] = [
  // Add your custom languages
  {
    id: "golang",
    name: "go", 
    displayName: "Go",
    icon: "🐹",
    judge0Id: 60,
    filename: "main.go",
    extension: "go",
    defaultCode: `package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello World")\n}`
  }
]
```

### Custom Themes

Edit `frontend/lib/monaco-loader.ts` untuk menambah theme custom.

## 8. Production Considerations

### Performance
- Monaco Editor lazy loading
- Code execution rate limiting
- Output size limits

### Security
- Input sanitization
- Code execution sandboxing
- CORS configuration

### Monitoring
- Error tracking
- Usage analytics
- Performance monitoring

## Troubleshooting

### Common Issues

1. **Monaco Editor tidak load**
   - Check worker configuration
   - Verify bundle settings

2. **API calls failed**
   - Check CORS settings
   - Verify endpoint URLs

3. **Styling conflicts**
   - Use CSS modules
   - Namespace CSS classes

## Example Implementation

Lihat `docs/example-integration.tsx` untuk contoh implementasi lengkap.