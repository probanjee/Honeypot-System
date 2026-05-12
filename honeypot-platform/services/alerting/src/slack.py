import aiohttp
import json
import os

SLACK_WEBHOOK = os.getenv("SLACK_WEBHOOK_URL", "")


async def send_slack_alert(attack: dict):
    """Send a color-coded Slack Block Kit alert."""
    severity = attack.get("severity", 0)
    if severity >= 80:
        color = "#ff003c"
        label = "🔴 CRITICAL"
    elif severity >= 50:
        color = "#ffaa00"
        label = "🟠 HIGH"
    else:
        color = "#00ff88"
        label = "🟢 MEDIUM"

    payload = {
        "attachments": [
            {
                "color": color,
                "blocks": [
                    {
                        "type": "header",
                        "text": {"type": "plain_text", "text": f"{label} — Honeypot Alert"},
                    },
                    {
                        "type": "section",
                        "fields": [
                            {"type": "mrkdwn", "text": f"*Source IP:*\n`{attack.get('source_ip', 'N/A')}`"},
                            {"type": "mrkdwn", "text": f"*Attack Type:*\n{attack.get('attack_type', 'Unknown')}"},
                            {"type": "mrkdwn", "text": f"*Severity:*\n{severity}/100"},
                            {"type": "mrkdwn", "text": f"*Protocol:*\n{attack.get('protocol', 'N/A')}"},
                        ],
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": f"*Payload preview:*\n```{attack.get('payload', '')[:300]}```",
                        },
                    },
                ],
            }
        ]
    }

    if not SLACK_WEBHOOK:
        print(f"[Alerting] SLACK MOCK ALERT: {json.dumps(payload, indent=2)}")
        return

    async with aiohttp.ClientSession() as session:
        async with session.post(SLACK_WEBHOOK, json=payload) as resp:
            if resp.status != 200:
                print(f"[Alerting] Slack webhook failed: {resp.status}")
