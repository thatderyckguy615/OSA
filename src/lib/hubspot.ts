/**
 * HubSpot contact syncing — non-blocking, non-critical.
 * Uses HubSpot v3 REST API directly (no SDK needed for simple contact ops).
 */

const HUBSPOT_API_BASE = "https://api.hubapi.com";

function getAccessToken(): string | null {
  return process.env.HUBSPOT_ACCESS_TOKEN || null;
}

async function hubspotFetch(
  path: string,
  options: { method: string; body?: Record<string, unknown> }
): Promise<Response> {
  const token = getAccessToken();
  return fetch(`${HUBSPOT_API_BASE}${path}`, {
    method: options.method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

function extractContactIdFrom409(responseBody: unknown): string | null {
  try {
    const message = (responseBody as { message?: string })?.message ?? "";
    const match = message.match(/Existing ID:\s*(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export async function syncContactOnTeamCreation(params: {
  email: string;
  firstName: string;
  firmName: string;
}): Promise<void> {
  if (!getAccessToken()) return;

  try {
    const res = await hubspotFetch("/crm/v3/objects/contacts", {
      method: "POST",
      body: {
        properties: {
          email: params.email,
          firstname: params.firstName,
          company: params.firmName,
          osa_created: "TRUE",
        },
      },
    });

    if (res.status === 201) return;

    if (res.status === 409) {
      const body = await res.json();
      const contactId = extractContactIdFrom409(body);
      if (!contactId) {
        console.error("HubSpot 409 but could not extract contact ID:", body);
        return;
      }
      const patchRes = await hubspotFetch(`/crm/v3/objects/contacts/${contactId}`, {
        method: "PATCH",
        body: { properties: { osa_created: "TRUE" } },
      });
      if (!patchRes.ok) {
        console.error("HubSpot PATCH failed:", patchRes.status, await patchRes.text());
      }
      return;
    }

    console.error("HubSpot create contact failed:", res.status, await res.text());
  } catch (err) {
    console.error("HubSpot syncContactOnTeamCreation error:", err);
  }
}

export async function syncReportUrlToContact(params: {
  email: string;
  reportUrl: string;
}): Promise<void> {
  if (!getAccessToken()) return;

  try {
    const res = await hubspotFetch("/crm/v3/objects/contacts", {
      method: "POST",
      body: {
        properties: {
          email: params.email,
          osa_report: params.reportUrl,
        },
      },
    });

    if (res.status === 201) return;

    if (res.status === 409) {
      const body = await res.json();
      const contactId = extractContactIdFrom409(body);
      if (!contactId) {
        console.error("HubSpot 409 but could not extract contact ID:", body);
        return;
      }
      const patchRes = await hubspotFetch(`/crm/v3/objects/contacts/${contactId}`, {
        method: "PATCH",
        body: { properties: { osa_report: params.reportUrl } },
      });
      if (!patchRes.ok) {
        console.error("HubSpot PATCH failed:", patchRes.status, await patchRes.text());
      }
      return;
    }

    console.error("HubSpot create contact failed:", res.status, await res.text());
  } catch (err) {
    console.error("HubSpot syncReportUrlToContact error:", err);
  }
}
