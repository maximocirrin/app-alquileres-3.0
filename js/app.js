/**
 * Main Application Logic
 */

const App = {
    state: {
        currentUser: null,
        currentView: 'home-view'
    },

    init: () => {
        App.initTheme();
        App.state.currentUser = DataManager.getCurrentUser();
        App.render();
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

        // Open Modal
        openModalBtns.forEach(btn => {
            if(btn) {
                btn.addEventListener('click', () => {
                    modal.classList.remove('hidden');
                });
            }
        });

        // Close Modal
        if(closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                modal.classList.add('hidden');
            });
        }
        
        // Close on click outside
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
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
                        // Default placeholder if no file
                        photoUrl = 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80';
                    }

                    let contractData = null;
                    if (contractFile && contractFile.size > 0) {
                        contractData = {
                            name: contractFile.name,
                            data: await readFile(contractFile)
                        };
                    }

                    const property = {
                        address: formData.get('address'),
                        tenantName: formData.get('tenantName'),
                        price: parseFloat(formData.get('price')),
                        increaseRate: parseFloat(formData.get('increaseRate')),
                        increaseFrequency: parseInt(formData.get('increaseFrequency')),
                        contractStartDate: formData.get('contractStartDate'),
                        contractEndDate: formData.get('contractEndDate'),
                        rentDueDay: parseInt(formData.get('rentDueDay')),
                        photoUrl: photoUrl,
                        contract: contractData
                    };

                    DataManager.addProperty(property);
                    e.target.reset();
                    modal.classList.add('hidden');
                    App.refreshData(); // Re-render data dependent views
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
        
        // Populate Info
        infoContainer.innerHTML = `
            <p><strong>Dirección:</strong> ${property.address}</p>
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
        
        // Close Handlers
        closeBtn.onclick = () => modal.classList.add('hidden');
        modal.onclick = (e) => {
            if(e.target === modal) modal.classList.add('hidden');
        };
    },

    renderCalendar: (year, month, property) => {
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

        // Empty slots
        for(let i=0; i<firstDay; i++) {
            grid.appendChild(document.createElement('div'));
        }

        // Helper to calculate rent for a specific date
        const calculateRent = (date) => {
            const start = new Date(property.contractStartDate);
            start.setHours(12,0,0,0);
            
            if (date < start) return property.price;

            // Calculate months elapsed since start
            const monthsElapsed = (date.getFullYear() - start.getFullYear()) * 12 + (date.getMonth() - start.getMonth());
            
            // Calculate number of increases
            const numIncreases = Math.floor(monthsElapsed / property.increaseFrequency);
            
            if (numIncreases <= 0) return property.price;

            // Compound interest formula: Price * (1 + Rate)^Increases
            // Assuming rate is percentage e.g. 10 for 10%
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
            
            const currentDate = new Date(year, month, day);
            currentDate.setHours(12,0,0,0);
            
            // Checks
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            if(isToday) el.classList.add('is-today');

            // Contract Start/End
            const startDate = new Date(property.contractStartDate);
            startDate.setHours(12,0,0,0);
            const endDate = new Date(property.contractEndDate);
            endDate.setHours(12,0,0,0);
            
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

            // Increase Dates (Visual indicator only, amount is handled by is-due logic)
            // Logic: Start Date + (Frequency * N months)
            let tempDate = new Date(startDate);
            // We iterate to find if THIS specific day is an increase day
            // Optimization: Calculate increases relative to start date
            
            // Check if this month/day aligns with an increase
            const monthsDiff = (year - startDate.getFullYear()) * 12 + (month - startDate.getMonth());
            if (monthsDiff > 0 && monthsDiff % property.increaseFrequency === 0 && day === startDate.getDate()) {
                 if(currentDate <= endDate) el.classList.add('is-increase');
            }

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

    render: () => {
        const { currentUser } = App.state;
        const loginView = document.getElementById('login-view');
        const mainLayout = document.getElementById('main-layout');

        if (currentUser) {
            loginView.classList.add('hidden');
            mainLayout.classList.remove('hidden');
            document.getElementById('user-display-name').textContent = currentUser.name;
            App.refreshData();
            // Ensure we are on a valid view, default to home if none active or if coming from login
            if(document.querySelectorAll('.view:not(.hidden)').length === 0 || App.state.currentView === 'login-view') {
                 App.navigateTo('home-view');
            }
        } else {
            loginView.classList.remove('hidden');
            mainLayout.classList.add('hidden');
        }
    },

    refreshData: () => {
        const properties = DataManager.getProperties();
        const totalIncome = DataManager.calculateTotalIncome();

        // Dashboard Stats
        document.getElementById('total-properties-count').textContent = properties.length;
        document.getElementById('total-income-display').textContent = `$${totalIncome.toLocaleString()}`;

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
                    // Prevent opening modal if clicking a link/button inside card
                    if(e.target.tagName === 'A' || e.target.closest('a')) return;
                    App.openPropertyDetails(p);
                };
                
                // Create image element if photo exists
                const imgHtml = p.photoUrl ? `<img src="${p.photoUrl}" alt="Foto propiedad" style="width:100%; height: 150px; object-fit: cover; border-radius: var(--radius-sm); margin-bottom: var(--spacing-sm);">` : '';
                
                // Create contract link if exists
                const contractHtml = p.contract ? `
                    <div style="margin-top: 8px;">
                        <a href="${p.contract.data}" download="${p.contract.name}" class="btn-secondary" style="font-size: 0.8rem; padding: 4px 8px;">
                            <span class="material-symbols-rounded" style="font-size: 16px;">description</span> Ver Contrato
                        </a>
                    </div>
                ` : '';

                card.innerHTML = `
                    ${imgHtml}
                    <div class="property-header">
                        <span class="property-address">${p.address}</span>
                        <span class="property-price">$${p.price.toLocaleString()}</span>
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
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', App.init);
