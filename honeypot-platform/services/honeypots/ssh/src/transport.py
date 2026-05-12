import paramiko
from datetime import datetime

class SSHTransport(paramiko.ServerInterface):
    def __init__(self, session_id, ip, port, logger):
        self.session_id = session_id
        self.ip = ip
        self.port = port
        self.logger = logger

    def check_auth_password(self, username, password):
        # Log credentials
        attack_data = {
            "session_id": self.session_id,
            "timestamp": datetime.utcnow().isoformat(),
            "source_ip": self.ip,
            "source_port": self.port,
            "protocol": "SSH",
            "username": username,
            "password": password,
            "payload": f"LOGIN ATTEMPT: {username}:{password}",
            "honeypot": "ssh-honeypot"
        }
        
        # In a honeypot, we often reject or allow to fake shell
        # For this prototype, we log and reject to prevent further complexity
        asyncio = __import__('asyncio')
        loop = asyncio.get_event_loop()
        loop.create_task(self.logger.log_attack(attack_data))
        
        return paramiko.AUTH_FAILED

    def get_allowed_auths(self, username):
        return "password"

    def check_channel_request(self, kind, chanid):
        if kind == "session":
            return paramiko.OPEN_SUCCEEDED
        return paramiko.OPEN_FAILED_ADMINISTRATIVELY_PROHIBITED
