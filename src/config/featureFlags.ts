// ─────────────────────────────────────────────────────────────────────────────
// Lobo Feature Flags
// ─────────────────────────────────────────────────────────────────────────────
// Toggle features on/off without deleting any code.
// When you're ready to re-enable a feature, flip its flag to true and rebuild.
// ─────────────────────────────────────────────────────────────────────────────

export const FEATURES = {
  // Phone/OTP authentication on onboarding.
  // When false: new users skip Phone → Otp → Email and go straight to ExportGuide.
  // When true: full auth flow is restored.
  // Requires: Supabase, Firebase phone auth, userService
  AUTH_ENABLED: false,

  // Anonymous data sharing / Supabase import logging.
  // When false: import counts and segment flags are not sent to Supabase.
  // When true: logImportToSupabase and pushBasicImportFlagsToSupabase fire normally.
  // Note: keep false until AUTH_ENABLED is true — no userId without auth.
  SUPABASE_LOGGING_ENABLED: false,

  // Data sharing consent toggle in Settings.
  // When false: the toggle is hidden since there's nothing to share data with.
  // When true: toggle is visible and syncs to Supabase.
  DATA_SHARING_TOGGLE_ENABLED: false,
};
