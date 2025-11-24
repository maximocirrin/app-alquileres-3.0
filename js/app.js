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
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        App.updateThemeIcons();
    },

    toggleTheme: () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        if (newTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        
        localStorage.setItem('theme', newTheme);
        App.updateThemeIcons();
    },

    updateThemeIcons: () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const iconName = isDark ? 'light_mode' : 'dark_mode';
        
        const desktopBtn = document.querySelector('#theme-toggle-btn span');
        if(desktopBtn) desktopBtn.textContent = iconName;
        
        const mobileBtn = document.querySelector('#mobile-theme-toggle span');
        if(mobileBtn) mobileBtn.textContent = iconName;
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
            }
        });

        // Logout
        const handleLogout = () => {
            DataManager.logout();
            App.state.currentUser = null;
            App.render();
        };
        document.getElementById('logout-btn').addEventListener('click', handleLogout);
        document.getElementById('mobile-logout-btn').addEventListener('click', handleLogout);

        // Theme Toggle
        const themeBtn = document.getElementById('theme-toggle-btn');
        if(themeBtn) themeBtn.addEventListener('click', App.toggleTheme);
        
        const mobileThemeBtn = document.getElementById('mobile-theme-toggle');
        if(mobileThemeBtn) mobileThemeBtn.addEventListener('click', App.toggleTheme);

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

        // Add Property Modal
        const modal = document.getElementById('add-property-modal');
        const openModalBtns = [document.getElementById('quick-add-btn'), document.getElementById('add-property-fab')];
        const closeModalBtn = document.querySelector('.close-modal');

        openModalBtns.forEach(btn => {
            if(btn) {
                btn.addEventListener('click', () => {
                    modal.classList.remove('hidden');
                });
            }
        });

        closeModalBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        // Close modal on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });

        // Add Property Form Submit
        document.getElementById('add-property-form').addEventListener('submit', async (e) => {
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
