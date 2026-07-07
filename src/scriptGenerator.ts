import { ScriptConfig } from './types';

export function generatePythonScript(config: ScriptConfig, appUrl: string): string {
  return `import urllib.request
import urllib.error
import json
import os
import sys
import subprocess
import re
import threading
import time
import select
import fcntl

# ==========================================
# KONFIGURASI TAMPILAN CLI (WARNA)
# ==========================================
C_USER = '\\033[94m'   # Biru (User)
C_AI   = '\\033[92m'   # Hijau (AI)
C_SYS  = '\\033[93m'   # Kuning (Sistem/Menu)
C_ERR  = '\\033[91m'   # Merah (Error)
C_RST  = '\\033[0m'    # Reset Warna
C_LOG  = '\\033[90m'   # Abu-abu (Log/Reasoning)
C_CMD  = '\\033[96m'   # Cyan (Command execution)
C_AITXT= '\\033[36m'   # Cyan gelap (Teks AI)

ACCOUNT_ID = "${config.accountId}"
API_TOKEN = "${config.apiToken}"
USERNAME = "${config.username || 'User'}"

AVAILABLE_MODELS = [
    "@cf/meta/llama-3.1-8b-instruct",
    "@cf/meta/llama-3-8b-instruct",
    "@cf/mistral/mistral-7b-instruct-v0.1",
    "@cf/google/gemma-7b-it",
    "@cf/qwen/qwen1.5-14b-chat-awq",
    "@cf/meta/llama-2-7b-chat-int8"
]

API_URL = "${appUrl}/api/chat"
MODEL = "${config.modelId || '@cf/meta/llama-3.1-8b-instruct'}"
loading = False

def choose_model():
    global MODEL
    print(f"\\n{C_SYS}=== PILIH MODEL AI ==={C_RST}")
    for i, m in enumerate(AVAILABLE_MODELS):
        indicator = f" {C_AI}*(aktif){C_RST}" if m == MODEL else ""
        print(f" {i+1}. {m}{indicator}")
    
    print(f" c. Masukkan Model Custom...")
    
    print(f"\\n{C_LOG}Tekan Enter untuk menggunakan model aktif ({MODEL}){C_RST}")
    print(f"{C_LOG}Atau masukkan nomor/huruf untuk mengganti model.{C_RST}")
    
    choice = input(f"\\n{C_USER}Pilih [1-{len(AVAILABLE_MODELS)} / c]: {C_RST}").strip().lower()
    
    if choice == 'c':
        custom_model = input(f"\\n{C_USER}Masukkan nama model custom: {C_RST}").strip()
        if custom_model:
            MODEL = custom_model
            print(f"\\n{C_AI}[+] Model berhasil diubah ke: {MODEL}{C_RST}")
        else:
            print(f"\\n{C_ERR}[!] Input kosong, tetap menggunakan {MODEL}{C_RST}")
    elif choice.isdigit():
        idx = int(choice) - 1
        if 0 <= idx < len(AVAILABLE_MODELS):
            MODEL = AVAILABLE_MODELS[idx]
            print(f"\\n{C_AI}[+] Model berhasil diubah ke: {MODEL}{C_RST}")
        else:
            print(f"\\n{C_ERR}[!] Nomor tidak valid, tetap menggunakan {MODEL}{C_RST}")
    else:
        print(f"\\n{C_AI}[+] Tetap menggunakan model: {MODEL}{C_RST}")
    
    input(f"\\n{C_LOG}Tekan Enter untuk melanjutkan...{C_RST}")
    os.system('clear' if os.name == 'posix' else 'cls')

def print_menu():
    banner = """\\033[96m
   _____ ______   _      _      __  __ 
  / ____|  ____| | |    | |    |  \\/  |
 | |    | |__    | |    | |    | \\  / |
 | |    |  __|   | |    | |    | |\\/| |
 | |____| |      | |____| |____| |  | |
  \\_____|_|      |______|______|_|  |_|
                                       
\\033[0m"""
    print(banner)
    print(f"{C_SYS}========================================={C_RST}")
    print(f"{C_SYS}   T E R M U X   A I   A S S I S T A N T {C_RST}")
    print(f"{C_SYS}========================================={C_RST}")
    print(f"{C_SYS}User         : {C_AI}{USERNAME}{C_RST}")
    print(f"{C_SYS}Model Aktif  : {C_AI}{MODEL}{C_RST}")
    print(f"{C_SYS}Kemampuan    : {C_AI}Penuh (Akses Sistem & Shell){C_RST}")
    print(f"{C_LOG}-----------------------------------------{C_RST}")
    print(f"{C_LOG}Perintah Khusus:{C_RST}")
    print(f"{C_LOG} - Ketik '/model' untuk mengganti model{C_RST}")
    print(f"{C_LOG} - Ketik 'exit' atau 'quit' untuk keluar{C_RST}")
    print(f"{C_LOG} - Ketik 'clear' untuk membersihkan layar{C_RST}")
    print(f"{C_SYS}========================================={C_RST}\\n")

def show_spinner():
    global loading
    spinner_chars = ['|', '/', '-', '\\\\']
    idx = 0
    while loading:
        sys.stdout.write(f"\\r{C_LOG}... Memproses permintaan {spinner_chars[idx]} ...{C_RST}")
        sys.stdout.flush()
        idx = (idx + 1) % len(spinner_chars)
        time.sleep(0.1)
    sys.stdout.write(f"\\r{' '*40}\\r") # Clear loading text

def execute_shell_command(command):
    print(f"\\n{C_CMD}>> [SISTEM] Mengeksekusi: {command}{C_RST}")
    try:
        if command.strip().startswith("cd ") or command.strip() == "cd":
            target_dir = command.strip()[3:].strip()
            if not target_dir or target_dir == "~":
                target_dir = os.path.expanduser("~")
            try:
                os.chdir(target_dir)
                cwd = os.getcwd()
                success_msg = f"Direktori kerja saat ini: {cwd}"
                print(f"{C_CMD}>> [OUTPUT]\\n{success_msg}{C_RST}")
                return success_msg
            except FileNotFoundError:
                err_msg = f"cd: {target_dir}: No such file or directory"
                print(f"{C_ERR}>> [ERROR]\\n{err_msg}{C_RST}")
                return err_msg
            except Exception as e:
                print(f"{C_ERR}>> [ERROR]\\n{e}{C_RST}")
                return str(e)
                
        executable_path = '/bin/bash' if os.path.exists('/bin/bash') else (
            '/data/data/com.termux/files/usr/bin/bash' if os.path.exists('/data/data/com.termux/files/usr/bin/bash') else None
        )
        process = subprocess.Popen(command, shell=True, executable=executable_path, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        print(f"{C_CMD}>> [OUTPUT]{C_RST}")
        output = ""
        
        start_time = time.time()
        timeout = 120 
        apt_lock_count = 0
        
        fd = process.stdout.fileno()
        fl = fcntl.fcntl(fd, fcntl.F_GETFL)
        fcntl.fcntl(fd, fcntl.F_SETFL, fl | os.O_NONBLOCK)
        
        while True:
            if time.time() - start_time > timeout:
                process.kill()
                msg = f"\\n[!] PROSES DIHENTIKAN: Timeout {timeout} detik tercapai."
                output += msg
                print(f"\\n{C_ERR}{msg}{C_RST}")
                break
                
            reads, _, _ = select.select([process.stdout], [], [], 1.0)
            if reads:
                try:
                    chunk = os.read(fd, 1024).decode('utf-8', errors='replace')
                    if not chunk: 
                        break
                    sys.stdout.write(chunk)
                    sys.stdout.flush()
                    output += chunk
                    
                    if "Waiting for cache lock" in chunk:
                        apt_lock_count += 1
                        if apt_lock_count > 5:
                            process.kill()
                            msg = "\\n[!] DIHENTIKAN OTOMATIS: apt cache ter-lock. Coba jalankan: killall apt apt-get"
                            output += msg
                            print(f"\\n{C_ERR}{msg}{C_RST}")
                            break
                except OSError:
                    pass
            else:
                if process.poll() is not None:
                    break
        
        return output.strip()
    except Exception as e:
        error_msg = f"Exception: {str(e)}"
        print(f"{C_ERR}>> [GAGAL] {error_msg}{C_RST}")
        return error_msg

def chat_with_ai(messages):
    data = {
        "accountId": ACCOUNT_ID,
        "token": API_TOKEN,
        "modelId": MODEL,
        "messages": messages
    }
    
    req = urllib.request.Request(API_URL, json.dumps(data).encode('utf-8'))
    req.add_header('Content-Type', 'application/json')
    req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
    req.add_header('Accept', 'application/json')
    
    try:
        response = urllib.request.urlopen(req)
        result_text = response.read().decode('utf-8')
        
        try:
            return json.loads(result_text)
        except json.JSONDecodeError as e:
            print(f"\\n{C_ERR}[!] Gagal parsing JSON. (Error: {e}){C_RST}")
            print(f"{C_LOG}Raw Output API:{C_RST}\\n{result_text[:500]}...\\n")
            return None
            
    except urllib.error.URLError as e:
        print(f"\\n{C_ERR}[!] Error Koneksi API: {e}{C_RST}")
        try:
            print(f"Response: {e.read().decode('utf-8')}")
        except:
            pass
        return None

def main():
    os.system('clear' if os.name == 'posix' else 'cls')
    choose_model()
    print_menu()
    
    system_prompt = (
        "Kamu adalah AGEN AI PROGRAMMER OTONOM yang berjalan langsung di Termux (Android) atau VPS Linux. "
        "Kamu BUKAN sekadar chatbot AI yang memberikan kode atau tutorial. Kamu punya AKSES SHELL PENUH. "
        "TUGASMU ADALAH MENGEKSEKUSI, BUKAN MENJELASKAN. "
        "Gunakan format: <CMD>perintah_shell_disini</CMD> untuk menjalankan perintah di shell. "
        "ATURAN MUTLAK (JIKA DILANGGAR KAMU GAGAL): "
        "1. DILARANG MEMBERIKAN KODE MENTAH DI CHAT (misal pakai blok \`\`\`html atau sebagainya). Jika diminta membuat web/script, "
        "KAMU SENDIRI YANG HARUS MEMBUAT FILENYA pakai perintah shell! "
        "2. Gunakan heredoc untuk membuat file: <CMD>cat << 'EOF' > index.html\\n<Isi HTML>\\nEOF</CMD> . Jangan pakai echo. "
        "3. Kamu harus mandiri. Buat foldernya, buat filenya, jalankan script/servernya. Jangan suruh pengguna yang melakukan itu! "
        "4. JIKA TERJADI ERROR DARI SHELL: Baca log errornya, cari alternatif, dan jalankan <CMD>...</CMD> perbaikannya. JIKA TERUS GAGAL DAN MENTOK: BERHENTI menjalankan <CMD>...</CMD> dan laporkan masalah tersebut ke pengguna untuk meminta arahan! "
        "5. PENTING: Untuk perintah instalasi (pkg/apt), gunakan argumen -y. Jika menerima pesan 'apt cache ter-lock', jalankan <CMD>killall apt apt-get</CMD> lalu ulangi perintah instalasinya. "
        "6. JANGAN JALANKAN PERINTAH BLOCKING (contoh: python -m http.server 8080) secara langsung karena akan membuat sistem hang! Jalankan di background: <CMD>nohup python -m http.server 8080 > server.log 2>&1 &</CMD> . "
        "7. Jangan pernah mengetik <CMD>...</CMD> sebagai contoh, karena itu akan otomatis tereksekusi. Tunjukkan hasil kerjamu, bukan teori! "
        "8. Jika diminta menganalisa URL atau website, pastikan hasil temuan/analisa tersebut disajikan secara terstruktur menggunakan format TABEL Markdown agar lebih rapi dan profesional."
    )
    
    messages = [{"role": "system", "content": system_prompt}]
    global loading
    
    while True:
        try:
            user_input = input(f"\\n{C_USER}┌──({USERNAME})\\n└─> {C_RST}")
            
            if user_input.lower() in ['exit', 'quit']:
                print(f"{C_SYS}\\nMematikan sistem AI. Sampai jumpa!{C_RST}")
                break
            if user_input.lower() == '/model':
                os.system('clear' if os.name == 'posix' else 'cls')
                choose_model()
                print_menu()
                continue
            if user_input.lower() == 'clear':
                os.system('clear' if os.name == 'posix' else 'cls')
                print_menu()
                continue
            if not user_input.strip():
                continue
                
            messages.append({"role": "user", "content": user_input})
            
            while True:
                MAX_HISTORY = 10
                if len(messages) > MAX_HISTORY + 1:
                    messages = [messages[0]] + messages[-MAX_HISTORY:]
                    
                loading = True
                spinner_thread = threading.Thread(target=show_spinner)
                spinner_thread.daemon = True
                spinner_thread.start()
                
                response_data = chat_with_ai(messages)
                
                loading = False
                spinner_thread.join(timeout=1)
                
                if response_data and "response" in response_data:
                    ai_reply = response_data["response"]
                    
                    clean_reply = re.sub(r'\\*\\*(.*?)\\*\\*', r'\\1', ai_reply)
                    clean_reply = re.sub(r'\\*(.*?)\\*', r'\\1', clean_reply)
                    clean_reply = re.sub(r'##+\\s*(.*)', r'\\1', clean_reply)
                    clean_reply = re.sub(r'#+\\s*(.*)', r'\\1', clean_reply)
                    clean_reply = re.sub(r'\`\`\`[a-zA-Z0-9]*\\n', '', clean_reply)
                    clean_reply = re.sub(r'\`\`\`', '', clean_reply)
                    clean_reply = re.sub(r'\`(.*?)\`', r'\\1', clean_reply)
                    clean_reply = re.sub(r'(?s)<CMD>.*?</CMD>', '', clean_reply).strip()
                    
                    if clean_reply:
                        print(f"\\n{C_AI}╭──[ AI Assistant ]{C_RST}")
                        for line in clean_reply.splitlines():
                            print(f"{C_AI}│ {C_AITXT}{line}{C_RST}")
                        print(f"{C_AI}╰──────────────────────{C_RST}\\n")
                    
                    messages.append({"role": "assistant", "content": ai_reply})
                    
                    commands_to_run = re.findall(r'<CMD>\\s*(.*?)\\s*</CMD>', ai_reply, re.DOTALL)
                    
                    if not commands_to_run:
                        break
                        
                    for cmd in commands_to_run:
                        is_dangerous = re.search(r'\\b(install|remove|rm|delete|uninstall|purge|drop)\\b', cmd.lower())
                        
                        if is_dangerous:
                            print(f"\\n{C_USER}[?] AI ingin menjalankan perintah modifikasi sistem:{C_RST}")
                            print(f"{C_CMD}  {cmd}{C_RST}")
                            confirm = input(f"{C_USER}Izinkan eksekusi? (y/N): {C_RST}").strip().lower()
                            if confirm != 'y':
                                print(f"{C_ERR}[!] Perintah dibatalkan oleh pengguna.{C_RST}")
                                messages.append({
                                    "role": "user", 
                                    "content": f"[SYSTEM LOG] Pengguna MENOLAK izin untuk menjalankan perintah '{cmd}'. Jangan ulangi perintah yang sama. Tanyakan kepada pengguna apa yang ingin mereka lakukan."
                                })
                                continue
                                
                        cmd_output = execute_shell_command(cmd)
                        messages.append({
                            "role": "user", 
                            "content": f"[SYSTEM LOG] Eksekusi '{cmd}' menghasilkan:\\n{cmd_output}\\n[SYSTEM INSTRUCTION] Evaluasi hasil ini. Jika error, cari cara lain dan perbaiki via <CMD>...</CMD>. JIKA KEMBALI GAGAL DAN MENTOK: BERHENTI berikan <CMD>...</CMD> dan laporkan langsung ke pengguna. Jika sukses, lanjutkan <CMD>...</CMD> berikutnya atau laporkan sukses tanpa <CMD>...</CMD>."
                        })
                else:
                    print(f"{C_ERR}[!] Tidak ada balasan valid dari API.{C_RST}")
                    break
                    
        except KeyboardInterrupt:
            print(f"\\n\\n{C_SYS}[!] Interupsi terdeteksi. Ketik 'exit' untuk keluar.{C_RST}")
            break
        except Exception as e:
            print(f"\\n{C_ERR}[!] Terjadi kesalahan fatal: {e}{C_RST}")

if __name__ == "__main__":
    main()
`
}
