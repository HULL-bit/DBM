import os

import requests
from flask import Flask, request, jsonify

app = Flask(__name__)

# Configuration WasenderApi (voir https://wasenderapi.com/api-docs)
WASENDER_API_KEY = os.getenv("WASENDER_API_KEY")  # API key de ta session Wasender
WASENDER_API_URL = os.getenv("WASENDER_API_URL", "https://api.wasenderapi.com/api/send-message")

# Sécurité entre DBM et la passerelle
GATEWAY_TOKEN = os.getenv("GATEWAY_TOKEN")  # doit matcher PUSH_GATEWAY_TOKEN côté DBM


@app.post("/send")
def send():
  # 1) Vérifier que l'appel vient bien du backend DBM
  if GATEWAY_TOKEN and request.headers.get("Authorization") != f"Bearer {GATEWAY_TOKEN}":
    return jsonify({"error": "Unauthorized"}), 401

  # 2) Récupérer le payload envoyé par DBM
  data = request.get_json(force=True)
  to = data.get("to")
  message = data.get("message") or ""
  if not to or not message:
    return jsonify({"error": "to/message requis"}), 400

  if not WASENDER_API_KEY:
    return jsonify({"error": "WASENDER_API_KEY non configuré"}), 500

  # 3) Construire l'appel vers WasenderApi (texte simple)
  headers = {
    "Authorization": f"Bearer {WASENDER_API_KEY}",
    "Content-Type": "application/json",
  }
  payload = {
    "to": to,
    "text": message[:4000],
  }

  try:
    r = requests.post(WASENDER_API_URL, json=payload, headers=headers, timeout=10)
    # WasenderApi renvoie un JSON avec success / data / msgId, etc.
    return jsonify({"status": r.status_code, "wasender_response": r.json()}), r.status_code
  except Exception as e:
    return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
  app.run(host="0.0.0.0", port=int(os.getenv("PORT", 8000)))

