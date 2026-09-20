import httpx

def test_awp():
    url = "http://localhost:8000/awp"
    payload = {
        "messages": [
            {"role": "user", "content": "whats the weather in ahmedabad today"}
        ]
    }
    print(f"Connecting to {url}...")
    with httpx.stream("POST", url, json=payload, timeout=120.0) as r:
        for line in r.iter_lines():
            if line:
                print(line)

if __name__ == "__main__":
    test_awp()
