import { getContractForProfile } from '../../api/_auth.js';
export const normalizeDocument = value => String(value || '').toUpperCase().replace(/[.\s-]/g, '');

export function canAccessGuarantee(guarantee, profile, user) {
  if (guarantee.id_perfil) return Number(guarantee.id_perfil) === Number(profile.id_perfil);
  return Boolean(user?.email_confirmed_at && user?.email &&
    String(guarantee.email).toLowerCase() === user.email.toLowerCase());
}

// Signature access is deliberately separate from payment/inventory permissions.
export async function getSigningContract(supabase, id, profile, user) {
  const access = await getContractForProfile(supabase, id, profile.id_perfil);
  if (access.error || !access.contract || access.role) return access;
  if (Number(access.contract.id_perfil_inquilino) === Number(access.contract.id_perfil_propietario)) return access;
  const { data, error } = await supabase.from('Contrato_Garante').select('*').eq('id_contrato', id);
  if (error) return { ...access, error };
  const guarantor = (data || []).find(g => canAccessGuarantee(g, profile, user));
  return { ...access, role: guarantor ? 'garante' : null, guarantor };
}

export async function bindGuarantor(supabase, guarantee, profile) {
  if (!normalizeDocument(profile.dni) || normalizeDocument(profile.dni) !== normalizeDocument(guarantee.datos.dni)) {
    const error = new Error('El DNI de tu perfil debe coincidir con el del garante invitado. Completá tu verificación de identidad antes de firmar.');
    error.code = 'CONTRACT_INCOMPLETE'; throw error;
  }
  if (guarantee.id_perfil) return;
  const { data, error } = await supabase.from('Contrato_Garante').update({ id_perfil: profile.id_perfil })
    .eq('id_contrato', guarantee.id_contrato).eq('id_garante', guarantee.id_garante).is('id_perfil', null)
    .select('id_perfil').maybeSingle();
  if (error) throw error;
  if (!data) {
    const { data: current, error: readError } = await supabase.from('Contrato_Garante').select('id_perfil')
      .eq('id_contrato', guarantee.id_contrato).eq('id_garante', guarantee.id_garante).single();
    if (readError) throw readError;
    if (Number(current.id_perfil) !== Number(profile.id_perfil)) throw new Error('Guarantor already bound to another account.');
  }
}

export async function contractGuarantors(supabase, contract) {
  if (contract.garantes_fijados_at) {
    const { data, error } = await supabase.from('Contrato_Garante').select('datos').eq('id_contrato', contract.id_contrato).order('id_garante');
    if (error) throw error;
    return (data || []).map(g => g.datos);
  }
  const { data: passports, error } = await supabase.from('Pasaporte_vivat').select('id_pasaporte').eq('id_perfil', contract.id_perfil_inquilino);
  if (error) throw error;
  if (!passports?.length) return [];
  const { data, error: guaranteeError } = await supabase.from('Garante')
    .select('id_garante, nombre_completo, dni, cuit, email, relacion_inquilino, id_tipo_garantia')
    .in('id_pasaporte', passports.map(p => p.id_pasaporte)).order('id_garante');
  if (guaranteeError) throw guaranteeError;
  return data || [];
}
