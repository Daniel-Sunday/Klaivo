import { supabase } from './supabase';

let currentUserId: string | null = null;
export function setAnalyticsUser(userId: string | null) {
  currentUserId = userId;
}

async function track(eventName: string, properties: Record<string, any> = {}): Promise<void> {
  if (!currentUserId) return;
  try {
    await supabase.from('user_events').insert({
      user_id: currentUserId,
      event_name: eventName,
      properties,
    });
  } catch (e) {
    // Never let analytics errors break the app
    console.warn('Analytics error:', e);
  }
}

// All tracked events:
export const analytics = {
  sessionStarted: (mode: string, level: string, hasImage: boolean) =>
    track('session_started', { mode, level, has_image: hasImage }),
  sessionCompleted: (mode: string, level: string, durationMs: number, topic: string) =>
    track('session_completed', { mode, level, duration_ms: durationMs, topic }),
  refinementUsed: (type: string) =>
    track('refinement_used', { type }),
  proFeatureTapped: (feature: string) =>
    track('pro_feature_tapped', { feature }),
  upgradePageViewed: (from: string) =>
    track('upgrade_page_viewed', { from }),
  paymentInitiated: (provider: string, plan: string) =>
    track('payment_initiated', { provider, plan }),
  paymentCompleted: (provider: string, plan: string) =>
    track('payment_completed', { provider, plan }),
  followUpSent: (questionLength: number) =>
    track('follow_up_sent', { question_length: questionLength }),
  historyViewed: () =>
    track('history_viewed'),
  imageUploaded: () =>
    track('image_uploaded'),
  shareResultTapped: () =>
    track('share_result_tapped'),
  installPromptShown: () =>
    track('install_prompt_shown'),
  installPromptAccepted: () =>
    track('install_prompt_accepted'),
  resultCopied: () =>
    track('result_copied'),
  limitReached: (type: string) =>
    track('limit_reached', { type }),
  dailyLimitHit: () =>
    track('daily_limit_hit'),
};
