declare global {
  interface Window {
    getSalesforceInteractions?: () => Promise<any>
  }
}

let salesforceInstance: any = null

export async function getSalesforce() {
  if (salesforceInstance) {
    return salesforceInstance
  }

  const sf = await window.getSalesforceInteractions?.()

  if (!sf) {
    throw new Error("Salesforce SDK not ready")
  }

  salesforceInstance = sf

  return salesforceInstance
}

export async function fetchExperienceKey(personalizationPoint: string): Promise<string | null> {
  const sf = await getSalesforce()

  const response = await sf.Personalization.fetch([personalizationPoint])

  console.log("Salesforce personalization response:", JSON.stringify(response, null, 2))

  const result = response?.personalizations?.find((item: any) => item.personalizationPointName === personalizationPoint)

  console.log("Matched personalization result:", result)

  console.log("Returned data:", result?.data)

  // return result?.data?.[0]?.experienceKey ?? null

  const experienceKey = result?.attributes?.experienceKey ?? null

  console.log("Decision outcome:", experienceKey)

  return experienceKey

}
