/**
 * Main Application Logic
 */

const App = {
    state: {
        currentUser: null,
        currentView: 'home-view'
    },

    init: async () => {
        App.initTheme();
        App.state.currentUser = DataManager.getCurrentUser();
        await App.render();
        App.setupEventListeners();
    },

    initTheme: () => {
        const savedTheme = localStorage.getItem('theme');
        // Default to dark mode if no saved preference
        const theme = savedTheme === 'light' ? 'light' : 'dark';
        App.setTheme(theme);
    },

    setTheme: (theme) => {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        
        localStorage.setItem('theme', theme);
        
        // Sync all checkboxes
        const isDark = theme === 'dark';
        document.querySelectorAll('.theme-switch__checkbox').forEach(cb => {
            cb.checked = isDark;
        });

        App.updateThemeIcons();
    },

    toggleTheme: () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        App.setTheme(newTheme);
    },

    updateThemeIcons: () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const iconName = isDark ? 'light_mode' : 'dark_mode';
        
        // Update menu item text/icon
        document.querySelectorAll('.theme-toggle-btn span').forEach(span => {
            span.textContent = iconName;
        });
    },

    setupEventListeners: () => {
        // Login Form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            const user = DataManager.login(username, password);
            if (user) {
                App.state.currentUser = user;
                App.render();
            } else {
                alert("Usuario o contraseña incorrectos (admin/admin)");
            }
        });

        // Logout
        const handleLogout = () => {
            DataManager.logout();
            App.state.currentUser = null;
            App.render();
        };
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
        document.getElementById('mobile-logout-btn').addEventListener('click', handleLogout);

        // Theme Toggle (Menu Button)
        document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
            btn.addEventListener('click', App.toggleTheme);
        });

        // Theme Switch (Checkbox)
        document.querySelectorAll('.theme-switch__checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                App.setTheme(e.target.checked ? 'dark' : 'light');
            });
        });

        // Navigation
        const navLinks = document.querySelectorAll('.nav-link, .nav-item');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const targetId = link.getAttribute('data-target');
                if (targetId) {
                    App.navigateTo(targetId);
                }
            });
        });

        // Add Property Modal Handling
        const modal = document.getElementById('add-property-modal');
        const openModalBtns = [document.getElementById('quick-add-btn'), document.getElementById('add-property-fab')];
        const closeModalBtn = document.querySelector('.close-modal');
        
        // Wizard State
        let currentStep = 1;
        const totalSteps = 4;

        const updateWizardUI = () => {
            // Update Steps
            document.querySelectorAll('.form-step').forEach(step => {
                if(parseInt(step.dataset.step) === currentStep) {
                    step.classList.add('active');
                } else {
                    step.classList.remove('active');
                }
            });

            // Update Indicators
            document.querySelectorAll('.step-indicator').forEach(ind => {
                const step = parseInt(ind.dataset.step);
                if (step === currentStep) {
                    ind.classList.add('active');
                    ind.classList.remove('completed');
                } else if (step < currentStep) {
                    ind.classList.add('completed');
                    ind.classList.remove('active');
                } else {
                    ind.classList.remove('active', 'completed');
                }
            });

            // Update Lines
            const lines = document.querySelectorAll('.step-line');
            lines.forEach((line, index) => {
                if (index < currentStep - 1) {
                    line.classList.add('active');
                } else {
                    line.classList.remove('active');
                }
            });
        };

        const validateStep = (step) => {
            const stepEl = document.querySelector(`.form-step[data-step="${step}"]`);
            const inputs = stepEl.querySelectorAll('input[required], select[required]');
            let isValid = true;
            inputs.forEach(input => {
                if (!input.value) {
                    isValid = false;
                    input.style.borderColor = '#ef4444';
                    // Reset border on input
                    input.addEventListener('input', function() {
                        this.style.borderColor = '';
                    }, { once: true });
                }
            });
            return isValid;
        };

        // Open Modal
        openModalBtns.forEach(btn => {
            if(btn) {
                btn.addEventListener('click', () => {
                    modal.classList.remove('hidden');
                    document.body.classList.add('no-scroll');
                    // Reset wizard
                    currentStep = 1;
                    updateWizardUI();
                    document.getElementById('add-property-form').reset();
                    document.getElementById('photo-file-name').textContent = "Ningún archivo seleccionado";
                    document.getElementById('contract-file-name').textContent = "Ningún archivo seleccionado";
                });
            }
        });

        // Close Modal
        if(closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                modal.classList.add('hidden');
                document.body.classList.remove('no-scroll');
            });
        }
        
        // Close Modal on click outside
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
                document.body.classList.remove('no-scroll');
            }
            // Close Dropdown Menus if clicking outside
            if (!e.target.closest('.action-cell')) {
                document.querySelectorAll('.dropdown-menu.active').forEach(m => m.classList.remove('active'));
            }
        });

        // Wizard Navigation
        document.querySelectorAll('.next-step-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (validateStep(currentStep)) {
                    if (currentStep < totalSteps) {
                        currentStep++;
                        updateWizardUI();
                    }
                } else {
                    alert("Por favor completa los campos requeridos.");
                }
            });
        });

        document.querySelectorAll('.prev-step-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (currentStep > 1) {
                    currentStep--;
                    updateWizardUI();
                }
            });
        });

        // File Input Handling
        const handleFileSelect = (inputId, nameId) => {
            const input = document.getElementById(inputId);
            const nameSpan = document.getElementById(nameId);
            if(input && nameSpan) {
                input.addEventListener('change', (e) => {
                    if(e.target.files && e.target.files.length > 0) {
                        nameSpan.textContent = e.target.files[0].name;
                    } else {
                        nameSpan.textContent = "Ningún archivo seleccionado";
                    }
                });
            }
        };

        handleFileSelect('photo-upload', 'photo-file-name');
        handleFileSelect('contract-upload', 'contract-file-name');

        // Tab Navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetTab = btn.getAttribute('data-tab');
                
                // Update Buttons
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update Content
                document.querySelectorAll('.tab-content').forEach(c => {
                    c.classList.add('hidden');
                    c.classList.remove('active');
                });
                    // Lazy load content if needed
                    const content = document.getElementById(targetTab);
                    if(content) {
                        content.classList.remove('hidden');
                        content.classList.add('active');
                        // Load specific tab data
                        if(targetTab === 'tab-tenants') App.renderTenants();
                        if(targetTab === 'tab-payments') App.renderPayments();
                    }
            });
        });

        // Search Handlers
        const setupSearch = (inputId, tableId) => {
            const input = document.getElementById(inputId);
            if (!input) return;
            
            input.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const rows = document.querySelectorAll(`#${tableId} tbody tr`);
                
                rows.forEach(row => {
                    const text = row.textContent.toLowerCase();
                    row.style.display = text.includes(term) ? '' : 'none';
                });
            });
        };

        setupSearch('tenant-search', 'tenants-table');
        setupSearch('payment-search', 'payments-table');

        // Quick Add Tenant Button (Simulate opening modal for now)
        document.getElementById('quick-add-tenant-btn').addEventListener('click', () => {
           // For now, re-use the property modal or show a message
           document.getElementById('add-property-fab').click();
           // In a real app, this would open a tenant-specific modal or pre-fill the form
        });

        // Add Property Form Submit
        const addPropertyForm = document.getElementById('add-property-form');
        if(addPropertyForm) {
            addPropertyForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = new FormData(e.target);

                // Helper to read file
                const readFile = (file) => {
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
                };

                try {
                    const photoFile = formData.get('photo');
                    const contractFile = formData.get('contract');
                    
                    let photoUrl = 'https://via.placeholder.com/300x200?text=Casa';
                    if (photoFile && photoFile.size > 0) {
                        photoUrl = await readFile(photoFile);
                    } else {
                        photoUrl = 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80';
                    }

                    let contractData = null;
                    if (contractFile && contractFile.size > 0) {
                        contractData = {
                            name: contractFile.name,
                            data: await readFile(contractFile)
                        };
                    }

                    // Safe parsing
                    const price = parseFloat(formData.get('price')) || 0;
                    const increaseRate = parseFloat(formData.get('increaseRate')) || 0;
                    const increaseFrequency = parseInt(formData.get('increaseFrequency')) || 12; // Default to 12 if missing
                    const rentDueDay = parseInt(formData.get('rentDueDay')) || 1;

                    const property = {
                        address: formData.get('address'),
                        tenantName: formData.get('tenantName'),
                        tenantEmail: formData.get('tenantEmail'),
                        tenantPhone: formData.get('tenantPhone'),
                        ownerName: formData.get('ownerName'),
                        ownerEmail: formData.get('ownerEmail'),
                        ownerPhone: formData.get('ownerPhone'),
                        price: price,
                        increaseRate: increaseRate,
                        increaseFrequency: increaseFrequency,
                        contractStartDate: formData.get('contractStartDate'),
                        contractEndDate: formData.get('contractEndDate'),
                        rentDueDay: rentDueDay,
                        photoUrl: photoUrl,
                        contract: contractData,
                        cbuAlias: formData.get('cbuAlias'),
                        notifyRentExpiry: formData.get('notifyRentExpiry') === 'on',
                        notifyPunitiveInterests: formData.get('notifyPunitiveInterests') === 'on'
                    };

                    await DataManager.addProperty(property);
                    e.target.reset();
                    modal.classList.add('hidden');
                    document.body.classList.remove('no-scroll');
                    await App.refreshData(); // Re-render data dependent views
                    App.navigateTo('properties-view');
                } catch (error) {
                    console.error("Error saving property:", error);
                    alert("Hubo un error al guardar la propiedad. Intenta con archivos más pequeños.");
                }
            });
        }
    },

    openPropertyDetails: (property) => {
        const modal = document.getElementById('property-details-modal');
        const infoContainer = document.getElementById('details-info-container');
        const closeBtn = document.getElementById('close-details-modal');
        
        // Calculate Status
        const today = new Date();
        // Check if current day is past rentDueDay
        // Note: strictly greater means overdue. e.g. Due 10th. Today 11th -> Overdue.
        const isOverdue = today.getDate() > property.rentDueDay;
        
        // Since we don't track payments yet, we'll assume "Al día" if not overdue, or "Vencido" if overdue.
        // In a real app, we'd check if a payment exists for this month.
        const statusHtml = isOverdue 
            ? `<span class="status-badge status-overdue">Vencido</span>`
            : `<span class="status-badge status-pending">Al día</span>`;

        // Calculate Expiration Date (Current Month)
        // We always show the due date for the *current* month to align with the status
        const dueYear = today.getFullYear();
        const dueMonth = today.getMonth();
        const maxDaysInMonth = new Date(dueYear, dueMonth + 1, 0).getDate();
        const dueDaySafe = Math.min(property.rentDueDay || 1, maxDaysInMonth);
        
        const expirationDate = new Date(dueYear, dueMonth, dueDaySafe);
        const expirationDateStr = expirationDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

        // Populate Info
        infoContainer.innerHTML = `
            <p><strong>Dirección:</strong> ${property.address}</p>
            <p><strong>Estado:</strong> ${statusHtml}</p>
            <p><strong>Vencimiento:</strong> ${expirationDateStr}</p>
            <p><strong>Inquilino:</strong> ${property.tenantName}</p>
            <p><strong>Precio:</strong> $${property.price.toLocaleString()}</p>
            <p><strong>Aumento:</strong> ${property.increaseRate}% cada ${property.increaseFrequency} meses</p>
            <p><strong>Vencimiento Alquiler:</strong> Día ${property.rentDueDay}</p>
            <p><strong>Contrato:</strong> ${property.contractStartDate} al ${property.contractEndDate}</p>
            ${property.contract ? `<p><strong>Archivo:</strong> <a href="${property.contract.data}" download="${property.contract.name}" style="color:var(--primary-color)">Descargar Contrato</a></p>` : ''}
        `;

        // Calendar State
        let currentYear = new Date().getFullYear();
        let currentMonth = new Date().getMonth();

        const render = () => App.renderCalendar(currentYear, currentMonth, property);
        
        // Navigation Handlers (remove old listeners to avoid duplicates if any - simple approach here)
        const prevBtn = document.getElementById('prev-month');
        const nextBtn = document.getElementById('next-month');
        
        prevBtn.onclick = () => {
            currentMonth--;
            if(currentMonth < 0) { currentMonth = 11; currentYear--; }
            render();
        };
        
        nextBtn.onclick = () => {
            currentMonth++;
            if(currentMonth > 11) { currentMonth = 0; currentYear++; }
            render();
        };

        // Initial Render
        render();
        
        // Show Modal
        modal.classList.remove('hidden');
        document.body.classList.add('no-scroll');
        
        // Close Handlers
        closeBtn.onclick = () => {
            modal.classList.add('hidden');
            document.body.classList.remove('no-scroll');
        };
        modal.onclick = (e) => {
            if(e.target === modal) {
                modal.classList.add('hidden');
                document.body.classList.remove('no-scroll');
            }
        };
    },

    renderCalendar: (year, month, property) => {
        // Helper to parse date string YYYY-MM-DD as Local Date (avoiding TZ shifts)
        const parseLocalDate = (dateStr) => {
            if(!dateStr) return null;
            const [y, m, d] = dateStr.split('-').map(Number);
            return new Date(y, m - 1, d, 12, 0, 0); // Noon to match calendar cells
        };

        const grid = document.getElementById('calendar-grid');
        const monthYearLabel = document.getElementById('calendar-month-year');
        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        
        monthYearLabel.textContent = `${monthNames[month]} ${year}`;
        grid.innerHTML = '';

        // Headers
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        days.forEach(d => {
            const el = document.createElement('div');
            el.className = 'calendar-day-header';
            el.textContent = d;
            grid.appendChild(el);
        });

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();

        // Total cells counter
        let totalCells = 0;

        // Empty slots
        for(let i=0; i<firstDay; i++) {
            grid.appendChild(document.createElement('div'));
            totalCells++;
        }

        // Helper to calculate rent for a specific date
        const calculateRent = (date) => {
            const start = parseLocalDate(property.contractStartDate);
            if (!start) return property.price;
            
            if (date < start) return property.price;

            // Calculate months elapsed since start
            const monthsElapsed = (date.getFullYear() - start.getFullYear()) * 12 + (date.getMonth() - start.getMonth());
            
            // Calculate number of increases
            const numIncreases = Math.floor(monthsElapsed / property.increaseFrequency);
            
            if (numIncreases <= 0) return property.price;

            // Compound interest formula: Price * (1 + Rate)^Increases
            const rate = property.increaseRate / 100;
            const newPrice = property.price * Math.pow(1 + rate, numIncreases);
            
            return Math.round(newPrice);
        };

        // Days
        for(let day=1; day<=daysInMonth; day++) {
            const el = document.createElement('div');
            el.className = 'calendar-day';
            
            const dayNumber = document.createElement('span');
            dayNumber.className = 'day-number';
            dayNumber.textContent = day;
            el.appendChild(dayNumber);
            
            const currentDate = new Date(year, month, day, 12, 0, 0);
            
            // Checks
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            if(isToday) el.classList.add('is-today');

            // Contract Start/End
            const startDate = parseLocalDate(property.contractStartDate);
            const endDate = parseLocalDate(property.contractEndDate);
            
            if (startDate && endDate) {
                const isStart = currentDate.getTime() === startDate.getTime();
                const isEnd = currentDate.getTime() === endDate.getTime();

                if(isStart || isEnd) el.classList.add('is-start-end');

                // Rent Due Day & Amount Display
                // Only show if within contract period
                if (currentDate >= startDate && currentDate <= endDate) {
                    if(day === property.rentDueDay) {
                        el.classList.add('is-due');
                        
                        const rentAmount = calculateRent(currentDate);
                        const priceEl = document.createElement('span');
                        priceEl.className = 'calendar-price';
                        priceEl.textContent = `$${rentAmount.toLocaleString()}`;
                        el.appendChild(priceEl);
                    }
                }

                // Increase Dates (Visual indicator only)
                // Check if monthsDiff is positive and multiple of frequency
                // And match the DAY of the start date (e.g. if started on 15th, increases are on 15th)
                if (day === startDate.getDate()) {
                     const monthsDiff = (year - startDate.getFullYear()) * 12 + (month - startDate.getMonth());
                     if (monthsDiff > 0 && monthsDiff % property.increaseFrequency === 0) {
                         if(currentDate <= endDate) el.classList.add('is-increase');
                     }
                }
            }

            grid.appendChild(el);
            totalCells++;
        }

        // Fill remaining slots to maintain constant height (6 rows * 7 days = 42 cells)
        const totalRows = 6;
        const remainingCells = (totalRows * 7) - totalCells;
        
        for(let i=0; i<remainingCells; i++) {
            const el = document.createElement('div');
            el.className = 'calendar-day';
            el.style.opacity = '0';
            el.style.pointerEvents = 'none';
            grid.appendChild(el);
        }
    },

    navigateTo: (viewId) => {
        // Update State
        App.state.currentView = viewId;

        // Update UI Classes
        document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
        document.getElementById(viewId).classList.remove('hidden');

        // Update Nav Active State
        document.querySelectorAll('.nav-link, .nav-item').forEach(el => {
            if (el.getAttribute('data-target') === viewId) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });
    },

    render: async () => {
        const { currentUser } = App.state;
        const loginView = document.getElementById('login-view');
        const mainLayout = document.getElementById('main-layout');

        if (currentUser) {
            loginView.classList.add('hidden');
            mainLayout.classList.remove('hidden');
            document.getElementById('user-display-name').textContent = currentUser.name;
            await App.refreshData();
            // Ensure we are on a valid view, default to home if none active or if coming from login
            if(document.querySelectorAll('.view:not(.hidden)').length === 0 || App.state.currentView === 'login-view') {
                 App.navigateTo('home-view');
            }
        } else {
            loginView.classList.remove('hidden');
            mainLayout.classList.add('hidden');
        }
    },

    // NEW METHODS
    renderTenants: async () => {
        const tenants = await DataManager.getTenants();
        const tbody = document.querySelector('#tenants-table tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (tenants.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--muted-foreground);">No hay inquilinos registrados.</td></tr>';
            return;
        }

        tenants.forEach(t => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="font-weight: 600;">${t.name}</div>
                    <div style="font-size: 0.8em; color: var(--muted-foreground);">${t.email}</div>
                </td>
                <td>${t.phone}</td>
                <td>${t.propertyAddress}</td>
                <td>Vence: ${t.contractEnd}</td>
                <td style="font-weight: 600;">$${t.rent.toLocaleString()}</td>
                <td class="action-cell">
                    <button class="more-options-btn" onclick="App.toggleMenu(event, 'tenant', '${t.id}')">
                        <span class="material-symbols-rounded">more_vert</span>
                    </button>
                    <div id="menu-tenant-${t.id}" class="dropdown-menu">
                        <button class="dropdown-item" onclick="App.handleAction('details', 'tenant', '${t.id}')">
                            <span class="material-symbols-rounded">visibility</span> Ver detalles
                        </button>
                        <button class="dropdown-item" onclick="App.handleAction('edit', 'tenant', '${t.id}')">
                            <span class="material-symbols-rounded">edit</span> Editar
                        </button>
                        <button class="dropdown-item" onclick="App.handleAction('renew', 'tenant', '${t.id}')">
                            <span class="material-symbols-rounded">autorenew</span> Renovar contrato
                        </button>
                        <button class="dropdown-item danger" onclick="App.handleAction('delete', 'tenant', '${t.id}')">
                            <span class="material-symbols-rounded">delete</span> Eliminar
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    renderPayments: async () => {
        // use mock payments for now
        const payments = await DataManager.getMockPayments();
        const tbody = document.querySelector('#payments-table tbody');
        if(!tbody) return;

        tbody.innerHTML = '';

        if (payments.length === 0) {
             tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--muted-foreground);">No hay pagos registrados.</td></tr>';
             return;
        }

        payments.forEach(p => {
            const tr = document.createElement('tr');
            
            // Status Class
            let badgeClass = 'badge-pending';
            if (p.status === 'Pagado') badgeClass = 'badge-paid';
            if (p.status === 'Atrasado') badgeClass = 'badge-late';

            tr.innerHTML = `
                <td style="white-space:nowrap;">${p.date}</td>
                <td style="font-weight: 500;">${p.tenantName}</td>
                <td style="font-size: 0.9em;">${p.propertyAddress}</td>
                <td>${p.method}</td>
                <td style="font-weight: 600;">$${p.amount.toLocaleString()}</td>
                <td><span class="badge ${badgeClass}">${p.status}</span></td>
                <td class="action-cell">
                    <button class="more-options-btn" onclick="App.toggleMenu(event, 'payment', '${p.id}')">
                        <span class="material-symbols-rounded">more_vert</span>
                    </button>
                    <div id="menu-payment-${p.id}" class="dropdown-menu">
                        <button class="dropdown-item" onclick="App.handleAction('details', 'payment', '${p.id}')">
                            <span class="material-symbols-rounded">visibility</span> Ver detalles
                        </button>
                        <button class="dropdown-item" onclick="App.handleAction('edit', 'payment', '${p.id}')">
                            <span class="material-symbols-rounded">edit</span> Editar
                        </button>
                         <button class="dropdown-item danger" onclick="App.handleAction('delete', 'payment', '${p.id}')">
                            <span class="material-symbols-rounded">delete</span> Eliminar
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Update Payment Stats
        const stats = await DataManager.getPaymentStats();
        document.getElementById('payments-total-paid').textContent = `$${stats.totalPaid.toLocaleString()}`;
        document.getElementById('payments-pending-count').textContent = stats.pendingCount;
        document.getElementById('payments-total-transactions').textContent = stats.totalTransactions;
    },

    toggleMenu: (event, type, id) => {
        event.stopPropagation();
        const menuId = `menu-${type}-${id}`;
        const menu = document.getElementById(menuId);
        
        // Close all other menus
        document.querySelectorAll('.dropdown-menu.active').forEach(m => {
            if(m.id !== menuId) m.classList.remove('active');
        });

        if(menu) {
            menu.classList.toggle('active');
        }
    },

    handleAction: (action, type, id) => {
        console.log(`Action: ${action}, Type: ${type}, ID: ${id}`);
        // Close menus
        document.querySelectorAll('.dropdown-menu.active').forEach(m => m.classList.remove('active'));
        
        if (action === 'delete') {
            if(confirm('¿Estás seguro de que deseas eliminar este elemento?')) {
                alert('Elemento eliminado (simulado)');
                // In real app: call DataManager.delete... and re-render
            }
        } else {
            alert(`Acción: ${action} en ${type} (simulada)`);
        }
    },

    refreshData: async () => {
        const properties = await DataManager.getProperties();
        const totalIncome = await DataManager.calculateTotalIncome();

        // Dashboard Stats
        document.getElementById('total-properties-count').textContent = properties.length;
        document.getElementById('total-income-display').textContent = `$${totalIncome.toLocaleString()}`;
        document.getElementById('late-tenants-count').textContent = await DataManager.getLateTenantsCount();

        // Properties List
        const propertiesList = document.getElementById('properties-list');
        propertiesList.innerHTML = '';
        if (properties.length === 0) {
            propertiesList.innerHTML = '<p style="text-align:center; color:var(--text-muted); grid-column: 1/-1;">No hay propiedades registradas.</p>';
        } else {
            properties.forEach(p => {
                const card = document.createElement('div');
                card.className = 'property-card glass-card';
                card.style.cursor = 'pointer';
                card.onclick = (e) => {
                    if(e.target.tagName === 'A' || e.target.closest('a')) return;
                    App.openPropertyDetails(p);
                };
                
                const imgHtml = p.photoUrl ? `<img src="${p.photoUrl}" alt="Foto propiedad" style="width:100%; height: 150px; object-fit: cover; border-radius: var(--radius-sm); margin-bottom: var(--spacing-sm);">` : '';
                
                const contractHtml = p.contract ? `
                    <div style="margin-top: 8px;">
                        <a href="${p.contract.data}" download="${p.contract.name}" class="btn-secondary" style="font-size: 0.8rem; padding: 4px 8px;">
                            <span class="material-symbols-rounded" style="font-size: 16px;">description</span> Ver Contrato
                        </a>
                    </div>
                ` : '';

                const today = new Date();
                const isOverdue = today.getDate() > p.rentDueDay;
                const statusHtml = isOverdue 
                    ? `<span class="status-badge status-overdue" style="font-size: 0.7rem; padding: 2px 6px;">Vencido</span>`
                    : `<span class="status-badge status-pending" style="font-size: 0.7rem; padding: 2px 6px;">Al día</span>`;

                const currentYear = today.getFullYear();
                const currentMonth = today.getMonth();
                const maxDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                const dueDaySafe = Math.min(p.rentDueDay || 1, maxDaysInMonth);
                const expirationDate = new Date(currentYear, currentMonth, dueDaySafe);
                const expirationDateStr = expirationDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

                card.innerHTML = `
                    ${imgHtml}
                    <div class="property-header">
                        <span class="property-address">${p.address}</span>
                        ${statusHtml}
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span class="property-price">$${p.price.toLocaleString()}</span>
                    </div>
                    <div style="font-size: 0.85rem; color: var(--text-main); margin-bottom: 4px;">
                        <strong>Vencimiento:</strong> ${expirationDateStr}
                    </div>
                    <div class="property-tenant">
                        <span class="material-symbols-rounded" style="font-size: 16px;">person</span>
                        ${p.tenantName}
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 8px;">
                        Aumento: ${p.increaseRate}% cada ${p.increaseFrequency} meses
                    </div>
                    ${contractHtml}
                `;
                propertiesList.appendChild(card);
            });
        }

        // Finances View
        document.getElementById('finance-total-income').textContent = `$${totalIncome.toLocaleString()}`;
        const financeList = document.getElementById('finance-breakdown-list');
        financeList.innerHTML = '';
        properties.forEach(p => {
            const item = document.createElement('li');
            item.className = 'finance-item';
            item.innerHTML = `
                <span>${p.address}</span>
                <span style="font-weight: 600;">$${p.price.toLocaleString()}</span>
            `;
            financeList.appendChild(item);
        });

        // REFRESH NEW GRIDS
        App.renderTenants();
        App.renderPayments();
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', App.init);
