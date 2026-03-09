import json
from urllib import request as urllib_request, error as urllib_error

from django.conf import settings
from django.utils.encoding import force_str


def _normalize_phone_to_e164(phone: str) -> str | None:
  """
  Normalise un numéro local type 77xxxxxxx vers le format E.164 (+22177xxxxxxx).
  Hypothèse : pays par défaut = Sénégal (+221).
  """
  if not phone:
    return None
  p = ''.join(ch for ch in str(phone) if ch.isdigit() or ch == '+').strip()
  if not p:
    return None
  if p.startswith('+'):
    return p
  # Numéro local sans indicatif, on préfixe par +221
  if len(p) in (8, 9):
    return f"+221{p[-9:]}"
  return None


def _post_to_gateway(payload: dict) -> bool:
  """
  Envoie le payload JSON vers une passerelle HTTP externe.

  La configuration se fait via :
  - PUSH_GATEWAY_URL
  - PUSH_GATEWAY_TOKEN (optionnel)

  Le format exact du payload sera adapté côté passerelle (WhatsApp / SMS).
  """
  url = getattr(settings, "PUSH_GATEWAY_URL", "")
  if not url:
    return False
  headers = {"Content-Type": "application/json"}
  token = getattr(settings, "PUSH_GATEWAY_TOKEN", "")
  if token:
    headers["Authorization"] = f"Bearer {token}"
  try:
    data = json.dumps(payload).encode("utf-8")
    req = urllib_request.Request(url, data=data, headers=headers, method="POST")
    with urllib_request.urlopen(req, timeout=10) as resp:
      return resp.status in (200, 201, 202)
  except (urllib_error.URLError, urllib_error.HTTPError, TimeoutError, Exception):
    return False


def send_push_to_user(user, message: str, contexte: str = "notification") -> bool:
  """
  Envoie un message externe (WhatsApp / SMS via passerelle HTTP) à un utilisateur donné.

  - `user.telephone` doit être renseigné
  - `contexte` permet à la passerelle de distinguer notification / evenement / message
  """
  if not getattr(settings, "PUSH_ENABLED", False):
    return False
  phone = getattr(user, "telephone", "") or ""
  phone_e164 = _normalize_phone_to_e164(phone)
  if not phone_e164:
    return False

  payload = {
    "to": phone_e164,
    "message": force_str(message)[:4000],
    "context": contexte,
    "user_id": getattr(user, "id", None),
    "user_name": (user.get_full_name() or user.username or "").strip(),
  }
  return _post_to_gateway(payload)

