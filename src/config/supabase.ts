import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pvuoxtuofpkupbbmtzse.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2dW94dHVvZnBrdXBiYm10enNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODMzNTAsImV4cCI6MjA4OTg1OTM1MH0.4AdHw3v9IssQKgamINy36NjMsXgynTwc6_dWFq-Bxbg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);