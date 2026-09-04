/**
 * Vivat - Plantillas Notariales Dinámicas (DNU 70/2023)
 * Redacción legal blindada según modelos Vivienda y Uso Comercial.
 */

window.ContractTemplates = {
    /**
     * Devuelve el texto base del contrato con las variables inyectadas.
     * @param {Object} data - Datos del contrato (owner, tenant, property, etc.)
     * @param {Array} activeClauses - Lista de cláusulas opcionales activas
     */
    buildHTML: function(data, activeClauses) {
        const {
            owner, tenant, guarantors, property,
            rent, dates, conditions, isComercial
        } = data;

        const clausesHtml = activeClauses.map((clause, idx) => {
            const ordinal = this.getOrdinalName(idx);
            return `
                <div class="clause-section mb-4">
                    <p class="text-justify leading-relaxed text-sm">
                        <strong class="uppercase underline">${ordinal}: ${clause.tag}</strong><br/>
                        ${clause.body}
                    </p>
                </div>
            `;
        }).join('');

        return `
            <div class="contract-document font-serif text-zinc-900 bg-white p-8 max-w-4xl mx-auto shadow-sm border border-zinc-200">
                <h1 class="text-center font-bold text-lg underline uppercase mb-6">CONTRATO DE LOCACIÓN ${isComercial ? 'COMERCIAL' : 'VIVIENDA'}</h1>
                
                <p class="text-justify leading-relaxed text-sm mb-6">
                    Entre ${owner.name}, DNI ${owner.dni}, CUIL ${owner.cuil}, con domicilio electrónico en ${owner.email} y domicilio real en ${owner.domicilio_real || '________'}, en adelante EL/LOS LOCADOR/ES por una parte; y ${tenant.name}, DNI ${tenant.dni}, CUIL ${tenant.cuil}, con domicilio electrónico en ${tenant.email} y domicilio real en ${tenant.domicilio_real || '________'}, en adelante LA LOCATARIA por la otra parte; Convienen en celebrar el presente contrato de locación, que se regirá por las siguientes cláusulas:
                </p>

                ${clausesHtml}

                <div class="signatures mt-12 grid grid-cols-2 gap-8 text-center text-sm">
                    <div>
                        <hr class="w-3/4 mx-auto border-zinc-400 mb-2" />
                        <p>FIRMA LOCADORA</p>
                    </div>
                    <div>
                        <hr class="w-3/4 mx-auto border-zinc-400 mb-2" />
                        <p>FIRMA LOCATARIA</p>
                    </div>
                    ${(guarantors || []).map(g => `
                        <div class="col-span-2 sm:col-span-1 mt-6">
                            <hr class="w-3/4 mx-auto border-zinc-400 mb-2" />
                            <p>FIRMA CODEUDOR / GARANTE</p>
                            <p class="text-xs text-zinc-500">${g.name}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    getOrdinalName: function(idx) {
        const ORDINAL_NAMES = [
            'PRIMERA', 'SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA',
            'SEXTA', 'SÉPTIMA', 'OCTAVA', 'NOVENA', 'DÉCIMA',
            'DÉCIMA PRIMERA', 'DÉCIMA SEGUNDA', 'DÉCIMA TERCERA', 'DÉCIMA CUARTA', 'DÉCIMA QUINTA',
            'DÉCIMA SEXTA', 'DÉCIMA SÉPTIMA', 'DÉCIMA OCTAVA', 'DÉCIMA NOVENA', 'VIGÉSIMA',
            'VIGÉSIMA PRIMERA', 'VIGÉSIMA SEGUNDA', 'VIGÉSIMA TERCERA', 'VIGÉSIMA CUARTA', 'VIGÉSIMA QUINTA',
            'VIGÉSIMA SEXTA', 'VIGÉSIMA SÉPTIMA', 'VIGÉSIMA OCTAVA', 'VIGÉSIMA NOVENA', 'TRIGÉSIMA'
        ];
        return ORDINAL_NAMES[idx] || `CLÁUSULA ${idx + 1}`;
    }
};
