document.addEventListener('DOMContentLoaded', async () => {
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.classList.toggle('dark', theme === 'dark');
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');

    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    let mode = params.get('mode') === 'login' ? 'login' : 'signup';

    // Role definitions
    const ROLES = {
        inquilino: {
            id: 1,
            roleName: 'inquilino',
            label: 'Inquilino',
            signupTitle: 'Crea tu cuenta de inquilino',
            signupSubtitle: 'Alquila sin garantías tradicionales y gestiona tus alquileres.',
            loginTitle: 'Inicia sesión como inquilino',
            loginSubtitle: 'Accede a tus postulaciones, pasaporte y alquileres activos.',
            defaultTarget: 'index.html'
        },
        propietario: {
            id: 2,
            roleName: 'propietario',
            label: 'Propietario',
            signupTitle: 'Crea tu cuenta de propietario',
            signupSubtitle: 'Publica tu propiedad gratis, solo te llevará 5 minutos.',
            loginTitle: 'Inicia sesión como propietario',
            loginSubtitle: 'Accede para administrar tus propiedades y cobros.',
            defaultTarget: 'administrador.html'
        },
        profesional: {
            id: 3,
            roleName: 'profesional',
            label: 'Corredor',
            signupTitle: 'Crea tu cuenta de corredor',
            signupSubtitle: 'Potencia tus operaciones, cartera de propiedades y leads.',
            loginTitle: 'Inicia sesión en tu CRM de Corredor',
            loginSubtitle: 'Accede a tu panel inmobiliario y gestión comercial.',
            defaultTarget: 'panel-corredor.html'
        }
    };

    // Determine initial role
    let initialRole = 'inquilino';
    const urlRole = params.get('role');
    if (urlRole && ROLES[urlRole.toLowerCase()]) {
        initialRole = urlRole.toLowerCase();
    } else if (redirect === 'admin' || redirect === 'publish') {
        initialRole = 'propietario';
    } else if (redirect === 'corredor' || redirect === 'broker' || redirect === 'panel-corredor') {
        initialRole = 'profesional';
    }

    let currentRole = initialRole;

    const getRedirectTarget = () => {
        if (redirect === 'publish') return 'propietarios.html?publish=1';
        if (redirect === 'admin') return 'administrador.html';
        if (redirect === 'favorites') return 'index.html?fav=1';
        if (redirect === 'corredor' || redirect === 'panel-corredor') return 'panel-corredor.html';
        if (redirect === 'pasaporte') return 'pasaporte-habitat.html';
        return ROLES[currentRole].defaultTarget;
    };

    const title = document.getElementById('owner-auth-title');
    const subtitle = document.getElementById('owner-auth-subtitle');
    const form = document.getElementById('owner-auth-form');
    const googleBtn = document.getElementById('owner-google-btn');
    const submitBtn = document.getElementById('owner-auth-submit');
    const modeBtn = document.getElementById('owner-auth-mode-btn');
    const switchCopy = document.getElementById('owner-auth-switch-copy');
    const nameField = document.getElementById('owner-name-field');
    const nameInput = document.getElementById('owner-name');
    const emailInput = document.getElementById('owner-email');
    const passwordInput = document.getElementById('owner-password');
    const message = document.getElementById('owner-auth-message');
    const roleButtons = document.querySelectorAll('.role-select-btn');

    const redirectToTarget = () => {
        window.location.replace(getRedirectTarget());
    };

    const showMessage = (text) => {
        message.textContent = text;
        message.classList.add('is-visible');
    };

    const clearMessage = () => {
        message.textContent = '';
        message.classList.remove('is-visible');
    };

    const setLoading = (isLoading) => {
        submitBtn.disabled = isLoading;
        googleBtn.disabled = isLoading;
        submitBtn.textContent = isLoading ? 'Procesando...' : 'Continuar';
    };

    const syncUI = () => {
        const roleData = ROLES[currentRole];
        const isSignup = mode === 'signup';

        // Update titles & copies
        title.textContent = isSignup ? roleData.signupTitle : roleData.loginTitle;
        subtitle.textContent = isSignup ? roleData.signupSubtitle : roleData.loginSubtitle;
        switchCopy.textContent = isSignup ? '¿Ya tienes una cuenta?' : '¿No tienes cuenta?';
        modeBtn.textContent = isSignup ? 'Iniciar sesión' : 'Crear cuenta';
        nameField.style.display = isSignup ? 'grid' : 'none';
        nameInput.required = isSignup;
        passwordInput.autocomplete = isSignup ? 'new-password' : 'current-password';

        // Update role button styles
        roleButtons.forEach(btn => {
            const role = btn.dataset.role;
            if (role === currentRole) {
                btn.className = 'role-select-btn flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 sm:py-2.5 px-2 rounded-xl font-headline font-extrabold text-xs sm:text-sm transition-all bg-primary text-white shadow-xs cursor-pointer';
            } else {
                btn.className = 'role-select-btn flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 sm:py-2.5 px-2 rounded-xl font-headline font-extrabold text-xs sm:text-sm transition-all text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer';
            }
        });

        clearMessage();
    };

    // Check existing active session
    try {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (session) redirectToTarget();
    } catch (error) {
        console.warn('No se pudo leer la sesión actual:', error);
    }

    // Role selection listeners
    roleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const role = btn.dataset.role;
            if (ROLES[role]) {
                currentRole = role;
                syncUI();
            }
        });
    });

    // Toggle Mode (Login <-> Signup)
    modeBtn.addEventListener('click', () => {
        mode = mode === 'signup' ? 'login' : 'signup';
        syncUI();
    });

    // Google OAuth Handler
    googleBtn.addEventListener('click', async () => {
        clearMessage();
        const roleData = ROLES[currentRole];
        const targetUrl = new URL(getRedirectTarget(), window.location.href);
        targetUrl.searchParams.set('role', currentRole);

        // Store selected role in localStorage for session setup after OAuth redirect
        localStorage.setItem('habitat_selected_role', currentRole);
        localStorage.setItem('habitat_selected_role_id', String(roleData.id));

        const { error } = await window.supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: targetUrl.href,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent'
                }
            }
        });

        if (error) showMessage(error.message || 'No pudimos iniciar con Google. Probá con tu correo.');
    });

    // Form Submit Handler (Email & Password)
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearMessage();
        setLoading(true);

        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const fullName = nameInput.value.trim();
        const roleData = ROLES[currentRole];

        try {
            if (mode === 'signup') {
                const { data, error } = await window.supabaseClient.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                            name: fullName,
                            role: roleData.roleName,
                            id_tipo_perfil: roleData.id
                        }
                    }
                });

                if (error) throw error;
                if (data.session || data.user) {
                    redirectToTarget();
                    return;
                }

                showMessage('¡Te enviamos un correo de confirmación! Revisá tu casilla de email y hacé clic en el enlace para activar tu cuenta.');
            } else {
                const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
                if (error) throw error;
                if (data.user) redirectToTarget();
            }
        } catch (error) {
            showMessage(error.message || 'No pudimos completar el acceso. Revisá tus datos e intentá de nuevo.');
        } finally {
            setLoading(false);
        }
    });

    syncUI();
});
