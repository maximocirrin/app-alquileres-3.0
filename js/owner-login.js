document.addEventListener('DOMContentLoaded', async () => {
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.classList.toggle('dark', theme === 'dark');
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');

    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    const redirectTarget = redirect === 'publish'
        ? 'index.html?publish=1'
        : redirect === 'admin'
            ? 'index.html?admin=1'
            : 'index.html';

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

    let mode = params.get('mode') === 'login' ? 'login' : 'signup';

    const redirectToTarget = () => {
        window.location.replace(redirectTarget);
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

    const syncMode = () => {
        const isSignup = mode === 'signup';
        title.textContent = isSignup ? 'Crea tu cuenta de propietario' : 'Inicia sesi\u00f3n en H\u00e1bitat';
        subtitle.textContent = isSignup
            ? 'Publica tu propiedad gratis, solo te llevara 5 minutos.'
            : 'Accede para continuar con la publicaci\u00f3n de tu propiedad.';
        switchCopy.textContent = isSignup ? 'Ya tienes una?' : 'No tienes cuenta?';
        modeBtn.textContent = isSignup ? 'Iniciar sesi\u00f3n' : 'Crear cuenta';
        nameField.style.display = isSignup ? 'grid' : 'none';
        nameInput.required = isSignup;
        passwordInput.autocomplete = isSignup ? 'new-password' : 'current-password';
        clearMessage();
    };

    try {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (session) redirectToTarget();
    } catch (error) {
        console.warn('No se pudo leer la sesi\u00f3n actual:', error);
    }

    modeBtn.addEventListener('click', () => {
        mode = mode === 'signup' ? 'login' : 'signup';
        syncMode();
    });

    googleBtn.addEventListener('click', async () => {
        clearMessage();
        const redirectTo = new URL(redirectTarget, window.location.href).href;
        const { error } = await window.supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo }
        });

        if (error) showMessage(error.message || 'No pudimos iniciar con Google. Proba con tu correo.');
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearMessage();
        setLoading(true);

        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const fullName = nameInput.value.trim();

        try {
            if (mode === 'signup') {
                const { data, error } = await window.supabaseClient.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                            role: 'owner'
                        }
                    }
                });

                if (error) throw error;
                if (data.session || data.user) {
                    redirectToTarget();
                    return;
                }

                showMessage('Te enviamos un correo para confirmar tu cuenta. Despu\u00e9s de confirmarla, volve a iniciar sesi\u00f3n.');
            } else {
                const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
                if (error) throw error;
                if (data.user) redirectToTarget();
            }
        } catch (error) {
            showMessage(error.message || 'No pudimos completar el acceso. Revisa tus datos e intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    });

    syncMode();
});
