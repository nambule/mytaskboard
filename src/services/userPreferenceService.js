import { supabase } from './supabase'

export const userPreferenceService = {
  async getPreferences(userId) {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('preferences')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error
    return data?.preferences || null
  },

  async savePreferences(userId, preferences) {
    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        preferences,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (error) throw error
  },
}
