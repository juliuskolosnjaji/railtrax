import {
  lemonSqueezySetup,
  createCheckout,
  getSubscription,
} from '@lemonsqueezy/lemonsqueezy.js'

lemonSqueezySetup({ apiKey: process.env.LEMONSQUEEZY_API_KEY! })

export async function createCheckoutUrl(
  userId: string,
  userEmail: string,
  variantId: number,
): Promise<string> {
  const { data, error } = await createCheckout(
    Number(process.env.LEMONSQUEEZY_STORE_ID),
    variantId,
    {
      checkoutOptions: {
        embed: false,
        media: false,
      },
      checkoutData: {
        email: userEmail,
        custom: {
          user_id: userId,
        },
      },
      productOptions: {
        redirectUrl: `${process.env.NEXT_PUBLIC_URL}/settings/billing?success=true`,
        receiptButtonText: 'Go to Railtrax',
      },
    },
  )

  if (error) throw new Error(error.message)
  return data!.data.attributes.url
}

export async function getCustomerPortalUrl(lsSubscriptionId: string): Promise<string> {
  const { data, error } = await getSubscription(lsSubscriptionId)
  if (error) throw new Error(error.message)
  return data!.data.attributes.urls.customer_portal
}
