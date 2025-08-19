# Suggested Commands for Ramensearch Project

## Development
- `pnpm dev` - Start development server
- `pnpm build` - Build for production  
- `pnpm preview` - Preview production build
- `pnpm analyze` - Analyze bundle size

## Environment Setup
1. Copy `.env.example` to `.env.local`
2. Set `VITE_GOOGLE_MAPS_API_KEY` in `.env.local`
3. Set `GEMINI_API_KEY` if using AI features

## Testing & Quality
- `pnpm typecheck` - TypeScript type checking (if script exists)
- Manual testing required (no automated tests currently)

## Deployment
- Vercel deployment via git push
- Ensure environment variables are set in Vercel dashboard

## Troubleshooting
- Check browser console for Google Maps API errors
- Verify API key has proper restrictions (JavaScript origins)
- Ensure API key has Maps JavaScript API and Places API enabled

## Windows-specific Commands
- `dir` - List files
- `type filename` - View file contents  
- `findstr /s "text" *.ts *.tsx` - Search in files
- Use PowerShell for better terminal experience