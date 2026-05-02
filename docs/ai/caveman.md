# Caveman (Claude Code)

**[Caveman](https://github.com/JuliusBrussee/caveman)** — Claude Code plugin + hooks that bias replies toward **fewer output tokens** (terse “caveman” style) while keeping technical content. Pairs well with token habits in [improve-claude-usage.md](./improve-claude-usage.md). Full feature list and science links: **upstream README**.

## Install

**Git Bash / macOS / Linux / WSL:**

```bash
curl -fsSL https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.sh | bash
```

**PowerShell (Windows):**

```powershell
irm https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.ps1 | iex
```

**This repo assumes Claude Code only** — if Cursor/Windsurf (or others) are installed, the default installer may also run `npx skills` and open an **interactive** skill picker. To **only** touch Claude Code:

```bash
curl -fsSL https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.sh | bash -s -- --only claude
```

Useful flags (see `install.sh --help` upstream): **`--minimal`** (plugin only, skip hooks/MCP extras), **`--dry-run`**.

**Manual (Claude Code):**

```bash
claude plugin marketplace add JuliusBrussee/caveman
claude plugin install caveman@caveman
```

Hooks-only path (without full installer): [caveman hooks README](https://github.com/JuliusBrussee/caveman).

## After install

1. **Restart Claude Code.**
2. Run **`/caveman`** (or say “caveman mode” / “talk like caveman”). Stop: “stop caveman” / “normal mode”.
3. **Levels:** `/caveman lite`, `/caveman full`, `/caveman ultra` (and wenyan variants — upstream docs).

Default installer also wires **hooks**, **statusline** badge, and optional **`caveman-shrink`** MCP (compresses MCP tool descriptions). **`--minimal`** skips those.

## Windows / Git Bash notes

- **SSH clone failed, HTTPS retry** during marketplace add — normal; install can still succeed.
- **msys symlink warning** — if hooks act odd, enable Windows **Developer Mode** or see [install-windows.md](https://github.com/JuliusBrussee/caveman/blob/main/docs/install-windows.md).
- If another IDE’s **`npx skills`** TUI is open and you only care about CC: **Ctrl+C** after Claude Code lines show success.

## Uninstall

Disable/remove the **caveman** plugin in Claude Code, remove hooks/MCP entries the installer added, or follow the **Uninstall** section in the [upstream README](https://github.com/JuliusBrussee/caveman#install).
