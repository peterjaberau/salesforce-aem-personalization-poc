"use client"

import Script from "next/script"
import { getSalesforce } from "./lib/salesforce"

const SDK_URL =
  "https://cdn.c360a.salesforce.com/beacon/c360a/d6abf9f0-ecea-4884-ab38-0b4ee6bca246/scripts/c360a.min.js"

export function SalesforcePersonalization() {
  async function initializeSalesforce() {
    const sf = await getSalesforce()

    await sf.init({
      consents: [
        {
          purpose: "Tracking",
          provider: "POC",
          status: "Opt In",
        },
      ],
    })
  }

  return <Script src={SDK_URL} strategy="afterInteractive" onLoad={initializeSalesforce} />
}