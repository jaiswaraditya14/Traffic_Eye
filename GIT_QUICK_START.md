# 🚀 Git Quick Start Guide — Traffic Eye

Welcome to the **Traffic Eye** project! This guide will help you get started with Git in just a few minutes. Your branch has already been created — follow the steps below to switch to it, stay up-to-date with `main`, and push your changes.

---

## 📋 Prerequisites

- **Git** installed on your machine → [Download Git](https://git-scm.com/downloads)
- Access to the **Traffic_Eye** repository on GitHub
- Your branch name (ask the team lead if unsure)

---

## 1️⃣ Clone the Repository (First Time Only)

If you haven't cloned the repo yet, run:

```bash
git clone https://github.com/<org-or-username>/Traffic_Eye.git
cd Traffic_Eye
```

> [!NOTE]
> Replace `<org-or-username>` with the actual GitHub username or organization name.

---

## 2️⃣ Switch to Your Branch

Your branch has already been created. Simply switch to it:

```bash
git checkout <your-branch-name>
```

**Example:**

```bash
git checkout feature/aditya-ui
```

To verify you're on the correct branch:

```bash
git branch
```

The active branch will be marked with a `*`.

---

## 3️⃣ Fetch & Sync Latest Changes from `main`

Before you start working, always pull the latest changes from `main` to avoid conflicts:

```bash
# Fetch all remote updates
git fetch origin

# Merge the latest main into your branch
git merge origin/main
```

> [!IMPORTANT]
> Do this **every time** before you start working to stay up-to-date.

If there are merge conflicts, Git will notify you. Resolve them in your editor, then:

```bash
git add .
git commit -m "Resolved merge conflicts with main"
```

---

## 4️⃣ Make Your Changes

Edit, add, or delete files as needed for your task. Once you're done, check what changed:

```bash
git status
```

---

## 5️⃣ Stage, Commit & Push Your Changes

### Stage your changes:

```bash
# Stage all changes
git add .

# Or stage specific files
git add path/to/file.js
```

### Commit with a meaningful message:

```bash
git commit -m "Brief description of what you changed"
```

**Good commit message examples:**

- `"Added login screen UI"`
- `"Fixed GPS location fallback bug"`
- `"Updated onboarding carousel images"`

### Push to your branch:

```bash
git push origin <your-branch-name>
```

**Example:**

```bash
git push origin feature/aditya-ui
```

---

## 🔄 Daily Workflow Summary

Here's your everyday workflow in a nutshell:

```
┌─────────────────────────────────────────────┐
│  1. git checkout <your-branch>              │
│  2. git fetch origin                        │
│  3. git merge origin/main                   │
│  4. ✏️  Make your changes                    │
│  5. git add .                               │
│  6. git commit -m "your message"            │
│  7. git push origin <your-branch>           │
└─────────────────────────────────────────────┘
```

---

## ⚠️ Common Issues & Fixes

| Problem | Solution |
|---|---|
| **"fatal: not a git repository"** | Make sure you're inside the `Traffic_Eye` folder |
| **"Your branch is behind"** | Run `git pull origin <your-branch>` |
| **Merge conflicts** | Open conflicting files, resolve manually, then `git add .` and `git commit` |
| **"Permission denied"** | Make sure your GitHub account has access to the repo |
| **Accidentally on wrong branch** | Run `git stash`, switch branch, then `git stash pop` |

---

## 🚫 Things to Avoid

- ❌ **Do NOT push directly to `main`** — always work on your own branch.
- ❌ **Do NOT force push** (`git push --force`) unless you know exactly what you're doing.
- ❌ **Do NOT commit sensitive files** (API keys, `.env` files, etc.).

---

## 📬 Need Help?

If you're stuck, reach out to the team lead or check the [Git documentation](https://git-scm.com/doc).

Happy coding! 🎉
