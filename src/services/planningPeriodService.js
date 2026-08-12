import { supabase } from './supabase'

const transformPeriod = (period) => ({
  id: period.id,
  title: period.title,
  startDate: period.start_date,
  endDate: period.end_date,
  createdAt: period.created_at,
  updatedAt: period.updated_at,
})

const getUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  return user
}

export const planningPeriodService = {
  async getAll() {
    const user = await getUser()
    const { data, error } = await supabase
      .from('planning_periods')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: true })

    if (error) throw error
    return (data || []).map(transformPeriod)
  },

  async create(period) {
    const user = await getUser()
    const { data, error } = await supabase
      .from('planning_periods')
      .insert([{
        title: period.title,
        start_date: period.startDate,
        end_date: period.endDate,
        user_id: user.id,
      }])
      .select('*')
      .single()

    if (error) throw error
    return transformPeriod(data)
  },

  async update(periodId, updates) {
    const user = await getUser()
    const updateData = { updated_at: new Date().toISOString() }
    if ('title' in updates) updateData.title = updates.title
    if ('startDate' in updates) updateData.start_date = updates.startDate
    if ('endDate' in updates) updateData.end_date = updates.endDate

    const { data, error } = await supabase
      .from('planning_periods')
      .update(updateData)
      .eq('id', periodId)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (error) throw error
    return transformPeriod(data)
  },

  async remove(periodId) {
    const user = await getUser()
    const { error } = await supabase
      .from('planning_periods')
      .delete()
      .eq('id', periodId)
      .eq('user_id', user.id)

    if (error) throw error
  },
}
