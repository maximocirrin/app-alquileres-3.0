$content = Get-Content -Raw -Path "C:\Users\maxim\OneDrive\Escritorio\Proyectos\PropManager\app-alquileres-3.0\propietarios.html"

# Extract parts using regex
$content -match '(?s)(<head>.*?</head>)'
$head = $matches[1]

$content -match '(?s)(<nav.*?</nav>)'
$nav = $matches[1]

$content -match '(?s)(<footer.*?</footer>)'
$footer = $matches[1]

# Match all script tags that are not in the head
# Actually, it's easier to just take everything after </footer>
$content -match '(?s)</footer>(.*?)</body>'
$scripts = $matches[1]

# Now, we change the head title
$head = $head -replace '<title>Propietarios \| Hábitat</title>', '<title>Corredores Inmobiliarios | Hábitat</title>'

# Main content
$mainContent = @"
        <main class="pt-20 pb-20">
            <!-- Hero Section for Corredores -->
            <section class="max-w-[1280px] mx-auto px-4 md:px-8 pt-12 md:pt-20 pb-16">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div class="relative z-10">
                        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 dark:bg-red-500/10 text-primary dark:text-red-400 font-bold text-xs mb-6 border border-primary/20 dark:border-red-400/20">
                            <span class="material-symbols-outlined text-sm">rocket_launch</span>
                            Software de gestión inmobiliaria
                        </div>
                        <h1 class="font-headline text-5xl md:text-6xl font-extrabold text-on-background dark:text-white leading-[1.1] mb-6 tracking-tight">
                            Potencia tu inmobiliaria y multiplica tus cierres
                        </h1>
                        <p class="font-body text-lg text-zinc-600 dark:text-zinc-300 mb-8 max-w-lg leading-relaxed">
                            Gestiona todas tus propiedades, conecta con más clientes y automatiza tus tareas desde una única plataforma diseñada para profesionales.
                        </p>
                        <div class="flex flex-col sm:flex-row gap-4">
                            <button class="bg-primary text-on-primary px-8 py-4 rounded-xl font-bold text-base hover:bg-primary-container transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                                Probar Hábitat gratis
                            </button>
                            <button class="bg-surface text-on-surface dark:bg-zinc-800 dark:text-white border border-outline-variant/50 dark:border-zinc-700 px-8 py-4 rounded-xl font-bold text-base hover:bg-surface-container transition-all shadow-sm flex items-center justify-center gap-2">
                                <span class="material-symbols-outlined">play_circle</span>
                                Ver demo
                            </button>
                        </div>
                    </div>
                    <div class="relative animate-on-scroll">
                        <div class="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent rounded-3xl transform translate-x-4 translate-y-4"></div>
                        <img src="img/hero-marketplace.jpg" alt="Dashboard Hábitat" class="relative z-10 w-full h-[400px] md:h-[500px] object-cover rounded-3xl shadow-2xl" />
                        <div class="absolute -bottom-6 -left-6 bg-white dark:bg-zinc-800 p-4 rounded-2xl shadow-xl border border-zinc-100 dark:border-zinc-700 z-20 flex items-center gap-4 animate-on-scroll delay-200">
                            <div class="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                                <span class="material-symbols-outlined">trending_up</span>
                            </div>
                            <div>
                                <p class="text-xs font-bold text-zinc-500 dark:text-zinc-400">Conversión</p>
                                <p class="font-headline text-xl font-extrabold text-on-background dark:text-white">+45%</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Features Section -->
            <section class="bg-surface-container-low dark:bg-zinc-900 py-20 border-y border-outline-variant/20 dark:border-zinc-800">
                <div class="max-w-[1280px] mx-auto px-4 md:px-8">
                    <div class="text-center mb-16 max-w-2xl mx-auto animate-on-scroll">
                        <h2 class="font-headline text-3xl md:text-4xl font-extrabold text-on-background dark:text-white mb-4">
                            Todo lo que necesitas en un solo lugar
                        </h2>
                        <p class="font-body text-zinc-600 dark:text-zinc-400">
                            Hábitat te ofrece las herramientas más avanzadas para modernizar tu inmobiliaria y destacar en el mercado actual.
                        </p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div class="bg-white dark:bg-zinc-800 p-8 rounded-2xl border border-zinc-100 dark:border-zinc-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-on-scroll">
                            <div class="w-14 h-14 rounded-xl bg-primary/10 dark:bg-red-500/10 text-primary dark:text-red-400 flex items-center justify-center mb-6">
                                <span class="material-symbols-outlined text-3xl">dashboard_customize</span>
                            </div>
                            <h3 class="font-headline text-xl font-bold text-on-background dark:text-white mb-3">CRM Inmobiliario</h3>
                            <p class="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
                                Gestiona tus contactos, haz seguimiento de oportunidades y organiza tu agenda con nuestro sistema inteligente diseñado para bienes raíces.
                            </p>
                        </div>
                        <div class="bg-white dark:bg-zinc-800 p-8 rounded-2xl border border-zinc-100 dark:border-zinc-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-on-scroll delay-100">
                            <div class="w-14 h-14 rounded-xl bg-primary/10 dark:bg-red-500/10 text-primary dark:text-red-400 flex items-center justify-center mb-6">
                                <span class="material-symbols-outlined text-3xl">share</span>
                            </div>
                            <h3 class="font-headline text-xl font-bold text-on-background dark:text-white mb-3">Red Inmobiliaria</h3>
                            <p class="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
                                Conecta con otros corredores de la red Hábitat. Comparte propiedades, colabora en cierres y aumenta tus posibilidades de venta.
                            </p>
                        </div>
                        <div class="bg-white dark:bg-zinc-800 p-8 rounded-2xl border border-zinc-100 dark:border-zinc-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-on-scroll delay-200">
                            <div class="w-14 h-14 rounded-xl bg-primary/10 dark:bg-red-500/10 text-primary dark:text-red-400 flex items-center justify-center mb-6">
                                <span class="material-symbols-outlined text-3xl">query_stats</span>
                            </div>
                            <h3 class="font-headline text-xl font-bold text-on-background dark:text-white mb-3">Métricas y Reportes</h3>
                            <p class="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
                                Toma decisiones basadas en datos reales. Conoce qué propiedades tienen más demanda y mide el rendimiento de tu equipo.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- CTA Section -->
            <section class="max-w-[1000px] mx-auto px-4 md:px-8 py-20 text-center animate-on-scroll">
                <div class="bg-primary text-on-primary rounded-3xl p-10 md:p-16 shadow-2xl relative overflow-hidden">
                    <div class="absolute inset-0 opacity-10"></div>
                    <div class="relative z-10">
                        <h2 class="font-headline text-3xl md:text-5xl font-extrabold mb-6">
                            Únete a la nueva era inmobiliaria
                        </h2>
                        <p class="font-body text-white/80 text-lg mb-10 max-w-2xl mx-auto">
                            Empieza a utilizar Hábitat hoy y descubre por qué las inmobiliarias más exitosas nos eligen como su plataforma principal.
                        </p>
                        <button class="bg-white text-primary px-10 py-4 rounded-xl font-bold text-lg hover:bg-zinc-100 transition-all shadow-xl hover:scale-105 active:scale-95">
                            Crear cuenta de Corredor
                        </button>
                    </div>
                </div>
            </section>
        </main>
"@

$finalHtml = @"
<!DOCTYPE html>
<html lang="es">
${head}
<body class="antialiased">
    <section id="landing-corredores-view" class="bg-background dark:bg-[#09090b] text-on-background dark:text-[#f1f1f1] font-body w-full min-h-screen z-10 transition-opacity duration-300">
        ${nav}
        ${mainContent}
        ${footer}
    </section>
${scripts}
    <script>
        // Adjust the selected tab in the nav for this new page
        document.addEventListener('DOMContentLoaded', () => {
            const roleLinks = document.querySelectorAll('.landing-desktop-nav__role, .landing-menu__link');
            roleLinks.forEach(el => {
                if (el.textContent.includes('Soy corredor')) {
                    el.classList.add('border-b-2', 'border-red-900', 'dark:border-red-400', 'pb-1', 'font-bold', 'text-red-900', 'dark:text-red-400');
                    el.classList.remove('hover:text-red-800', 'text-zinc-500', 'dark:text-zinc-400');
                }
            });
        });
    </script>
</body>
</html>
"@

Set-Content -Path "C:\Users\maxim\OneDrive\Escritorio\Proyectos\PropManager\app-alquileres-3.0\corredores.html" -Value $finalHtml -Encoding UTF8
