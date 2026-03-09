import os

import requests
from flask import Flask, request, jsonify

app = Flask(__name__)

WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN")
WHATSAPP_PHONE_ID = os.getenv("WHATSAPP_PHONE_ID")  # phone_number_id
WHATSAPP_API = "https://graph.facebook.com/v21.0"

GATEWAY_TOKEN = os.getenv("GATEWAY_TOKEN")  # doit matcher PUSH_GATEWAY_TOKEN côté DBM


@app.post("/send")
def send():
  # Sécuriser l'appel entre DBM et la passerelle
  if GATEWAY_TOKEN and request.headers.get("Authorization") != f"Bearer {GATEWAY_TOKEN}":
    return jsonify({"error": "Unauthorized"}), 401

  data = request.get_json(force=True)
  to = data.get("to")
  message = data.get("message") or ""
  if not to or not message:
    return jsonify({"error": "to/message requis"}), 400

  url = f"{WHATSAPP_API}/{WHATSAPP_PHONE_ID}/messages"
  headers = {
    "Authorization": f"Bearer {WHATSAPP_TOKEN}",
    "Content-Type": "application/json",
  }
  payload = {
    "messaging_product": "whatsapp",
    "to": to,
    "type": "text",
    "text": {"body": message[:4000]},
  }
  try:
    r = requests.post(url, json=payload, headers=headers, timeout=10)
    return jsonify({"status": r.status_code, "whatsapp_response": r.json()}), r.status_code
  except Exception as e:
    return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
  app.run(host="0.0.0.0", port=int(os.getenv("PORT", 8000)))

