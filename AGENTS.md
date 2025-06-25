# AGENTS.md

## Scope
This project is a React + Three.js application. The user handles all Node.js
commands locally; agents should avoid running any npm, npx, or build-related
commands in the Codex environment.

## Allowed Commands
- Standard Git workflow (`git status`, `git add`, `git commit`, etc.).
- `git pull` is allowed so the agent can fetch updates when instructed.

## Forbidden Commands
- **Do NOT** run `npm install`, `npm run`, `npx`, or any similar commands.
- Avoid calling `vite` or other development servers.
- No commands that require network access or dependency installation.

## Testing
There are no automated tests to run in Codex. The user will run `npm run build`
or other scripts locally.

By following this file, agents will restrict themselves to Git operations only,
allowing the user to manage builds and testing on their own machine.
