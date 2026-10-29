"use client"

import { useState } from "react"
import { SalesforcePoc } from "./salesforce-poc"

export default function Page() {
  const [experienceKey, setExperienceKey] = useState<string | null>(null)

  return (
    <main>
      <SalesforcePoc personalizationPoint="HOME_POC" onExperienceKey={setExperienceKey} />

      {experienceKey === "HOME_BUSINESS_OWNER_POC" && <div>Business Owner Home Experience</div>}

      {experienceKey === "HOME_DEFAULT_POC" && <div>Default Home Experience</div>}
    </main>
  )
}
