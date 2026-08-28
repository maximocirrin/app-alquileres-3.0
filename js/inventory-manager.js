const InventoryManager = {
    modalId: 'inventory-manager-modal',
    currentContractId: null,
    currentPropertyId: null,
    items: [],
    videoFile: null,
    videoUrl: null,
    videoHash: null,
    isReadOnly: false,

    init() {
        if (!document.getElementById(this.modalId)) {
            this.injectModal();
        }
    },

    injectModal() {
        const modalHtml = `
        <div id="${this.modalId}" class="fixed inset-0 z-[9999] hidden flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm transition-opacity" onclick="window.InventoryManager.closeModal()"></div>
            
            <div class="relative w-full max-w-5xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
                <header class="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
                    <div>
                        <h2 class="text-xl font-headline font-black text-zinc-900 dark:text-white">Inventario del Inmueble (Anexo I)</h2>
                        <p class="text-sm text-zinc-500 mt-1">Detalle del estado de conservación con soporte multimedia para adjuntar al contrato.</p>
                    </div>
                    <button onclick="window.InventoryManager.closeModal()" class="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </header>
                
                <main class="flex-1 overflow-y-auto p-6 space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <!-- Left Panel: Form -->
                        <div class="md:col-span-1 space-y-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800" id="inv-form-panel">
                            <h3 class="font-bold text-sm text-zinc-900 dark:text-white mb-2">Agregar Ítem</h3>
                            
                            <div>
                                <label class="block text-xs font-bold text-zinc-500 uppercase mb-1">Ambiente</label>
                                <input type="text" id="inv-ambiente" placeholder="Ej: Cocina, Dormitorio..." class="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all">
                            </div>
                            
                            <div>
                                <label class="block text-xs font-bold text-zinc-500 uppercase mb-1">Elemento</label>
                                <input type="text" id="inv-nombre" placeholder="Ej: Horno eléctrico, Paredes..." class="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all">
                            </div>
                            
                            <div>
                                <label class="block text-xs font-bold text-zinc-500 uppercase mb-1">Estado</label>
                                <select id="inv-estado" class="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all">
                                    <option value="1">Nuevo</option>
                                    <option value="2" selected>Bueno</option>
                                    <option value="3">Regular</option>
                                    <option value="4">Malo</option>
                                </select>
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-zinc-500 uppercase mb-1">Observaciones (Opcional)</label>
                                <textarea id="inv-obs" rows="2" placeholder="Detalles de marcas, rayas, etc." class="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all resize-none"></textarea>
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-zinc-500 uppercase mb-1">Fotos (Opcional)</label>
                                <input type="file" id="inv-fotos" accept="image/*" multiple class="w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all cursor-pointer">
                                <p class="text-[10px] text-zinc-400 mt-1">Las imágenes se optimizarán automáticamente.</p>
                            </div>
                            
                            <button type="button" onclick="window.InventoryManager.addItem()" class="w-full py-2.5 bg-primary hover:bg-primary-hover text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2">
                                <span class="material-symbols-outlined text-sm">add</span>
                                Agregar Ítem
                            </button>
                        </div>
                        
                        <!-- Right Panel: List -->
                        <div class="md:col-span-2 space-y-4 flex flex-col">
                            <h3 class="font-bold text-sm text-zinc-900 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-2">Ítems Registrados</h3>
                            
                            <div id="inv-items-container" class="space-y-3 flex-1 overflow-y-auto pr-2 max-h-[350px]">
                                <!-- Items will be listed here -->
                            </div>

                            <div class="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs font-bold text-zinc-500 uppercase mb-1">Observaciones Generales</label>
                                    <textarea id="inv-generales" rows="3" placeholder="Observaciones que aplican a toda la propiedad..." class="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all resize-none"></textarea>
                                </div>
                                <div class="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-700">
                                    <label class="block text-xs font-bold text-zinc-500 uppercase mb-1">Video Panorámico (Opcional)</label>
                                    <div id="video-upload-area">
                                        <input type="file" id="inv-video" accept="video/*" onchange="window.InventoryManager.handleVideoSelect(event)" class="w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-500/10 file:text-blue-600 hover:file:bg-blue-500/20 transition-all cursor-pointer">
                                        <p class="text-[10px] text-zinc-400 mt-1">Máximo recomendado: 250MB. Se calculará el Hash SHA-256 localmente.</p>
                                    </div>
                                    <div id="video-info-area" class="hidden mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                        <div class="flex items-center justify-between">
                                            <span class="text-xs font-bold text-blue-700 dark:text-blue-400 truncate flex-1" id="video-filename">video.mp4</span>
                                            <button type="button" onclick="window.InventoryManager.removeVideo()" class="text-red-500 hover:text-red-700 ml-2" id="btn-remove-video"><span class="material-symbols-outlined text-sm">delete</span></button>
                                        </div>
                                        <p class="text-[9px] font-mono text-zinc-500 mt-1 truncate" id="video-hash-display">Calculando hash...</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
                
                <!-- Footer -->
                <footer class="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-between gap-3">
                    <div id="upload-progress" class="text-xs font-bold text-blue-600 dark:text-blue-400 hidden flex items-center gap-2">
                        <span class="material-symbols-outlined animate-spin text-sm">refresh</span>
                        <span id="upload-progress-text">Subiendo archivos...</span>
                    </div>
                    <div class="flex items-center gap-3 ml-auto">
                        <button onclick="window.InventoryManager.closeModal()" class="px-5 py-2.5 rounded-xl font-bold text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">Cerrar</button>
                        <button onclick="window.InventoryManager.saveInventory()" id="inv-save-btn" class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md flex items-center gap-2 transition-all">
                            <span class="material-symbols-outlined text-sm">save</span>
                            Guardar Inventario
                        </button>
                    </div>
                </footer>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    async openModal(contractId, propertyId, isReadOnly = false) {
        this.init();
        this.currentContractId = contractId;
        this.currentPropertyId = propertyId;
        this.items = [];
        this.videoFile = null;
        this.videoUrl = null;
        this.videoHash = null;
        this.isReadOnly = isReadOnly;
        
        document.getElementById('inv-ambiente').value = '';
        document.getElementById('inv-nombre').value = '';
        document.getElementById('inv-obs').value = '';
        document.getElementById('inv-fotos').value = '';
        document.getElementById('inv-generales').value = '';
        this.removeVideo();
        
        // Configurar UI para read-only
        document.getElementById('inv-ambiente').disabled = isReadOnly;
        document.getElementById('inv-nombre').disabled = isReadOnly;
        document.getElementById('inv-estado').disabled = isReadOnly;
        document.getElementById('inv-obs').disabled = isReadOnly;
        document.getElementById('inv-fotos').disabled = isReadOnly;
        document.getElementById('inv-generales').disabled = isReadOnly;
        
        const formPanel = document.getElementById('inv-form-panel');
        if (formPanel) formPanel.style.display = isReadOnly ? 'none' : 'block';
        
        const videoUploadArea = document.getElementById('video-upload-area');
        if (videoUploadArea) videoUploadArea.style.display = isReadOnly ? 'none' : 'block';
        
        const saveBtn = document.getElementById('inv-save-btn');
        if(saveBtn) saveBtn.style.display = isReadOnly ? 'none' : 'flex';

        document.getElementById('inv-items-container').innerHTML = '<div class="text-center p-4 text-sm text-zinc-500">Cargando inventario...</div>';
        document.getElementById(this.modalId).classList.remove('hidden');

        try {
            const res = await fetch(`/api/inventario?id_contrato=${contractId}`);
            const data = await res.json();
            
            if (res.ok && data.inventario) {
                document.getElementById('inv-generales').value = data.inventario.observaciones_generales || '';
                
                if (data.inventario.video_url) {
                    this.videoUrl = data.inventario.video_url;
                    this.videoHash = data.inventario.video_hash;
                    document.getElementById('video-info-area').classList.remove('hidden');
                    if(videoUploadArea) videoUploadArea.style.display = 'none';
                    document.getElementById('video-filename').innerText = 'Video Adjunto (Ya subido)';
                    document.getElementById('video-hash-display').innerText = `SHA-256: ${this.videoHash ? this.videoHash.substring(0,20)+'...' : 'N/A'}`;
                    const btnRemove = document.getElementById('btn-remove-video');
                    if(btnRemove) btnRemove.style.display = isReadOnly ? 'none' : 'block';
                }
                
                if (data.inventario.items && data.inventario.items.length > 0) {
                    this.items = data.inventario.items.map(it => ({
                        id: crypto.randomUUID(),
                        ambiente: it.ambiente,
                        nombre: it.Item?.nombre || 'Elemento',
                        id_estado_item: it.id_estado_item,
                        observaciones: it.observaciones,
                        fotos_urls: it.fotos_urls || [],
                        fotosFiles: []
                    }));
                }
            }
        } catch (e) {
            console.error(e);
            if(window.ToastManager) window.ToastManager.show({ title: 'Error', message: 'No se pudo cargar el inventario.', type: 'error' });
        }
        
        this.renderItems();
    },

    closeModal() {
        const modal = document.getElementById(this.modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
    },

    async handleVideoSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.videoFile = file;
        this.videoUrl = null;
        this.videoHash = null;

        document.getElementById('video-upload-area').style.display = 'none';
        document.getElementById('video-info-area').classList.remove('hidden');
        document.getElementById('video-filename').innerText = file.name;
        document.getElementById('video-hash-display').innerText = 'Calculando hash SHA-256...';

        try {
            const hash = await this.computeFileHash(file);
            this.videoHash = hash;
            document.getElementById('video-hash-display').innerText = `SHA-256: ${hash.substring(0, 20)}...`;
        } catch (error) {
            console.error('Error calculando hash:', error);
            document.getElementById('video-hash-display').innerText = 'Error calculando hash';
        }
    },

    removeVideo() {
        this.videoFile = null;
        this.videoUrl = null;
        this.videoHash = null;
        const videoInput = document.getElementById('inv-video');
        if(videoInput) videoInput.value = '';
        
        if (!this.isReadOnly) {
            document.getElementById('video-upload-area').style.display = 'block';
        }
        document.getElementById('video-info-area').classList.add('hidden');
    },

    async addItem() {
        const ambiente = document.getElementById('inv-ambiente').value.trim();
        const nombre = document.getElementById('inv-nombre').value.trim();
        const id_estado_item = parseInt(document.getElementById('inv-estado').value, 10);
        const observaciones = document.getElementById('inv-obs').value.trim();
        const fotosInput = document.getElementById('inv-fotos');

        if (!ambiente || !nombre) {
            alert('Por favor completa Ambiente y Elemento.');
            return;
        }

        const btn = document.querySelector('button[onclick="window.InventoryManager.addItem()"]');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">refresh</span> Procesando...';

        try {
            const compressedFiles = [];
            if (fotosInput.files && fotosInput.files.length > 0) {
                for (const file of Array.from(fotosInput.files)) {
                    const compressed = await this.compressImage(file);
                    compressedFiles.push(compressed);
                }
            }

            this.items.push({
                id: crypto.randomUUID(),
                ambiente,
                nombre,
                id_estado_item,
                observaciones,
                fotos_urls: [],
                fotosFiles: compressedFiles
            });

            document.getElementById('inv-nombre').value = '';
            document.getElementById('inv-obs').value = '';
            document.getElementById('inv-fotos').value = '';
            document.getElementById('inv-nombre').focus();

            this.renderItems();
        } catch(e) {
            console.error('Error processing item:', e);
            alert('Error al adjuntar fotos.');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    },

    removeItem(id) {
        this.items = this.items.filter(i => i.id !== id);
        this.renderItems();
    },

    renderItems() {
        const container = document.getElementById('inv-items-container');
        if (this.items.length === 0) {
            container.innerHTML = '<div class="text-center p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl text-zinc-500 text-sm">No hay ítems registrados aún.</div>';
            return;
        }

        const porAmbiente = {};
        this.items.forEach(it => {
            if (!porAmbiente[it.ambiente]) porAmbiente[it.ambiente] = [];
            porAmbiente[it.ambiente].push(it);
        });

        const estados = {1: 'Nuevo', 2: 'Bueno', 3: 'Regular', 4: 'Malo'};
        const colores = {1: 'text-emerald-600 bg-emerald-50', 2: 'text-blue-600 bg-blue-50', 3: 'text-amber-600 bg-amber-50', 4: 'text-red-600 bg-red-50'};

        let html = '';
        for (const [amb, items] of Object.entries(porAmbiente)) {
            html += `<div class="mb-4"><h4 class="font-bold text-xs text-zinc-800 dark:text-zinc-200 uppercase mb-2 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg">${amb}</h4><div class="space-y-2">`;
            items.forEach(it => {
                const badgeColor = colores[it.id_estado_item] || 'text-zinc-600 bg-zinc-100';
                const hasPhotos = (it.fotosFiles && it.fotosFiles.length > 0) || (it.fotos_urls && it.fotos_urls.length > 0);
                
                html += `
                    <div class="flex items-start justify-between p-3 rounded-xl bg-white dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 shadow-xs hover:border-zinc-300 transition-colors">
                        <div class="flex-1">
                            <div class="flex items-center gap-2">
                                <span class="font-bold text-sm text-zinc-900 dark:text-white">${it.nombre}</span>
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${badgeColor}">${estados[it.id_estado_item] || 'Bueno'}</span>
                                ${hasPhotos ? '<span class="material-symbols-outlined text-xs text-zinc-400" title="Contiene fotos adjuntas">photo_camera</span>' : ''}
                            </div>
                            ${it.observaciones ? `<p class="text-xs text-zinc-500 mt-1">${it.observaciones}</p>` : ''}
                            ${(it.fotos_urls && it.fotos_urls.length > 0) ? `
                            <div class="flex gap-2 mt-2 overflow-x-auto pb-1">
                                ${it.fotos_urls.map(url => `<img src="${url}" class="h-10 w-10 object-cover rounded-lg border border-zinc-200 dark:border-zinc-700">`).join('')}
                            </div>
                            ` : ''}
                            ${(it.fotosFiles && it.fotosFiles.length > 0) ? `
                            <div class="flex gap-2 mt-2">
                                <span class="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded">${it.fotosFiles.length} foto(s) por subir</span>
                            </div>
                            ` : ''}
                        </div>
                        ${this.isReadOnly ? '' : `
                        <button type="button" onclick="window.InventoryManager.removeItem('${it.id}')" class="text-red-500 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors">
                            <span class="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                        `}
                    </div>
                `;
            });
            html += `</div></div>`;
        }
        
        container.innerHTML = html;
    },

    async saveInventory() {
        const btn = document.getElementById('inv-save-btn');
        const progressDiv = document.getElementById('upload-progress');
        const progressText = document.getElementById('upload-progress-text');
        
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">refresh</span> Procesando...';
        progressDiv.classList.remove('hidden');

        try {
            if (!window.supabaseClient) {
                throw new Error("Supabase client no encontrado.");
            }

            // Upload Video si hay
            if (this.videoFile) {
                progressText.innerText = 'Subiendo video...';
                const ext = this.videoFile.name.split('.').pop();
                const path = `${this.currentContractId}/inventario/video_${crypto.randomUUID()}.${ext}`;
                
                const { data, error } = await window.supabaseClient.storage
                    .from('contratos_firmados')
                    .upload(path, this.videoFile, { upsert: true });

                if (error) throw error;
                
                const { data: publicUrlData } = window.supabaseClient.storage.from('contratos_firmados').getPublicUrl(path);
                this.videoUrl = publicUrlData.publicUrl;
            }

            // Upload Fotos por item
            for (let i = 0; i < this.items.length; i++) {
                const item = this.items[i];
                if (item.fotosFiles && item.fotosFiles.length > 0) {
                    for (let j = 0; j < item.fotosFiles.length; j++) {
                        progressText.innerText = `Subiendo fotos... (${i+1}/${this.items.length})`;
                        const file = item.fotosFiles[j];
                        const path = `${this.currentContractId}/inventario/foto_${crypto.randomUUID()}.jpg`;
                        
                        const { data, error } = await window.supabaseClient.storage
                            .from('contratos_firmados')
                            .upload(path, file, { contentType: 'image/jpeg', upsert: true });

                        if (error) throw error;
                        
                        const { data: publicUrlData } = window.supabaseClient.storage.from('contratos_firmados').getPublicUrl(path);
                        item.fotos_urls.push(publicUrlData.publicUrl);
                    }
                    item.fotosFiles = []; // Clear them after successful upload
                }
            }

            progressText.innerText = 'Guardando datos...';

            const payload = {
                id_contrato: this.currentContractId,
                id_propiedad: this.currentPropertyId,
                observaciones_generales: document.getElementById('inv-generales').value.trim(),
                video_url: this.videoUrl,
                video_hash: this.videoHash,
                items: this.items.map(it => ({
                    ambiente: it.ambiente,
                    id_estado_item: it.id_estado_item,
                    observaciones: `${it.nombre}. ${it.observaciones}`.trim(),
                    fotos_urls: it.fotos_urls
                }))
            };

            const res = await fetch('/api/inventario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Error al guardar inventario en DB');
            
            if(window.ToastManager) window.ToastManager.show({ title: 'Éxito', message: 'Inventario guardado correctamente.', type: 'success' });
            this.closeModal();

        } catch (e) {
            console.error(e);
            alert('Error al guardar el inventario: ' + e.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<span class="material-symbols-outlined text-sm">save</span> Guardar Inventario';
            progressDiv.classList.add('hidden');
        }
    },

    // --- Helpers Técnicos ---

    async computeFileHash(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const buffer = e.target.result;
                    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
                    const hashArray = Array.from(new Uint8Array(hashBuffer));
                    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                    resolve(hashHex);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    },

    compressImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = event => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const MAX_WIDTH = 1920;
                    
                    if (width > MAX_WIDTH) {
                        height = Math.round((height * MAX_WIDTH) / width);
                        width = MAX_WIDTH;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
                        } else {
                            reject(new Error('Canvas to Blob failed'));
                        }
                    }, 'image/jpeg', 0.8);
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
        });
    }
};

window.InventoryManager = InventoryManager;
