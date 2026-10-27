"""
role_code values match the `roles` catalog seed
Platform admin is identified by users.is_platform_admin OR role_code == "admin".
"""

from __future__ import annotations

# Role sets

ROLE_VIEWER = "viewer"
ROLE_AUDITOR = "auditor"
ROLE_OWNER = "owner"
ROLE_ADMIN = "admin"

READ_ROLES = frozenset({ROLE_OWNER, ROLE_AUDITOR, ROLE_VIEWER, ROLE_ADMIN})
WRITE_ROLES = frozenset({ROLE_OWNER, ROLE_AUDITOR, ROLE_ADMIN})  # mutate audit ops
OWNER_ROLES = frozenset({ROLE_OWNER, ROLE_ADMIN})  # members, invites, org settings
KEYS_ROLES = frozenset({ROLE_OWNER, ROLE_ADMIN})  # API keys (high privilege)
PLATFORM_ROLES = frozenset({ROLE_ADMIN})  # cross-tenant admin UI


ROLE_MATRIX: dict[str, frozenset[str]] = {
    # Auth / profile
    "auth.me": READ_ROLES,
    # Targets
    "targets.list": READ_ROLES,
    "targets.get": READ_ROLES,
    "targets.create": WRITE_ROLES,
    "targets.update": WRITE_ROLES,
    "targets.delete": WRITE_ROLES,
    "targets.test": WRITE_ROLES,
    # Campaigns
    "campaigns.list": READ_ROLES,
    "campaigns.get": READ_ROLES,
    "campaigns.create": WRITE_ROLES,
    "campaigns.run": WRITE_ROLES,
    "campaigns.cancel": WRITE_ROLES,
    "campaigns.rerun": WRITE_ROLES,
    # Findings
    "findings.list": READ_ROLES,
    "findings.get": READ_ROLES,
    "findings.update": WRITE_ROLES,
    "findings.comment": WRITE_ROLES,
    # Attack documents
    "docs.list": READ_ROLES,
    "docs.create": WRITE_ROLES,
    "docs.upload": WRITE_ROLES,
    "docs.delete": WRITE_ROLES,
    # Reports
    "reports.list": READ_ROLES,
    "reports.get": READ_ROLES,
    "reports.download": READ_ROLES,
    "reports.generate": WRITE_ROLES,
    # API keys
    "api_keys.list": KEYS_ROLES,
    "api_keys.create": KEYS_ROLES,
    "api_keys.revoke": KEYS_ROLES,
    # Members & invitations (D.*)
    "members.list": OWNER_ROLES,
    "members.update_role": OWNER_ROLES,
    "members.deactivate": OWNER_ROLES,
    "invites.create": OWNER_ROLES,
    "invites.list": OWNER_ROLES,
    "invites.revoke": OWNER_ROLES,
    # Platform
    "platform.orgs.list": PLATFORM_ROLES,
    "platform.user.suspend": PLATFORM_ROLES,
}


def roles_for(action: str) -> frozenset[str]:
    if action not in ROLE_MATRIX:
        raise KeyError(f"Unknown permission action: {action}")
    return ROLE_MATRIX[action]