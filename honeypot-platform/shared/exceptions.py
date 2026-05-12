class HoneypotError(Exception):
    """Base exception for the honeypot platform."""
    pass

class AttackProcessingError(HoneypotError):
    """Raised when there is an error processing an attack."""
    pass

class IntelLookupError(HoneypotError):
    """Raised when there is an error looking up threat intelligence."""
    pass

class DatabaseError(HoneypotError):
    """Raised when there is a database operation failure."""
    pass

class KafkaError(HoneypotError):
    """Raised when there is a Kafka communication failure."""
    pass
