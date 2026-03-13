import time
import subprocess
import os
from datetime import datetime

# Path to the heartbeat file
HEARTBEAT_FILE = "heartbeat.txt"
INTERVAL = 120  # 2 minutes

def run_command(command):
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"Executed: {command}")
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"Error executing {command}: {e.stderr}")
        return None

def main():
    print(f"Starting Keep-Alive script (Interval: {INTERVAL}s)...")
    
    while True:
        try:
            # Update heartbeat file
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            with open(HEARTBEAT_FILE, "w") as f:
                f.write(f"Heartbeat at {timestamp}")
            
            # Git operations
            run_command(f"git add {HEARTBEAT_FILE}")
            
            # Check if there are changes (just in case, though heartbeat always changes)
            status = run_command("git status --porcelain")
            if status:
                run_command(f'git commit -m "Heartbeat: {timestamp}"')
                # Pull changes from remote to avoid "fetch first" errors
                run_command("git pull --rebase origin main")
                run_command("git push origin main")
                print(f"Pushed heartbeat at {timestamp}")
            else:
                print("No changes to push.")
                
        except Exception as e:
            print(f"An error occurred: {e}")
            
        time.sleep(INTERVAL)

if __name__ == "__main__":
    main()
