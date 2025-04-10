# Claude Helper Commands

## Project Startup

When you see any of these commands:
- `run`
- `open`
- `start`

Claude should execute:
```bash
npm install && npm run dev & sleep 5 && open http://localhost:3000
```

This will:
1. Install any missing dependencies
2. Start the Next.js development server
3. Wait 5 seconds for the server to initialize
4. Open the application in the default browser at http://localhost:3000

## Git Operations

When you see the command:
- `push`

Claude should execute:
```bash
git add . && git commit -m "Update: $(date '+%Y-%m-%d %H:%M') changes" && git push
```

This will:
1. Stage all changes
2. Create a commit with a timestamp
3. Push to the remote repository