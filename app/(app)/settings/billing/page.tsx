import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPlan, getLimit } from '@/lib/entitlements'
import { getCustomerPortalUrl } from '@/lib/lemonsqueezy'
import { BillingClient } from './BillingClient'
import { DevPlanSwitcher } from '@/components/dev/DevPlanSwitcher'

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>
}) {
  const { success } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const plan = getPlan(user.app_metadata as { plan?: string })

  // Fetch subscription row and usage counters in parallel
  const [{ data: subscription }, { data: usage }, { data: userData }] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('usage_counters')
      .select('trips_count, storage_bytes')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('users')
      .select('calendar_token')
      .eq('id', user.id)
      .single(),
  ])

  // Get customer portal URL for paying users
  let portalUrl: string | null = null
  if (subscription?.ls_subscription_id) {
    try {
      portalUrl = await getCustomerPortalUrl(subscription.ls_subscription_id)
    } catch {
      // Portal URL not critical — continue without it
    }
  }

  const tripsCount = usage?.trips_count ?? 0
  const maxTrips = getLimit(plan, 'maxTrips')
  const storageMbUsed = Math.round((usage?.storage_bytes ?? 0) / (1024 * 1024))
  const maxStorageMb = getLimit(plan, 'maxPhotosMb')
  const calendarUrl = userData?.calendar_token 
    ? `${process.env.NEXT_PUBLIC_URL}/api/calendar/${userData.calendar_token}.ics`
    : null

  return (
    <>
      {process.env.NODE_ENV === 'development' && (
        <div className="p-6 pb-0">
          <DevPlanSwitcher currentPlan={plan} />
        </div>
      )}
      <BillingClient
        plan={plan}
        subscription={subscription ?? null}
        portalUrl={portalUrl}
        tripsCount={tripsCount}
        maxTrips={maxTrips}
        storageMbUsed={storageMbUsed}
        maxStorageMb={maxStorageMb}
        calendarUrl={calendarUrl}
        showSuccess={success === 'true'}
      />
    </>
  )
}
