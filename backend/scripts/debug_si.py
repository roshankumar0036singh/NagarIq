
import json
import os
import httpx
import asyncio
import subprocess
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(dotenv_path=env_path)

MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "")
print(f"Key found: {MISTRAL_API_KEY[:5]}...")

async def test_insights():
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    print(f"Repo root: {repo_root}")

    def get_git_file_content(commit_hash, file_path):
        try:
            git_path = file_path.replace("\\", "/")
            result = subprocess.run(
                ["git", "show", f"{commit_hash}:{git_path}"],
                capture_output=True, text=True, check=True, cwd=repo_root
            )
            return json.loads(result.stdout)
        except Exception as e:
            print(f"Error fetching git file {file_path} at {commit_hash}: {e}")
            return None

    def get_last_sync_commits():
        try:
            result = subprocess.run(
                ["git", "log", "--author=github-actions[bot]", "--pretty=format:%H", "-n", "2"],
                capture_output=True, text=True, check=True, cwd=repo_root
            )
            return result.stdout.split("\n")
        except Exception as e:
            print(f"Git log error: {e}")
            return []

    commits = get_last_sync_commits()
    print(f"Commits: {commits}")
    
    if not commits or len(commits) < 1:
        print("No commits found from bot")
        return

    last_commit = commits[0]
    prev_commit = commits[1] if len(commits) > 1 else "HEAD~1"

    files_to_compare = {
        "traffic": "frontend/public/data/live_traffic.json",
        "bus": "frontend/public/data/bus_data.json",
        "metro": "frontend/public/data/metro_data.json"
    }

    comparison_results = {}
    for key, path in files_to_compare.items():
        curr_data = get_git_file_content(last_commit, path)
        prev_data = get_git_file_content(prev_commit, path)
        
        if not curr_data or not prev_data:
            comparison_results[key] = "Insufficient data"
            continue
        
        comparison_results[key] = "Success"

    print(f"Comparison: {comparison_results}")

    url = "https://api.mistral.ai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {MISTRAL_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "mistral-large-latest",
        "messages": [
            {"role": "user", "content": "hello"}
        ]
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload, timeout=10.0)
            print(f"Mistral Status: {response.status_code}")
            if response.status_code == 200:
                print("Mistral Success")
            else:
                print(f"Mistral Error: {response.text}")
    except Exception as e:
        print(f"Mistral Exception: {e}")

if __name__ == "__main__":
    asyncio.run(test_insights())
