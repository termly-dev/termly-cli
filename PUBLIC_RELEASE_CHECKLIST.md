# Public Release Checklist

Пошаговая инструкция для безопасной публикации репозитория Termly CLI.

---

## ✅ Pre-Release Security Audit (Completed)

- [x] Проверить отсутствие секретов в коде (API keys, tokens, passwords)
- [x] Проверить отсутствие чувствительных файлов (.env, credentials, keys)
- [x] Проверить git историю на случайно закоммиченные секреты
- [x] Проверить package.json на приватные зависимости
- [x] Убрать локальные настройки IDE (.claude/, .grok/)
- [x] Проверить CRYPTO_SPEC.md (только публичные стандарты)
- [x] Убедиться что все email используют hello@termly.dev

---

## ✅ Documentation (Completed)

- [x] README.md обновлен с актуальной информацией
- [x] SECURITY.md создан (политика безопасности)
- [x] CONTRIBUTING.md создан (гайд для контрибьюторов)
- [x] CHANGELOG.md создан (история версий)
- [x] LICENSE добавлен (MIT)
- [x] CLAUDE.md актуален
- [x] docs/ARCHITECTURE.md актуален

---

## ✅ GitHub Templates (Completed)

- [x] Issue templates (bug report, feature request, AI tool request)
- [x] Pull request template
- [x] GitHub funding (Ko-fi)
- [x] Issue config (ссылки на security, discussions, docs)

---

## ✅ Repository Configuration (Completed)

- [x] .gitignore настроен правильно
- [x] .npmignore настроен правильно
- [x] .gitattributes для line endings
- [x] Git tag v1.3.0 создан

---

## 🚀 Making Repository Public (Todo)

### Step 1: Enable GitHub Security Features

**Before** making repository public, enable:

```bash
# Через GitHub CLI
gh repo edit termly-dev/termly-cli \
  --enable-issues \
  --enable-discussions \
  --enable-wiki=false
```

**Или через веб-интерфейс:**

1. **Settings → General → Features**
   - [x] Issues
   - [x] Discussions (для вопросов сообщества)
   - [ ] Wiki (не нужен, есть docs/)
   - [x] Projects (опционально)

2. **Settings → Security & Analysis**
   - [x] Dependency graph
   - [x] Dependabot alerts
   - [x] Dependabot security updates
   - [x] Secret scanning (GitHub Advanced Security)
   - [x] Code scanning (CodeQL - опционально)

3. **Settings → Code security and analysis**
   - [x] Private vulnerability reporting (Enable)

### Step 2: Configure Branch Protection

**Настройте защиту ветки main:**

```bash
# Через GitHub CLI (базовая защита)
gh api repos/termly-dev/termly-cli/branches/main/protection \
  -X PUT \
  -f required_status_checks='{"strict":false,"contexts":[]}' \
  -f enforce_admins=true \
  -f required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
  -f restrictions=null \
  -f allow_force_pushes=false \
  -f allow_deletions=false
```

**Или через веб-интерфейс:**

Settings → Branches → Add rule (для `main`):

**Protect matching branches:**
- [x] Require a pull request before merging
  - [x] Require approvals (1)
  - [x] Dismiss stale pull request approvals when new commits are pushed
  - [ ] Require review from Code Owners (если есть CODEOWNERS)
- [ ] Require status checks to pass (если настроите CI/CD)
- [x] Require conversation resolution before merging
- [x] Require linear history (опционально)
- [ ] Include administrators (опционально - строго)
- [x] Do not allow bypassing the above settings
- [x] Restrict who can push to matching branches (только вы или команда)

### Step 3: Setup Repository Settings

**Settings → General:**

1. **Default branch:** main ✅

2. **Pull Requests:**
   - [x] Allow merge commits (рекомендуется)
   - [x] Allow squash merging (рекомендуется для мелких PR)
   - [x] Allow rebase merging (опционально)
   - [x] Always suggest updating pull request branches
   - [x] Automatically delete head branches

   **Note:** Минимум одна опция должна быть включена. Если у вас "Require linear history" в branch protection, то нужно оставить только squash или rebase.

3. **Archives:**
   - [ ] Do NOT include Git LFS objects in archives (экономит место)

4. **Pushes:**
   - [x] Limit how many branches and tags can be updated in a single push (5)

### Step 4: Create GitHub Release

Создайте release для v1.3.0:

```bash
gh release create v1.3.0 \
  --title "v1.3.0 - Public Release" \
  --notes "$(cat <<'EOF'
# Termly CLI v1.3.0 - Public Release

## 🎉 First Public Release!

Termly CLI is now open source! Mirror your AI coding sessions to mobile - control Claude Code, Aider, GitHub Copilot, and 20+ tools from your phone.

## ✨ What's New in v1.3

- **No Build Tools Required** - Prebuilt binaries for all platforms (Windows, macOS, Linux)
- **Fast Installation** - 10-30 seconds instead of minutes
- **Improved Windows Support** - Fixed PATH issues, ConPTY optimizations
- **Auto-Update Check** - CLI version validation on startup
- **Enhanced Terminal Handling** - Better resize management and output normalization

## 📦 Installation

```bash
npm install -g @termly-dev/cli
```

That's it! Works out-of-the-box on all platforms.

## 🚀 Quick Start

```bash
cd /path/to/your/project
termly start
```

## 🤖 Supported AI Tools (20+)

- Claude Code, Aider, GitHub Copilot
- Google Gemini CLI, Grok CLI, OpenAI Codex
- Cursor, Cody, Amazon Q Developer
- And many more...

## 📚 Documentation

- [README.md](README.md) - Getting started
- [SECURITY.md](SECURITY.md) - Security policy
- [CONTRIBUTING.md](CONTRIBUTING.md) - How to contribute
- [CHANGELOG.md](CHANGELOG.md) - Full changelog
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - Technical architecture

## 🔒 Security

End-to-end encryption (AES-256-GCM + DH-2048) with zero-knowledge server architecture.

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📝 License

MIT License - see [LICENSE](LICENSE)

## 🌐 Links

- Website: https://termly.dev
- GitHub: https://github.com/termly-dev/termly-cli
- Issues: https://github.com/termly-dev/termly-cli/issues
- Support: hello@termly.dev
- Ko-fi: https://ko-fi.com/termly

---

Made with ❤️ by the Termly Team
EOF
)"
```

### Step 5: Make Repository Public

**ВАЖНО: Это необратимое действие!**

```bash
# Через GitHub CLI
gh repo edit termly-dev/termly-cli --visibility public
```

**Или через веб-интерфейс:**

1. Settings → General → Danger Zone
2. "Change repository visibility" → "Make public"
3. Подтвердите: введите `termly-dev/termly-cli`
4. Нажмите "I understand, make this repository public"

⚠️ **После публикации:**
- Вся история коммитов станет публичной
- Все Issues и Pull Requests станут публичными
- Репозиторий появится в поиске GitHub
- Нельзя вернуть обратно (можно сделать приватным, но история останется)

### Step 6: Post-Publication Setup

**1. Add Topics/Tags на GitHub:**

Settings → General → Topics:
```
cli, terminal, ai, coding-assistant, mobile, claude, aider,
github-copilot, encryption, nodejs, pty, websocket, e2ee
```

**2. Настройте Social Preview:**

Settings → General → Social preview:
- Создайте или загрузите изображение (1280x640px)
- Показывается при шаре на Twitter/LinkedIn

**3. Создайте Discussion Categories:**

Settings → Discussions → New category:
- 💬 General - Общие вопросы
- 💡 Ideas - Идеи и предложения
- 🙏 Q&A - Вопросы и ответы
- 📣 Announcements - Объявления (только maintainers)
- 🐛 Bug Reports - Обсуждение багов

**4. Настройте CODEOWNERS (опционально):**

Создайте `.github/CODEOWNERS`:
```
# Владельцы кода - автоматически запрашиваются на review
* @your-github-username

# Для критичных файлов
/lib/crypto/ @your-github-username
/lib/session/ @your-github-username
SECURITY.md @your-github-username
```

**5. Настройте GitHub Actions (опционально):**

Создайте `.github/workflows/ci.yml` для автоматического тестирования:
```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node-version: [18.x, 20.x, 21.x]

    steps:
    - uses: actions/checkout@v3
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
    - run: npm install
    - run: npm test
```

---

## 📢 Announce the Release

После публикации, объявите о релизе:

### 1. GitHub Discussions

Создайте пост в Announcements:
```
🎉 Termly CLI is Now Open Source!

We're excited to announce that Termly CLI is now open source and available for everyone!

📦 Install: npm install -g @termly-dev/cli
🌐 Website: https://termly.dev
📚 Docs: https://github.com/termly-dev/termly-cli

What do you want to see next? Share your ideas!
```

### 2. Social Media

**Twitter/X:**
```
🎉 Termly CLI is now open source!

Mirror your AI coding sessions to mobile - control Claude Code, Aider, GitHub Copilot, and 20+ tools from your phone.

✨ Easy install: npm install -g @termly-dev/cli
🔒 End-to-end encrypted
⚡ Fast & lightweight

https://github.com/termly-dev/termly-cli

#OpenSource #AI #CLI #NodeJS
```

**LinkedIn:**
```
We're thrilled to announce that Termly CLI is now open source! 🎉

Termly CLI enables remote terminal access to AI coding assistants from mobile devices with end-to-end encryption.

Key features:
• Support for 20+ AI tools (Claude Code, Aider, GitHub Copilot, Gemini, etc.)
• End-to-end encryption (AES-256-GCM + DH-2048)
• Session resume with automatic reconnection
• Multiple simultaneous sessions
• Zero-knowledge server architecture

Install: npm install -g @termly-dev/cli
GitHub: https://github.com/termly-dev/termly-cli

We welcome contributions from the community!
```

### 3. Dev Communities

Поделитесь в:
- **Reddit:** r/programming, r/node, r/opensource
- **Hacker News:** news.ycombinator.com
- **Dev.to:** Напишите статью о проекте
- **Product Hunt:** Запустите продукт

### 4. npm Package

Убедитесь что npm пакет обновлен:
```bash
npm publish
```

---

## 🔍 Post-Release Monitoring

### Week 1: Active Monitoring

- [ ] Проверяйте Issues ежедневно (первые дни критичны)
- [ ] Отвечайте на вопросы в Discussions
- [ ] Следите за Security Alerts от Dependabot
- [ ] Проверяйте звезды и форки (показатель интереса)

### Week 2-4: Regular Monitoring

- [ ] Проверяйте Issues 2-3 раза в неделю
- [ ] Review Pull Requests оперативно (в течение 48 часов)
- [ ] Мониторьте упоминания в Twitter/Reddit
- [ ] Обновляйте документацию на основе вопросов

### Ongoing

- [ ] Настройте GitHub Sponsors (опционально)
- [ ] Добавьте contributors в README
- [ ] Создавайте milestones для будущих версий
- [ ] Публикуйте release notes для каждой версии

---

## 📋 Emergency Procedures

### If Secrets Accidentally Exposed

**НЕМЕДЛЕННО:**
1. Ротируйте все скомпрометированные ключи/токены
2. Удалите секрет из истории Git:
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch path/to/secret" \
     --prune-empty --tag-name-filter cat -- --all
   git push origin --force --all
   ```
3. Создайте Security Advisory на GitHub
4. Уведомите пользователей (если необходимо)

### If Major Bug Discovered

1. Создайте issue с тегом `critical`
2. Зафиксьте в hotfix ветке
3. Выпустите patch версию (v1.3.1)
4. Обновите minimum version на сервере (forced update)

### If Malicious PR/Issue

1. Закройте и заблокируйте (Block user)
2. Сообщите в GitHub Support (если спам/abuse)
3. Обновите CONTRIBUTING.md если нужно

---

## ✅ Final Checklist

Перед тем как нажать "Make Public":

- [ ] Все security checks пройдены
- [ ] Документация полная и актуальная
- [ ] GitHub settings настроены
- [ ] Branch protection включена
- [ ] GitHub Release создан
- [ ] Team готова к support (Issues/Discussions)
- [ ] Announcement posts подготовлены

**Ready? Let's go! 🚀**

```bash
gh repo edit termly-dev/termly-cli --visibility public
```

---

**Last Updated:** 2025-01-12
**Version:** 1.0
