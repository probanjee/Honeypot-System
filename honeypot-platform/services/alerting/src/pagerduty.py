import aiohttp
import json
import os
import time

PAGERDUTY_ROUTING_KEY = os.getenv("PAGERDUTY_ROUTING_KEY", "")


async def trigger_incident(attack: dict):
    """Trigger a PagerDuty incident for critical attacks."""
    payload = {
        "routing_key": PAGERDUTY_ROUTING_KEY,
        "event_action": "trigger",
        "payload": {
            "summary": f"CRITICAL Attack: {attack.get('attack_type', 'Unknown')} from {attack.get('source_ip', 'N/A')}",
            "severity": "critical",
            "source": "honeypot-platform",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "custom_details": {
                "source_ip": attack.get("source_ip"),
                "protocol": attack.get("protocol"),
                "severity_score": attack.get("severity"),
                "payload_preview": attack.get("payload", "")[:500],
            },
        },
    }

    if not PAGERDUTY_ROUTING_KEY:
        print(f"[Alerting] PAGERDUTY MOCK: {json.dumps(payload, indent=2)}")
        return

    url = "https://events.pagerduty.com/v2/enqueue"
    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=payload) as resp:
            if resp.status not in (200, 202):
                print(f"[Alerting] PagerDuty failed: {resp.status}")
            else:
                body = await resp.json()
                print(f"[Alerting] PagerDuty incident: {body.get('dedup_key')}")
