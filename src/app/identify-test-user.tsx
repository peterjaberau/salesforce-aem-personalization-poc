"use client"

import { Button } from "@chakra-ui/react"

declare global {
  interface Window {
    getSalesforceInteractions?: () => Promise<any>
  }
}

export function IdentifyTestUser() {
  async function identify() {
    const sf = await window.getSalesforceInteractions?.()

    if (!sf) {
      console.error("Salesforce SDK not ready")
      return
    }

    const event = {
      user: {
        attributes: {
          eventType: "partyIdentification",
          userId: "TEST_OWNER_001",

          // These are the values expected by the Web Connector schema
          IDType: "CustomerId",
          IDName: "Web ID",
        },
      },
    }

    console.log("Sending Salesforce event:", event)

    try {
      await sf.sendEvent(event)

      console.log("Salesforce event sent successfully")
    } catch (error) {
      console.error("Salesforce sendEvent failed:", error)
    }
  }

  return <Button onClick={identify}>Identify as Business Owner</Button>
}
