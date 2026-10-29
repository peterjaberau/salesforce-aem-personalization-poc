"use client"

import { Box, Button, DataList, HStack, Text, VStack } from "@chakra-ui/react"

import { useState } from "react"

import { fetchExperienceKey } from "./lib/salesforce"

export type PocIdentityScenario = "anonymous" | "business-owner"

type SalesforcePocProps = {
  personalizationPoint: string
  onExperienceKey: (experienceKey: string | null) => void
}

export function SalesforcePoc({ personalizationPoint, onExperienceKey }: SalesforcePocProps) {
  const [scenario, setScenario] = useState<PocIdentityScenario>("anonymous")

  const [sentEvent, setSentEvent] = useState<string>("No scenario signal sent")

  const [requestedPoint, setRequestedPoint] = useState<string | null>(null)

  const [decisionOutcome, setDecisionOutcome] = useState<string | null>(null)

  function setAnonymous() {
    const url = new URL(window.location.href)

    url.searchParams.delete("utm_source")

    window.history.replaceState({}, "", url.toString())

    setScenario("anonymous")
    setSentEvent("utm_source removed")
    setDecisionOutcome(null)
    onExperienceKey(null)

  }

  function setBusinessOwner() {
    const url = new URL(window.location.href)

    url.searchParams.set("utm_source", "business-owner")

    window.history.replaceState({}, "", url.toString())

    setScenario("business-owner")
    setSentEvent("utm_source=business-owner")
    setDecisionOutcome(null)
    onExperienceKey(null)

  }

  async function fetchExperience() {
    setRequestedPoint(personalizationPoint)

    const key = await fetchExperienceKey(personalizationPoint)

    setDecisionOutcome(key)
    onExperienceKey(key)
  }

  return (
    <>
      <Box position="fixed" top="16px" left="16px" zIndex="1000">
        <HStack>
          <Button variant={scenario === "anonymous" ? "solid" : "ghost"} onClick={setAnonymous}>
            Anonymous
          </Button>
          <Button variant={scenario === "business-owner" ? "solid" : "ghost"} onClick={setBusinessOwner}>
            Business Owner
          </Button>
          <Button variant="ghost" onClick={fetchExperience}>
            Fetch {personalizationPoint}
          </Button>{" "}
        </HStack>
      </Box>

      <Box
        position="fixed"
        top="16px"
        right="16px"
        zIndex="1000"
        width="320px"
        p="4"
        bg="bg.panel"
        borderWidth="1px"
        borderRadius="md"
      >
        <VStack align="stretch" gap="3">
          <Text fontWeight="bold">Salesforce POC</Text>

          <DataList.Root>
            <DataList.Item>
              <DataList.ItemLabel>Scenario</DataList.ItemLabel>
              <DataList.ItemValue>{scenario}</DataList.ItemValue>
            </DataList.Item>

            <DataList.Item>
              <DataList.ItemLabel>Sent Signal</DataList.ItemLabel>
              <DataList.ItemValue>{sentEvent}</DataList.ItemValue>
            </DataList.Item>

            <DataList.Item>
              <DataList.ItemLabel>Personalization Point</DataList.ItemLabel>
              <DataList.ItemValue>{requestedPoint ?? "Not requested"}</DataList.ItemValue>
            </DataList.Item>

            <DataList.Item>
              <DataList.ItemLabel>Decision Outcome</DataList.ItemLabel>
              <DataList.ItemValue>{decisionOutcome ?? "No decision returned"}</DataList.ItemValue>
            </DataList.Item>
          </DataList.Root>
        </VStack>
      </Box>
    </>
  )
}
