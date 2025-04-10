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

When you see the command:
- `pull`

Claude should execute:
```bash
git pull origin main
```

And then analyze the new code by:
1. Checking what files have changed
2. Examining the content of those changes
3. Summarizing the updates to the codebase

## Project Management

When you see the command:
- `issues`

Claude should execute:
```bash
echo -e "\033[1;36m📋 BTC-TOOLING PROJECT ISSUES\033[0m\n"
# Get issues as JSON and format with jq
gh issue list --json number,title,labels,state,assignees --limit 100 | jq -r '.[] | "\(.number)|\(.title)|\(.labels[].name)|\(.state)|\(.assignees[].login // "unassigned")"' | sort -t'|' -k3,3 -k1,1n | while IFS='|' read -r num title label state assignee; do
  # Set icons and colors based on state and labels
  if [[ "$state" == "CLOSED" ]]; then
    icon="✅"
    color="\033[0;32m" # green
  elif [[ "$label" == *"bug"* ]]; then
    icon="🐛"
    color="\033[0;31m" # red
  elif [[ "$label" == *"feature"* ]]; then
    icon="🚀"
    color="\033[0;36m" # cyan
  elif [[ "$label" == *"enhancement"* ]]; then
    icon="⭐"
    color="\033[0;33m" # yellow
  else
    icon="📌"
    color="\033[0;37m" # white
  fi
  
  # Print formatted issue
  printf "${color}%s #%-3s %s %s\033[0m\n" "$icon" "$num" "$title" "[$label]"
done
```

This will:
1. List all open GitHub issues for the repository
2. Show issues categorized with icons (✅ completed, 🐛 bug, 🚀 feature, ⭐ enhancement)
3. Use color coding to improve readability
4. Sort issues by type and number
5. Display a cleaner, more organized view