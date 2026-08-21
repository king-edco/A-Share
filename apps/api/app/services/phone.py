"""Phone number normalization to E.164, accepting common Cameroonian inputs.

Accepted inputs (all resolve to the same canonical form):
- "670000000" (9 digits — prefix +237 added)
- "0670000000" (leading 0 stripped)
- "237670000000" (no + prefix)
- "+237670000000" (already E.164)
"""
import re

CAMEROON_PATTERN = re.compile(r"^\+?237[1678]\d{8}$")


class InvalidPhoneNumber(ValueError):
    """Raised when a phone number can't be normalized to Cameroonian E.164."""


def normalize_phone_number(phone: str) -> str:
    """Return the canonical E.164 phone number, or raise InvalidPhoneNumber."""
    digits = re.sub(r"[^0-9+]", "", phone.strip())
    # Strip a leading national notation ("0" prefix) and a bare country code.
    if digits.startswith("0"):
        digits = digits[1:]
    if digits.startswith("237"):
        digits = "+" + digits
    elif not digits.startswith("+237"):
        digits = "+237" + digits
    if not CAMEROON_PATTERN.match(digits):
        raise InvalidPhoneNumber(
            f"Invalid Cameroonian phone number: {phone!s}. "
            "Expected e.g. 670000000, 0670000000, or +237670000000."
        )
    return digits
