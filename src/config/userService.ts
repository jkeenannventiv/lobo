import { supabase } from './supabase';
import { getSession } from './storage';

export async function syncUserToSupabase(phone: string, email?: string, deviceId?: string) {
  
  try {
    const { data: existing, error: selectError } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phone)
      .single();

    
    if (existing) {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          last_active: new Date().toISOString(),
          email: email || undefined,
          device_id: deviceId || undefined,
        })
        .eq('phone', phone);
      
      return existing.id;
    } else {
      const { data, error } = await supabase
        .from('users')
        .insert({
          phone,
          email: email || null,
          device_id: deviceId || null,
        })
        .select('id')
        .single();

      
      if (error) throw error;
      return data?.id;
    }
  } catch (e) {
    console.error('syncUserToSupabase error:', e);
    return null;
  }
}

export async function logImportToSupabase(userId: string, recordCount: number, format: string) {
  try {
    await supabase
      .from('import_log')
      .insert({
        user_id: userId,
        record_count: recordCount,
        format,
      });
  } catch (e) {
    console.error('Failed to log import to Supabase:', e);
  }
}

export async function syncConsentToSupabase(
  userId: string,
  consentVersion: string,
  dataSharingOptIn: boolean,
  consentedAt: string
): Promise<void> {
  try {
    await supabase
      .from('users')
      .update({
        consent_version: consentVersion,
        data_sharing_opt_in: dataSharingOptIn,
        consented_at: consentedAt,
      })
      .eq('id', userId);
  } catch (e) {
    console.error('Failed to sync consent to Supabase:', e);
  }
}

export async function getUserId(): Promise<string | null> {
  try {
    const session = await getSession();
    if (!session?.phone) return null;

    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('phone', session.phone)
      .single();

    return data?.id || null;
  } catch (e) {
    return null;
  }
}
export async function pushSegmentsToSupabase(
  phone: string,
  segments: { id: string; level: string }[],
  homeLat: number | null,
  homeLon: number | null,
  dataSharingOptIn: boolean
): Promise<void> {
  if (!dataSharingOptIn) return;

  try {
    const anonymousId = await hashPhone(phone);

    // Build segment flags object
    const segmentFlags: Record<string, string> = {};
    for (const seg of segments) {
      segmentFlags[seg.id] = seg.level;
    }

    // Geo lookup
    let zip3: string | null = null;
    let msa: string | null = null;
    if (homeLat && homeLon) {
      const { lookupGeo } = await import('./geoLookup');
      const geo = lookupGeo(homeLat, homeLon);
      if (geo) {
        zip3 = geo.zip3;
        msa = geo.msa;
      }
    }

    // Update existing user row by phone — row already exists from onboarding
    const { error } = await supabase
      .from('users')
      .update({
        anonymous_id: anonymousId,
        segment_flags: segmentFlags,
        home_zip3: zip3,
        home_msa: msa,
        last_segment_sync: new Date().toISOString(),
      })
      .eq('phone', phone);

    if (error) {
      console.error('[SEGMENT PUSH] Full segments error:', JSON.stringify(error));
    } else {
      console.log('[SEGMENT PUSH] Full segments success, MSA:', msa);
    }
  } catch (e) {
    console.error('pushSegmentsToSupabase error:', e);
  }
}

async function hashPhone(phone: string): Promise<string> {
  const digits = phone.replace(/\D/g, '');
  // Use crypto.subtle if available (HTTPS), otherwise use a simple hash
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(digits);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback: simple deterministic hash for non-HTTPS environments
  let hash = 0;
  for (let i = 0; i < digits.length; i++) {
    hash = ((hash << 5) - hash) + digits.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0') + digits.slice(-4);
}

export async function pushBasicImportFlagsToSupabase(
  phone: string,
  recordCount: number,
  dataSharingOptIn: boolean
): Promise<void> {
  if (!dataSharingOptIn) return;

  try {
    const anonymousId = await hashPhone(phone);

    console.log('[SEGMENT PUSH] Updating phone:', phone, 'anonymousId:', anonymousId.slice(0,8) + '...');

    if (!phone) {
      console.error('[SEGMENT PUSH] No phone number available, skipping');
      return;
    }

    // Update existing user row by phone — row already exists from onboarding
    const { error, count } = await supabase
      .from('users')
      .update({
        anonymous_id: anonymousId,
        last_import_record_count: recordCount,
        last_import_at: new Date().toISOString(),
      })
      .eq('phone', phone)
      .select();

    if (error) {
      console.error('[SEGMENT PUSH] Basic flags error:', JSON.stringify(error));
    } else {
      console.log('[SEGMENT PUSH] Basic flags success, rows updated:', count);
    }
  } catch (e) {
    console.error('pushBasicImportFlags error:', e);
  }
}
