from .models import AuditLog

def log_activity(user=None, action="", entity_type="", entity_id="", details="", ip_address=None):
    """
    Helper function to record system audit logs.
    """
    try:
        user_email = user.email if user and user.is_authenticated else "System / Anonymous"
        role = user.role if user and user.is_authenticated and hasattr(user, 'role') else "UNKNOWN"

        AuditLog.objects.create(
            user=user if user and user.is_authenticated else None,
            user_email=user_email,
            role=role,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id else "",
            details=str(details) if details else "",
            ip_address=ip_address
        )
    except Exception as e:
        print(f"Warning: Failed to create AuditLog: {e}")
