/**
 * lib/dynamodb.ts
 *
 * DynamoDB client for the Next.js frontend.
 * Uses Vercel OIDC (via Vercel Marketplace integration) so no static
 * AWS keys are ever stored in environment variables.
 *
 * Credential resolution (automatic, mirrors the Python backend):
 *   1. Vercel Marketplace OIDC  → AWS_ROLE_ARN  (production / preview)
 *   2. Static IAM keys          → AWS_ACCESS_KEY_ID (local dev fallback)
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, PutCommand, GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

// ── Credential resolution ─────────────────────────────────────────────────────
function buildClient(): DynamoDBClient {
  const region = process.env.AWS_REGION ?? "us-east-1";
  const roleArn = process.env.AWS_ROLE_ARN;

  if (roleArn) {
    // Tier 1: Vercel Marketplace OIDC — no static keys needed
    const { awsCredentialsProvider } = require("@vercel/functions/oidc");
    return new DynamoDBClient({
      region,
      credentials: awsCredentialsProvider({
        roleArn,
        clientConfig: { region },
      }),
    });
  }

  // Tier 2: Static IAM keys (local dev via .env.local)
  return new DynamoDBClient({ region });
}

const client = buildClient();

export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    // Automatically convert JS undefined → omit from DynamoDB item
    removeUndefinedValues: true,
  },
});

// ── Table config ──────────────────────────────────────────────────────────────
export const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME ?? "weld-inspections";

// ── Typed helpers ─────────────────────────────────────────────────────────────

/** Fetch all inspection records (entity_type = INSPECTION) */
export async function getInspectionRecords() {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "entity_type = :t",
      ExpressionAttributeValues: { ":t": "INSPECTION" },
    })
  );
  return result.Items ?? [];
}

/** Fetch a single inspection record by report ID */
export async function getInspectionRecord(reportId: string) {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `INSPECTION#${reportId}`, SK: "RECORD" },
    })
  );
  return result.Item ?? null;
}

/** Save or overwrite an inspection record */
export async function putInspectionRecord(item: Record<string, unknown>) {
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );
}

/** Fetch all technician feedback entries */
export async function getFeedbackRecords() {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "entity_type = :t",
      ExpressionAttributeValues: { ":t": "FEEDBACK" },
    })
  );
  return result.Items ?? [];
}

/** Fetch audit log entries */
export async function getAuditLogs() {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "entity_type = :t",
      ExpressionAttributeValues: { ":t": "AUDIT" },
    })
  );
  return result.Items ?? [];
}
