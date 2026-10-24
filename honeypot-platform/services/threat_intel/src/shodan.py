import aiohttp
import os

SHODAN_KEY = os.getenv("SHODAN_API_KEY", "DEMO_KEY")
USE_MOCK = os.getenv("MOCK_EXTERNAL_APIS", "true").lower() == "true"

_MOCK_SHODAN = {
    "45.33.12.9":  {"ports": [22, 80, 443, 3389], "tags": ["scanner", "vpn"]},
    "104.22.5.1":  {"ports": [80, 443, 8080], "tags": ["cdn"]},
    "192.168.1.105": {"ports": [], "tags": []},
}


class ShodanClient:
    def __init__(self, api_key: str = "DEMO_KEY"):
        self.api_key = api_key or SHODAN_KEY

    async def get_tags(self, ip: str) -> list:
        data = await query_shodan(ip, self.api_key)
        return data.get("tags", [])


async def query_shodan(ip: str, api_key: str = SHODAN_KEY) -> dict:
    """Query Shodan host info for open ports and tags."""
    if USE_MOCK or api_key in ("DEMO_KEY", "mock_key", "your_shodan_key"):
        return _MOCK_SHODAN.get(ip, {"ports": [], "tags": []})

    url = f"https://api.shodan.io/shodan/host/{ip}?key={api_key}"
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as resp:
            if resp.status == 200:
                data = await resp.json()
                return {
                    "ports": data.get("ports", []),
                    "tags": data.get("tags", []),
                    "org": data.get("org"),
                    "isp": data.get("isp"),
                }
    return {"ports": [], "tags": []}
