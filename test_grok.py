import os
import requests

api_key = os.getenv("XAI_API_KEY")

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {api_key}"
}

payload = {
    "messages": [
        {"role": "system", "content": "You are a concise engineering assistant."},
        {"role": "user", "content": "Confirm Grok API connectivity."}
    ],
    "model": "grok-4.5",
    "stream": False
}

try:
    response = requests.post("https://api.x.ai/v1/chat/completions", headers=headers, json=payload)
    data = response.json()
    if "choices" in data:
        print("\n[SUCCESS] Response from Grok:")
        print(data["choices"][0]["message"]["content"])
    else:
        print("\n[API RESPONSE]:", data)
except Exception as e:
    print(f"[ERROR] API call failed: {e}")
