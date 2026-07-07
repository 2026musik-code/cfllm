import { ScriptConfig } from './types';

export function generatePythonScript(config: ScriptConfig, appUrl: string): string {
  const DEFAULT_ALLOWED_COMMANDS = '"ls", "pwd", "whoami", "df", "free", "echo", "cat", "grep"';
  const DEFAULT_SYSTEM_PROMPT = `You are an AI assistant living inside a user's terminal (Termux or VPS). 
Your goal is to help the user manage their system.
When the user asks you to perform an action, you should respond with a shell command.
ALWAYS enclose the exact command you want to run inside <CMD> and </CMD> tags.
For example: <CMD>ls -la</CMD>
Explain what you are doing briefly before or after the command.`;

  return `import os
import subprocess
import sys
import json
import urllib.request
import urllib.error

# ==========================================
# Termux/VPS AI Shell Assistant Configuration
# ==========================================
PROXY_URL = "${appUrl}/api/chat"
ACCOUNT_ID = "${config.accountId}"
API_TOKEN = "${config.apiToken}"
USERNAME = "${config.username || 'User'}"
MODEL_ID = "${config.modelId || '@cf/meta/llama-3-8b-instruct'}"
AUTO_EXECUTE = False
ALLOWED_COMMANDS = [${DEFAULT_ALLOWED_COMMANDS}]

SYSTEM_PROMPT = f"""You are assisting user: {USERNAME}.
${DEFAULT_SYSTEM_PROMPT.replace(/"/g, '\\"')}"""

def run_command(command):
    """Executes a shell command after validating against the allowed list."""
    base_cmd = command.split()[0] if command else ""
    
    if '*' not in ALLOWED_COMMANDS and base_cmd not in ALLOWED_COMMANDS:
         return f"Error: Command '{base_cmd}' is not in the allowed list. Allowed: {ALLOWED_COMMANDS}"
         
    try:
         result = subprocess.run(command, shell=True, capture_output=True, text=True)
         output = result.stdout + result.stderr
         return output if output else "[Command executed successfully with no output]"
    except Exception as e:
         return f"Execution Error: {str(e)}"

def send_chat_message(messages):
    data = json.dumps({
        "accountId": ACCOUNT_ID,
        "token": API_TOKEN,
        "modelId": MODEL_ID,
        "systemPrompt": SYSTEM_PROMPT,
        "messages": messages
    }).encode('utf-8')
    
    req = urllib.request.Request(PROXY_URL, data=data, headers={'Content-Type': 'application/json'})
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            return result.get("response", "")
    except urllib.error.URLError as e:
        print(f"\\033[91mAPI Connection Error: {e}\\033[0m")
        if hasattr(e, 'read'):
            print(e.read().decode('utf-8'))
        return "Error connecting to AI proxy."

def main():
    print("\\033[92m🤖 Termux/VPS AI Shell Assistant Initialized.\\033[0m")
    print(f"\\033[93m⚠️  Auto-execute is {'ON' if AUTO_EXECUTE else 'OFF'}.\\033[0m")
    print(f"\\033[94m🔗 Proxy URL: {PROXY_URL}\\033[0m")
    print("Type 'exit' or 'quit' to close the session.\\n")

    chat_history = []
    
    while True:
        try:
            user_input = input("\\033[92mYou> \\033[0m")
            
            if user_input.lower() in ['exit', 'quit']:
                print("\\nExiting session...")
                break
            if not user_input.strip():
                continue

            chat_history.append({"role": "user", "content": user_input})
            
            # Send message to API Proxy
            text = send_chat_message(chat_history)
            
            if not text or text.startswith("Error connecting"):
                 chat_history.pop() # remove failed message
                 continue
                 
            chat_history.append({"role": "assistant", "content": text})
            print(f"\\033[96mAI>\\033[0m {text}")

            # Check for a command requested by the AI
            if "<CMD>" in text and "</CMD>" in text:
                cmd = text.split("<CMD>")[1].split("</CMD>")[0].strip()
                
                if AUTO_EXECUTE:
                    print(f"\\n\\033[93m[System] Executing: {cmd}\\033[0m")
                    output = run_command(cmd)
                    print(f"\\033[90m{output}\\033[0m")
                    
                    chat_history.append({"role": "user", "content": f"System command execution output:\\n{output}\\n(Acknowledge this or continue assisting the user based on the output)"})
                    
                    # Get AI response for the output
                    followup_text = send_chat_message(chat_history)
                    if followup_text and not followup_text.startswith("Error connecting"):
                        chat_history.append({"role": "assistant", "content": followup_text})
                        print(f"\\033[96mAI>\\033[0m {followup_text}")
                else:
                    print(f"\\n\\033[93m[System] Suggested command: {cmd} (Auto-execute is DISABLED)\\033[0m")
                    print("\\033[90mYou can run this manually.\\033[0m")

        except KeyboardInterrupt:
            print("\\n\\nExiting session...")
            break
        except Exception as e:
            print(f"\\033[91mAn error occurred: {e}\\033[0m")

if __name__ == '__main__':
    main()
`;
}
