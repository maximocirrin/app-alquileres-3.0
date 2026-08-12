(function() {
    // Skip on login page
    if (window.location.pathname.endsWith('login.html')) return;

    var footerHTML = `<footer id="footer" class="bg-surface-container-low dark:bg-zinc-950 border-t border-zinc-200/70 dark:border-zinc-800 px-4 md:px-8 py-16 md:py-20 text-on-background dark:text-zinc-300 font-body">
    <div class="max-w-[1580px] mx-auto">
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-10 lg:gap-12 pb-12 border-b border-zinc-300/70 dark:border-zinc-800">
            <!-- Col 1: Hábitat -->
            <div>
                <h3 class="font-headline text-sm font-extrabold text-on-background dark:text-white mb-5 uppercase tracking-wider">Hábitat</h3>
                <nav class="flex flex-col items-start gap-3 font-body text-sm text-zinc-600 dark:text-zinc-400">
                    <a href="index.html" class="hover:text-primary dark:hover:text-red-400 transition-colors">Inicio</a>
                    <a href="como-funciona.html" class="hover:text-primary dark:hover:text-red-400 transition-colors">Cómo funciona</a>
                    <a href="pasaporte-habitat.html" class="hover:text-primary dark:hover:text-red-400 transition-colors">Pasaporte Hábitat</a>
                </nav>
            </div>

            <!-- Col 2: Inquilinos & Propietarios -->
            <div class="flex flex-col gap-8">
                <div>
                    <h3 class="font-headline text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mb-5 uppercase tracking-wider">Inquilinos</h3>
                    <nav class="flex flex-col items-start gap-3 font-body text-sm text-zinc-600 dark:text-zinc-400">
                        <a href="tu-alquiler.html#alquiler" class="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Mi Alquiler Activo & Pagos</a>
                        <a href="tu-alquiler.html#postulaciones" class="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Mis Postulaciones</a>
                        <a href="tu-alquiler.html#visitas" class="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Visitas Agendadas</a>
                        <a href="buscar.html" class="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Buscar Inmuebles</a>
                    </nav>
                </div>
                <div>
                    <h3 class="font-headline text-sm font-extrabold text-primary dark:text-red-400 mb-5 uppercase tracking-wider">Propietarios</h3>
                    <nav class="flex flex-col items-start gap-3 font-body text-sm text-zinc-600 dark:text-zinc-400">
                        <a href="administrador.html" class="hover:text-primary dark:hover:text-red-400 transition-colors">Panel del Propietario</a>
                        <a href="propietarios.html" class="hover:text-primary dark:hover:text-red-400 transition-colors">Soluciones para Propietarios</a>
                        <a href="consultar-valor.html" class="hover:text-primary dark:hover:text-red-400 transition-colors">Consultar Valor de Alquiler</a>
                    </nav>
                </div>
            </div>

            <!-- Col 3: Corredores & Legal -->
            <div class="flex flex-col gap-8">
                <div>
                    <h3 class="font-headline text-sm font-extrabold text-blue-900 dark:text-blue-400 mb-5 uppercase tracking-wider">Corredores</h3>
                    <nav class="flex flex-col items-start gap-3 font-body text-sm text-zinc-600 dark:text-zinc-400">
                        <a href="panel-corredor.html" class="hover:text-blue-900 dark:hover:text-blue-400 transition-colors">Panel CRM del Corredor</a>
                        <a href="corredores.html" class="hover:text-blue-900 dark:hover:text-blue-400 transition-colors">Soluciones CRM & Red MLS</a>
                    </nav>
                </div>
                <div>
                    <h3 class="font-headline text-sm font-extrabold text-on-background dark:text-white mb-5 uppercase tracking-wider">Legal</h3>
                    <nav class="flex flex-col items-start gap-3 font-body text-sm text-zinc-600 dark:text-zinc-400">
                        <a href="terminos.html" class="hover:text-primary dark:hover:text-red-400 transition-colors">Términos y condiciones</a>
                        <a href="terminos.html#privacidad" class="hover:text-primary dark:hover:text-red-400 transition-colors">Política de privacidad</a>
                        <a href="terminos.html#cookies" class="hover:text-primary dark:hover:text-red-400 transition-colors">Política de cookies</a>
                    </nav>
                </div>
            </div>

            <!-- Col 4: Soporte -->
            <div>
                <h3 class="font-headline text-sm font-extrabold text-on-background dark:text-white mb-5 uppercase tracking-wider">Soporte</h3>
                <div class="flex flex-col items-start gap-4">
                    <a href="como-funciona.html#faq" class="inline-flex items-center gap-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-1.5 pl-2.5 pr-4 rounded-full shadow-sm hover:shadow transition-all group">
                        <div class="flex -space-x-2.5">
                            <img src="img/tenant-profile-1.jpg" alt="Soporte 1" class="w-7 h-7 rounded-full object-cover border border-white dark:border-zinc-900" />
                            <img src="img/tenant-profile-2.jpg" alt="Soporte 2" class="w-7 h-7 rounded-full object-cover border border-white dark:border-zinc-900" />
                        </div>
                        <span class="text-xs font-bold text-zinc-700 dark:text-zinc-200 group-hover:text-primary dark:group-hover:text-red-400 transition-colors">Centro de Ayuda</span>
                    </a>
                    <a href="mailto:soporte@habitat.com.ar" class="font-body text-sm text-zinc-600 dark:text-zinc-400 hover:text-primary dark:hover:text-red-400 transition-colors">Contactar con soporte</a>
                </div>
            </div>

            <!-- Col 5: Síguenos -->
            <div>
                <h3 class="font-headline text-sm font-extrabold text-on-background dark:text-white mb-5 uppercase tracking-wider">Síguenos</h3>
                <div class="flex flex-wrap gap-2">
                    <a href="#" aria-label="Instagram" class="w-8 h-8 rounded-full border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-primary hover:text-white dark:hover:bg-red-700 hover:border-primary transition-all">IG</a>
                    <a href="#" aria-label="X" class="w-8 h-8 rounded-full border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-primary hover:text-white dark:hover:bg-red-700 hover:border-primary transition-all">X</a>
                    <a href="#" aria-label="TikTok" class="w-8 h-8 rounded-full border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-primary hover:text-white dark:hover:bg-red-700 hover:border-primary transition-all">TT</a>
                    <a href="#" aria-label="LinkedIn" class="w-8 h-8 rounded-full border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-primary hover:text-white dark:hover:bg-red-700 hover:border-primary transition-all">in</a>
                    <a href="#" aria-label="Facebook" class="w-8 h-8 rounded-full border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-primary hover:text-white dark:hover:bg-red-700 hover:border-primary transition-all">f</a>
                </div>
            </div>
        </div>

        <div class="pt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <!-- Left: Copyright and Logo -->
            <div class="flex items-center gap-3.5 flex-wrap">
                <img src="img/logo-habitat-web.svg" alt="Habitat Logo" class="h-8 w-auto object-contain dark:brightness-200 dark:opacity-90" />
                <span class="font-body text-sm text-zinc-500 dark:text-zinc-400">
                    &copy; 2026 Hábitat &ndash; Todos los derechos reservados
                </span>
            </div>
        </div>
    </div>
</footer>`;

    function renderUnifiedFooter() {
        var existingFooter = document.querySelector('footer');
        if (existingFooter) {
            existingFooter.outerHTML = footerHTML;
        } else {
            document.body.insertAdjacentHTML('beforeend', footerHTML);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderUnifiedFooter);
    } else {
        renderUnifiedFooter();
    }
})();
