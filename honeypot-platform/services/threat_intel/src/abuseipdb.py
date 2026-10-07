import aiohttp
import os

ABUSEIPDB_KEY = os.getenv("ABUSEIPDB_API_KEY", "DEMO_KEY")
BASE_URL = "https://api.abuseipdb.com/api/v2/check"
USE_MOCK = os.getenv("MOCK_EXTERNAL_APIS", "true").lower() == "true"

# Mock responses for prototype demo
_MOCK_DB = {
    "45.33.12.9":     {"abuseConfidenceScore": 97, "totalReports": 842},
    "104.22.5.1":     {"abuseConfidenceScore": 72, "totalReports": 134},
    "192.168.1.105":  {"abuseConfidenceScore": 0,  "totalReports": 0},
}


async def query_abuseipdb(ip: str) -> dict:
    """Query AbuseIPDB v2 API for an IP's abuse confidence score."""
    if USE_MOCK or ABUSEIPDB_KEY == "DEMO_KEY":
        mock = _MOCK_DB.get(ip, {"abuseConfidenceScore": 0, "totalReports": 0})
        return {"ip": ip, **mock}

    headers = {"Key": ABUSEIPDB_KEY, "Accept": "application/json"}
    params = {"ipAddress": ip, "maxAgeInDays": "90"}

    async with aiohttp.ClientSession() as session:
        async with session.get(BASE_URL, headers=headers, params=params) as resp:
            if resp.status == 200:
                body = await resp.json()
                data = body.get("data", {})
                return {
                    "ip": ip,
                    "abuseConfidenceScore": data.get("abuseConfidenceScore", 0),
                    "totalReports": data.get("totalReports", 0),
                    "countryCode": data.get("countryCode"),
                    "isp": data.get("isp"),
                }
    return {"ip": ip, "abuseConfidenceScore": 0, "totalReports": 0}
