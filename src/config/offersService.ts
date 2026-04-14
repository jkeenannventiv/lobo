// offersService.ts
// Fetches contextual offers from Supabase matching user's segment flags and MSA

import { supabase } from './supabase';

export type Offer = {
  id: string;
  brand: string;
  offer_text: string;
  description: string | null;
  segment_target: string;
  level_target: string;
  msa_target: string | null;
  cta_text: string;
  cta_url: string | null;
  emoji: string;
  expires_at: string | null;
  created_at?: string | null;
};

export async function fetchMatchingOffers(
  segmentFlags: Record<string, string>,
  userMsa: string | null
): Promise<Offer[]> {
  try {
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('active', true)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

    if (error || !data) return [];

    // Filter client-side to match user's segments and MSA
    return data.filter((offer: Offer) => {
      // Check segment match
      const userLevel = segmentFlags[offer.segment_target];
      if (!userLevel) return false;
      if (userLevel !== offer.level_target) return false;

      // Check MSA match — null means national (show to everyone)
      if (offer.msa_target && offer.msa_target !== userMsa) return false;

      return true;
    });
  } catch (e) {
    console.error('fetchMatchingOffers error:', e);
    return [];
  }
}

// Track impression — called when offers are displayed
export async function trackOfferImpressions(
  offerIds: string[],
  anonymousId: string | null
): Promise<void> {
  if (!offerIds.length) return;
  try {
    const impressions = offerIds.map(offer_id => ({
      offer_id,
      anonymous_id: anonymousId,
    }));
    await supabase.from('offer_impressions').insert(impressions);
  } catch (e) {
    console.error('trackOfferImpressions error:', e);
  }
}
