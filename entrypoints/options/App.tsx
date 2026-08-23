/**
 * @fileoverview Renders the Phase 0 Canvas session diagnostic interface.
 */

import {
  Alert,
  Anchor,
  Badge,
  Button,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useState } from "react";
import { browser } from "wxt/browser";

import {
  RUN_DIAGNOSTIC_MESSAGE,
  type DiagnosticRequest,
  type DiagnosticResult,
} from "../../src/diagnostic/contracts";

const CANVAS_HOME = "https://sjsu.instructure.com/";

/** Returns the user-facing explanation for a diagnostic result. */
function describeResult(result: DiagnosticResult): string {
  switch (result.status) {
    case "success":
      return "Canvas returned valid JSON through this Brave profile.";
    case "auth_required":
      return "Canvas did not return an authenticated API response. Sign in to Canvas in this Brave profile and try again.";
    case "rate_limited":
      return "Canvas temporarily rate-limited the diagnostic. Wait briefly and try again.";
    case "network_error":
      return "The extension could not reach Canvas. Check the network connection and try again.";
    case "invalid_response":
      return "Canvas responded, but the response was not the expected API shape.";
  }
}

/** Renders the extension's signed-in Canvas feasibility check. */
export function App(): React.JSX.Element {
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  /** Requests a diagnostic from the background service worker. */
  async function runDiagnostic(): Promise<void> {
    setIsRunning(true);

    try {
      const request: DiagnosticRequest = { type: RUN_DIAGNOSTIC_MESSAGE };
      const nextResult = await browser.runtime.sendMessage<
        DiagnosticRequest,
        DiagnosticResult
      >(request);
      setResult(nextResult);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <Container component="main" size="md" py="xl">
      <Stack gap="lg">
        <div>
          <Text c="dimmed" fw={600} size="sm" tt="uppercase">
            Phase 0 feasibility gate
          </Text>
          <Title order={1}>Better Canvas View</Title>
          <Text c="dimmed" mt="xs">
            Confirm that this extension can read Canvas JSON using your existing
            signed-in Brave session. No credentials or Canvas payloads are
            stored or displayed.
          </Text>
        </div>

        <Paper component="section" p="lg" withBorder>
          <Stack gap="md">
            <Group justify="space-between">
              <Title order={2} size="h3">
                Canvas connection
              </Title>
              <Badge color={result?.status === "success" ? "green" : "gray"}>
                {result?.status ?? "not checked"}
              </Badge>
            </Group>

            <Text>
              The check sends one read-only GET request for at most one active
              course and reports only the outcome and timing.
            </Text>

            <Group>
              <Button
                type="button"
                loading={isRunning}
                onClick={() => void runDiagnostic()}
              >
                Test Canvas connection
              </Button>
              <Anchor href={CANVAS_HOME} rel="noreferrer" target="_blank">
                Open Canvas to sign in
              </Anchor>
            </Group>

            {result !== null && (
              <Alert
                color={result.status === "success" ? "green" : "yellow"}
                title={
                  result.status === "success" ? "Connected" : "Not connected"
                }
              >
                <Stack gap={4}>
                  <Text>{describeResult(result)}</Text>
                  <Text c="dimmed" size="sm">
                    Checked {new Date(result.checked_at).toLocaleString()} in{" "}
                    {result.elapsed_ms} ms.
                  </Text>
                </Stack>
              </Alert>
            )}
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
