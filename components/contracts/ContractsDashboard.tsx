import React from 'react';
import { Contract, ContractStatus, UserRole } from '../../types/contract';

export interface ContractsDashboardProps {
  contracts: Contract[];
  currentRole: UserRole;
  onChangeRole: (role: UserRole) => void;
  statusFilter: string;
  onChangeStatusFilter: (filter: string) => void;
  searchQuery: string;
  onChangeSearchQuery: (query: string) => void;
  onOpenContract: (contract: Contract) => void;
  onDownloadContract: (contract: Contract) => void;
  onDownloadAuditTrail: (contract: Contract) => void;
}

export const ContractsDashboard: React.FC<ContractsDashboardProps> = ({
  contracts,
  currentRole,
  onChangeRole,
  statusFilter,
  onChangeStatusFilter,
  searchQuery,
  onChangeSearchQuery,
  onOpenContract,
  onDownloadContract,
  onDownloadAuditTrail,
}) => {
  const getStatusBadge = (status: ContractStatus) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-zinc-400" />
            Borrador
          </span>
        );
      case 'WAITING_TENANT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Esperando Firma Inquilino
          </span>
        );
      case 'WAITING_OWNER':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Esperando Firma Propietario
          </span>
        );
      case 'SIGNED_AND_SEALED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
            <span className="material-symbols-outlined text-sm">verified</span>
            Firmado y Sellado
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50">
            <span className="material-symbols-outlined text-sm">cancel</span>
            Rechazado
          </span>
        );
      default:
        return null;
    }
  };

  const formatCurrency = (val: number, cur: string = 'ARS') => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="w-full space-y-6">
      
      {/* Top Banner & Role Selector */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-primary/30 text-red-300 font-bold text-[11px] uppercase tracking-wider">
              Módulo Legal Vivat
            </span>
            <span className="text-zinc-400 text-xs font-medium">Ley 25.506 Firma Digital</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-headline font-extrabold tracking-tight">
            Firma Electrónica y Gestión de Contratos
          </h1>
          <p className="text-xs sm:text-sm text-zinc-300 max-w-xl">
            Gestione, valide biométricamente con <b>Didit</b> y firme contratos con valor probatorio inmutable y sello de tiempo TSA.
          </p>
        </div>

        {/* Role Toggle */}
        <div className="p-1.5 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center gap-1 shrink-0">
          <button
            onClick={() => onChangeRole('TENANT')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentRole === 'TENANT'
                ? 'bg-primary text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm">person</span>
            Inquilino (TENANT)
          </button>

          <button
            onClick={() => onChangeRole('OWNER')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentRole === 'OWNER'
                ? 'bg-primary text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm">home</span>
            Propietario (OWNER)
          </button>

          <button
            onClick={() => onChangeRole('BROKER')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentRole === 'BROKER'
                ? 'bg-primary text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm">real_estate_agent</span>
            Corredor (BROKER)
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status Filters */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'Todos' },
            { id: 'WAITING_TENANT', label: 'Firma Inquilino' },
            { id: 'WAITING_OWNER', label: 'Firma Propietario' },
            { id: 'SIGNED_AND_SEALED', label: 'Firmados' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => onChangeStatusFilter(f.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                statusFilter === f.id
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                  : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="relative w-full sm:w-72">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-lg">
            search
          </span>
          <input
            type="text"
            placeholder="Buscar por dirección o parte..."
            value={searchQuery}
            onChange={(e) => onChangeSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Contracts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {contracts.map((c) => {
          const isTenant = currentRole === 'TENANT';
          const isOwner = currentRole === 'OWNER';
          const isBroker = currentRole === 'BROKER';

          const canSign = (isTenant && !c.tenant.hasSigned) || (isOwner && !c.owner.hasSigned);
          const isComplete = c.status === 'SIGNED_AND_SEALED';

          return (
            <div
              key={c.id}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              {/* Header Card */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-zinc-400">{c.contractNumber}</span>
                  {getStatusBadge(c.status)}
                </div>

                <div>
                  <h3 className="font-headline font-bold text-zinc-900 dark:text-white text-base truncate">
                    {c.title}
                  </h3>
                  <p className="text-xs text-zinc-500 truncate flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-xs">location_on</span>
                    {c.propertyAddress}
                  </p>
                </div>

                {/* Pricing & Duration */}
                <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase font-bold block">Canon Mensual</span>
                    <span className="font-extrabold text-zinc-900 dark:text-white">
                      {formatCurrency(c.monthlyRent, c.currency)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold block">Ajuste</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {c.adjustmentIndex} ({c.adjustmentFrequencyMonths}m)
                    </span>
                  </div>
                </div>

                {/* Signers Status Progress */}
                <div className="space-y-2 pt-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase block">Firmantes</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* Inquilino */}
                    <div className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                      <span className="text-[9px] text-zinc-400 block font-semibold">Inquilino</span>
                      <div className="font-bold text-zinc-900 dark:text-white truncate">{c.tenant.name}</div>
                      <div className="mt-1">
                        {c.tenant.hasSigned ? (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-xs">check</span> Firmó
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-xs">schedule</span> Pendiente
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Propietario */}
                    <div className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                      <span className="text-[9px] text-zinc-400 block font-semibold">Propietario</span>
                      <div className="font-bold text-zinc-900 dark:text-white truncate">{c.owner.name}</div>
                      <div className="mt-1">
                        {c.owner.hasSigned ? (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-xs">check</span> Firmó
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-xs">schedule</span> Pendiente
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons based on Role */}
              <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                {/* Signer: Review and Sign */}
                {canSign && (
                  <button
                    onClick={() => onOpenContract(c)}
                    className="w-full py-2.5 px-4 bg-primary hover:bg-primary-container text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">draw</span>
                    Revisar y Firmar Contrato
                  </button>
                )}

                {/* If already completed or user already signed */}
                {!canSign && (
                  <button
                    onClick={() => onOpenContract(c)}
                    className="w-full py-2.5 px-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">visibility</span>
                    Ver Documento Contractual
                  </button>
                )}

                {/* Completed / Broker Download Actions */}
                {(isComplete || isBroker) && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onDownloadContract(c)}
                      title="Descargar Contrato PDF"
                      className="flex-1 py-2 text-[11px] font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 rounded-xl transition-colors flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">download</span>
                      Contrato PDF
                    </button>

                    <button
                      onClick={() => onDownloadAuditTrail(c)}
                      title="Descargar Certificado de Evidencia / Audit Trail"
                      className="flex-1 py-2 text-[11px] font-bold bg-zinc-900 text-white dark:bg-zinc-800 hover:bg-black rounded-xl transition-colors flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">verified_user</span>
                      Audit Trail
                    </button>
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
