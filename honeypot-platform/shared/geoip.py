import socket
import struct
import random

class GeoIPLookup:
    """
    Mock GeoIP lookup class. 
    In a real scenario, this would use a MaxMind Reader to query a .mmdb file.
    """
    def __init__(self, db_path: str = None):
        self.db_path = db_path
        self.countries = ["US", "CN", "RU", "DE", "FR", "GB", "BR", "IN", "JP", "KR"]
        self.cities = {
            "US": ["New York", "San Francisco", "Chicago"],
            "CN": ["Beijing", "Shanghai", "Shenzhen"],
            "RU": ["Moscow", "Saint Petersburg", "Novosibirsk"],
            "DE": ["Berlin", "Munich", "Hamburg"],
        }

    def lookup(self, ip: str):
        # Mock lookup based on IP hashes or just random for prototype
        random.seed(ip)
        country = random.choice(self.countries)
        city = random.choice(self.cities.get(country, ["Unknown City"]))
        
        return {
            "country_code": country,
            "city": city,
            "latitude": random.uniform(-90, 90),
            "longitude": random.uniform(-180, 180)
        }

    def close(self):
        pass
