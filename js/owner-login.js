document.addEventListener('DOMContentLoaded', async () => {
    const syncThemeMeta = (isDark) => {
        document.documentElement.classList.toggle('dark', isDark);
        if (isDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
            document.documentElement.style.backgroundColor = '#09090b';
            document.documentElement.style.colorScheme = 'dark';
            if (document.body) document.body.style.backgroundColor = '#09090b';
        } else {
            document.documentElement.removeAttribute('data-theme');
            document.documentElement.style.backgroundColor = '#ffffff';
            document.documentElement.style.colorScheme = 'light';
            if (document.body) document.body.style.backgroundColor = '#ffffff';
        }
        document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.remove());
    };

    const theme = localStorage.getItem('theme') || 'light';
    syncThemeMeta(theme === 'dark');

    // Theme Switcher Sync
    const themeCheckbox = document.querySelector('.theme-switch__checkbox');
    if (themeCheckbox) {
        themeCheckbox.checked = theme === 'dark';
        themeCheckbox.addEventListener('change', () => {
            const isDark = themeCheckbox.checked;
            syncThemeMeta(isDark);
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
    }

    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    let mode = params.get('mode') === 'login' ? 'login' : 'signup';

    // Role definitions (Unified Particular vs Professional Broker)
    const ROLES = {
        inquilino: {
            id: 1,
            roleName: 'inquilino',
            label: 'Usuario Particular',
            signupTitle: 'Crea tu cuenta en Hábitat',
            signupSubtitle: 'Alquila, publica tus propiedades y gestiona tus contratos.',
            loginTitle: 'Inicia sesión en Hábitat',
            loginSubtitle: 'Accede a tus postulaciones, propiedades y alquileres.',
            defaultTarget: 'index.html'
        },
        propietario: {
            id: 1,
            roleName: 'inquilino',
            label: 'Usuario Particular',
            signupTitle: 'Crea tu cuenta en Hábitat',
            signupSubtitle: 'Alquila, publica tus propiedades y gestiona tus contratos.',
            loginTitle: 'Inicia sesión en Hábitat',
            loginSubtitle: 'Accede a tus postulaciones, propiedades y alquileres.',
            defaultTarget: 'index.html'
        },
        profesional: {
            id: 3,
            roleName: 'profesional',
            label: 'Corredor Inmobiliario',
            signupTitle: 'Crea tu cuenta de Corredor',
            signupSubtitle: 'Potencia tu inmobiliaria, cartera de propiedades y captaciones.',
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
    const brokerFieldsContainer = document.getElementById('broker-fields-container');
    const brokerCompanyInput = document.getElementById('broker-company');
    const brokerMatriculaInput = document.getElementById('broker-matricula');
    const brokerPhoneInput = document.getElementById('broker-phone');
    const message = document.getElementById('owner-auth-message');
    const roleButtons = document.querySelectorAll('.role-select-btn');

    const redirectToTarget = () => {
        window.location.replace(getRedirectTarget());
    };

    const showMessage = (text) => {
        message.textContent = text;
        message.classList.add('is-visible');
    };

    const togglePasswordBtn = document.getElementById('toggle-password-btn');
    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            const icon = togglePasswordBtn.querySelector('.material-symbols-outlined');
            if (icon) icon.textContent = isPassword ? 'visibility_off' : 'visibility';
        });
    }

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
        const isBroker = currentRole === 'profesional';

        // Update titles & copies
        title.textContent = isSignup ? roleData.signupTitle : roleData.loginTitle;
        subtitle.textContent = isSignup ? roleData.signupSubtitle : roleData.loginSubtitle;
        switchCopy.textContent = isSignup ? '¿Ya tienes una cuenta?' : '¿No tienes cuenta?';
        modeBtn.textContent = isSignup ? 'Iniciar sesión' : 'Crear cuenta';
        nameField.style.display = isSignup ? 'grid' : 'none';
        nameInput.required = isSignup;
        passwordInput.autocomplete = isSignup ? 'new-password' : 'current-password';

        // Broker exclusive fields
        if (brokerFieldsContainer) {
            brokerFieldsContainer.style.display = (isSignup && isBroker) ? 'grid' : 'none';
            if (brokerMatriculaInput) brokerMatriculaInput.required = (isSignup && isBroker);
            if (brokerPhoneInput) brokerPhoneInput.required = (isSignup && isBroker);
        }

        // Update role button styles
        roleButtons.forEach(btn => {
            const role = btn.dataset.role;
            if (role === currentRole) {
                btn.className = 'role-select-btn flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-headline font-extrabold text-xs sm:text-sm transition-all bg-primary text-white shadow-xs cursor-pointer';
            } else {
                btn.className = 'role-select-btn flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-headline font-extrabold text-xs sm:text-sm transition-all text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer';
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
    });    // OTP View Elements
    const authFormContainer = document.getElementById('owner-auth-form-container');
    const otpContainer = document.getElementById('owner-otp-container');
    const otpUserEmail = document.getElementById('otp-user-email');
    const otpAuthMessage = document.getElementById('otp-auth-message');
    const otpVerifySubmit = document.getElementById('otp-verify-submit');
    const otpResendBtn = document.getElementById('otp-resend-btn');
    const otpBackBtn = document.getElementById('otp-back-btn');
    const otpDigitInputs = document.querySelectorAll('.otp-digit-input');

    let pendingUserEmail = '';
    let resendTimer = null;

    const showOtpMessage = (text) => {
        if (!otpAuthMessage) return;
        otpAuthMessage.textContent = text;
        otpAuthMessage.classList.add('is-visible');
    };

    const clearOtpMessage = () => {
        if (!otpAuthMessage) return;
        otpAuthMessage.textContent = '';
        otpAuthMessage.classList.remove('is-visible');
    };

    const setOtpLoading = (isLoading) => {
        if (!otpVerifySubmit) return;
        otpVerifySubmit.disabled = isLoading;
        otpVerifySubmit.textContent = isLoading ? 'Verificando...' : 'Verificar código';
    };

    const startResendTimer = (seconds = 60) => {
        if (!otpResendBtn) return;
        let secondsLeft = seconds;
        otpResendBtn.disabled = true;
        otpResendBtn.style.opacity = '0.6';
        otpResendBtn.style.cursor = 'not-allowed';

        if (resendTimer) clearInterval(resendTimer);
        
        const updateText = () => {
            otpResendBtn.innerHTML = `&iquest;No recibiste el c&oacute;digo? <span class="font-bold text-zinc-400">Reenviar en (${secondsLeft}s)</span>`;
        };

        updateText();

        resendTimer = setInterval(() => {
            secondsLeft--;
            if (secondsLeft <= 0) {
                clearInterval(resendTimer);
                otpResendBtn.disabled = false;
                otpResendBtn.style.opacity = '1';
                otpResendBtn.style.cursor = 'pointer';
                otpResendBtn.innerHTML = `&iquest;No recibiste el c&oacute;digo? <span class="underline font-bold">Reenviar</span>`;
            } else {
                updateText();
            }
        }, 1000);
    };

    const showOtpView = (email) => {
        pendingUserEmail = email;
        if (otpUserEmail) otpUserEmail.textContent = email;
        if (authFormContainer) authFormContainer.style.display = 'none';
        if (otpContainer) otpContainer.style.display = 'flex';
        clearOtpMessage();
        
        // Clear digit inputs and focus first input
        otpDigitInputs.forEach(input => input.value = '');
        if (otpDigitInputs.length > 0) otpDigitInputs[0].focus();

        // Iniciar cuenta regresiva en vivo de 60 segundos para el botón de reenvío
        startResendTimer(60);
    };

    const showFormView = () => {
        if (otpContainer) otpContainer.style.display = 'none';
        if (authFormContainer) authFormContainer.style.display = 'block';
        clearMessage();
    };

    // OTP Digit Inputs auto-focus & keyboard navigation
    otpDigitInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            const val = e.target.value;
            // Only keep digits
            e.target.value = val.replace(/[^0-9]/g, '');
            if (e.target.value && index < otpDigitInputs.length - 1) {
                otpDigitInputs[index + 1].focus();
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !input.value && index > 0) {
                otpDigitInputs[index - 1].focus();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                otpVerifySubmit.click();
            }
        });

        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedData = (e.clipboardData || window.clipboardData).getData('text').trim().replace(/[^0-9]/g, '');
            if (pastedData) {
                const digits = pastedData.split('');
                otpDigitInputs.forEach((digitInput, idx) => {
                    if (digits[idx]) {
                        digitInput.value = digits[idx];
                    }
                });
                const focusIdx = Math.min(digits.length, otpDigitInputs.length - 1);
                otpDigitInputs[focusIdx].focus();
                
                // If 6 or 8 digits pasted, trigger submit automatically
                if (digits.length >= 6) {
                    otpVerifySubmit.click();
                }
            }
        });
    });

    // Verify OTP Handler
    if (otpVerifySubmit) {
        otpVerifySubmit.addEventListener('click', async () => {
            clearOtpMessage();
            const code = Array.from(otpDigitInputs).map(i => i.value.trim()).join('');
            if (code.length < 6) {
                showOtpMessage('Por favor ingresá el código de verificación.');
                return;
            }

            setOtpLoading(true);

            try {
                const { data, error } = await window.supabaseClient.auth.verifyOtp({
                    email: pendingUserEmail,
                    token: code,
                    type: 'signup'
                });

                if (error) throw error;

                if (data.session || data.user) {
                    redirectToTarget();
                } else {
                    showOtpMessage('Código verificado con éxito. Redirigiendo...');
                    setTimeout(redirectToTarget, 1000);
                }
            } catch (error) {
                console.error('Error al verificar OTP:', error);
                showOtpMessage(error.message || 'El código ingresado es incorrecto o expirió. Revisá tu email e intentá nuevamente.');
            } finally {
                setOtpLoading(false);
            }
        });
    }

    // Resend OTP Handler
    if (otpResendBtn) {
        otpResendBtn.addEventListener('click', async () => {
            if (otpResendBtn.disabled) return;
            clearOtpMessage();

            try {
                const { error } = await window.supabaseClient.auth.resend({
                    type: 'signup',
                    email: pendingUserEmail
                });

                if (error) {
                    const msg = (error.message || '').toLowerCase();
                    if (error.status === 429 || msg.includes('rate limit') || msg.includes('for security purposes') || msg.includes('once every')) {
                        showOtpMessage('Por seguridad, tenés que esperar a que venza el límite de envíos antes de pedir otro código.');
                        startResendTimer(60);
                        return;
                    }
                    throw error;
                }

                showOtpMessage('Te enviamos un nuevo código a tu correo electrónico.');
                startResendTimer(60);

            } catch (error) {
                showOtpMessage(error.message || 'No pudimos reenviar el código. Intentá nuevamente en unos momentos.');
            }
        });
    }

    // Back button
    if (otpBackBtn) {
        otpBackBtn.addEventListener('click', () => {
            showFormView();
        });
    }

    // Listen for background session changes (e.g. user clicked confirmation link in email)
    if (window.supabaseClient && window.supabaseClient.auth.onAuthStateChange) {
        window.supabaseClient.auth.onAuthStateChange((event, session) => {
            if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
                redirectToTarget();
            }
        });
    }

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

        const getRedirectUrl = () => {
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                return 'https://app-alquileres-3-0.vercel.app/login.html';
            }
            return window.location.href;
        };

        try {
            if (mode === 'signup') {
                const isBroker = currentRole === 'profesional';
                const signUpData = {
                    full_name: fullName,
                    name: fullName,
                    role: roleData.roleName,
                    id_tipo_perfil: roleData.id
                };

                if (isBroker) {
                    if (brokerCompanyInput) signUpData.company_name = brokerCompanyInput.value.trim();
                    if (brokerMatriculaInput) signUpData.matricula = brokerMatriculaInput.value.trim();
                    if (brokerPhoneInput) signUpData.phone = brokerPhoneInput.value.trim();
                }

                const { data, error } = await window.supabaseClient.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: getRedirectUrl(),
                        data: signUpData
                    }
                });

                const isAlreadyRegisteredError = error && (
                    (error.message || '').toLowerCase().includes('already registered') ||
                    (error.message || '').toLowerCase().includes('already exists') ||
                    (error.message || '').toLowerCase().includes('ya registrado')
                );

                const isExistingUser = isAlreadyRegisteredError || (data && data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0);

                if (isExistingUser) {
                    // La cuenta ya existe en Supabase: redirigir a inicio de sesión
                    mode = 'login';
                    syncUI();
                    showMessage('Este correo electrónico ya se encuentra registrado. Por favor, ingresá tu contraseña para iniciar sesión.');
                    return;
                }

                if (error) throw error;

                // Si la sesión ya se creó inmediatamente (ej. verificación de mail desactivada), redirigir
                if (data.session) {
                    redirectToTarget();
                    return;
                }

                // Mostrar pantalla OTP para ingresar el código recibido por mail
                showOtpView(email);
            } else {
                const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
                if (error) {
                    const msg = (error.message || '').toLowerCase();
                    if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
                        showMessage('El correo electrónico o la contraseña son incorrectos. Por favor, verifica tus datos.');
                        return;
                    }
                    throw error;
                }
                if (data.user) redirectToTarget();
            }
        } catch (error) {
            console.error('Error en autenticación:', error);
            const msg = (error.message || '').toLowerCase();
            if (error.status === 429 || msg.includes('rate limit') || msg.includes('for security purposes') || msg.includes('too many requests') || msg.includes('once every')) {
                showMessage('Por seguridad y límite de envíos de Supabase, debes esperar 60 segundos antes de solicitar otro correo. Por favor intentá en 1 minuto.');
                return;
            }
            showMessage(error.message || 'No pudimos completar el acceso. Revisá tus datos e intentá de nuevo.');
        } finally {
            setLoading(false);
        }
    });

    syncUI();
});

