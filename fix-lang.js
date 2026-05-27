const fs = require('fs');
const path = require('path');

const UI_BLOCK = `
                    <!-- Custom Language Selector -->
                    <div class="relative group inline-block z-[110]">
                        <button class="flex items-center gap-1 text-zinc-600 dark:text-zinc-300 font-bold text-sm cursor-pointer hover:text-primary dark:hover:text-red-400 transition-colors">
                            <span class="material-symbols-outlined text-lg">language</span>
                            <span class="current-lang-display hidden sm:inline">ES</span>
                            <span class="material-symbols-outlined text-base hidden sm:inline">expand_more</span>
                        </button>
                        <div class="absolute right-0 mt-2 w-32 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 overflow-hidden">
                            <ul class="py-2 text-sm text-zinc-700 dark:text-zinc-300 m-0 p-0 list-none notranslate" translate="no">
                                <li><button class="w-full text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-primary dark:hover:text-red-400 transition-colors" onclick="changeLanguage('es', 'ES')">Español</button></li>
                                <li><button class="w-full text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-primary dark:hover:text-red-400 transition-colors" onclick="changeLanguage('de', 'DE')">Deutsch</button></li>
                                <li><button class="w-full text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-primary dark:hover:text-red-400 transition-colors" onclick="changeLanguage('en', 'EN')">English</button></li>
                                <li><button class="w-full text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-primary dark:hover:text-red-400 transition-colors" onclick="changeLanguage('fr', 'FR')">Français</button></li>
                                <li><button class="w-full text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-primary dark:hover:text-red-400 transition-colors" onclick="changeLanguage('pt', 'PT')">Português</button></li>
                                <li><button class="w-full text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-primary dark:hover:text-red-400 transition-colors" onclick="changeLanguage('it', 'IT')">Italiano</button></li>
                                <li><button class="w-full text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-primary dark:hover:text-red-400 transition-colors" onclick="changeLanguage('ja', 'JA')">日本語</button></li>
                                <li><button class="w-full text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-primary dark:hover:text-red-400 transition-colors" onclick="changeLanguage('zh-CN', 'ZH')">中文</button></li>
                                <li><button class="w-full text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-primary dark:hover:text-red-400 transition-colors" onclick="changeLanguage('ru', 'RU')">Русский</button></li>
                            </ul>
                        </div>
                    </div>`;

const SCRIPT_BLOCK = `
    <!-- Google Translate Integration -->
    <div id="google_translate_element" style="display: none;"></div>
    <script type="text/javascript">
        function googleTranslateElementInit() {
            document.querySelectorAll('[class*="material-symbols"]').forEach(function (icon) {
                icon.setAttribute('translate', 'no');
                icon.classList.add('notranslate');
            });

            new google.translate.TranslateElement({
                pageLanguage: 'es',
                includedLanguages: 'es,en,de,fr,pt,it,ja,zh-CN,ru',
                autoDisplay: false
            }, 'google_translate_element');
        }

        function changeLanguage(langCode, displayText) {
            document.cookie = "googtrans=/es/" + langCode + "; path=/; domain=" + window.location.hostname;
            document.cookie = "googtrans=/es/" + langCode + "; path=/";
            document.querySelectorAll('.current-lang-display').forEach(el => el.textContent = displayText);
            window.location.reload();
        }

        document.addEventListener("DOMContentLoaded", function () {
            let match = document.cookie.match(/(?:^|;)\\s*googtrans=([^;]*)/);
            let lang = match ? match[1].split('/')[2] : 'es';
            let labels = { 'es': 'ES', 'en': 'EN', 'de': 'DE', 'fr': 'FR', 'pt': 'PT', 'it': 'IT', 'ja': 'JA', 'zh-CN': 'ZH', 'ru': 'RU' };
            if (labels[lang]) {
                document.querySelectorAll('.current-lang-display').forEach(el => el.textContent = labels[lang]);
            }
        });
    </script>
    <script type="text/javascript" src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"></script>
</body>`;

function processFile(file, isAdmin) {
    let content = fs.readFileSync(file, 'utf16le');
    if (content.indexOf('<!DOCTYPE html>') === -1 && content.indexOf('<html') === -1) {
        content = fs.readFileSync(file, 'utf8');
    }

    let modified = false;

    // 1. Add script block
    if (!content.includes('googleTranslateElementInit')) {
        content = content.replace(/<\/body>/i, SCRIPT_BLOCK);
        modified = true;
    }

    // 2. Add UI block
    if (!content.includes('changeLanguage(')) {
        if (isAdmin) {
            // Find all <div class="flex items-center gap-1 sm:gap-2 md:gap-6 ml-auto"> and inject UI_BLOCK inside them at the start
            const regex = /(<div class="flex items-center gap-1 sm:gap-2 md:gap-6 ml-auto">)/g;
            content = content.replace(regex, '$1\\n' + UI_BLOCK);
            modified = true;
        } else {
            // For como-funciona.html, we replace the fake language selector
            const fakeRegex = /<span class="landing-desktop-nav__item inline-flex items-center gap-1">\\s*Es\\s*<span class="material-symbols-outlined text-\\[18px\\]" aria-hidden="true">expand_more<\\/span>\\s*<\\/span>/;
            if (fakeRegex.test(content)) {
                content = content.replace(fakeRegex, UI_BLOCK);
                modified = true;
            } else {
                 console.log('Fake selector not found in', file);
            }
        }
    }

    if (modified) {
        // preserve encoding if it was utf8. Let's just write utf8 for both since browsers handle it
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated', file);
    } else {
        console.log('No changes for', file);
    }
}

const dir = 'c:\\\\Users\\\\maxim\\\\OneDrive\\\\Escritorio\\\\Proyectos\\\\PropManager\\\\app-alquileres-3.0';
processFile(path.join(dir, 'administrador.html'), true);
processFile(path.join(dir, 'como-funciona.html'), false);
