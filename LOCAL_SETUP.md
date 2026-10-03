# Test Gatewise on your computer

Clone the GitHub repository or extract the supplied ZIP to get the complete app, including 24 past-year PDFs.

## Windows

1. Download `Gatewise-local.zip`, right-click it, and choose **Extract All**.
2. Install Python 3 from https://www.python.org/downloads/ if needed. Enable **Add Python to PATH** in the installer.
3. Open the extracted `Gate2027Prepaertion` folder. In File Explorer's address bar, type `powershell` and press Enter.
4. Run:

   ```powershell
   py -3 run-local.py
   ```

   If `py` is unavailable, try `python run-local.py`.
5. Your normal browser should open http://127.0.0.1:3000/. Keep the terminal open while using the app. Press Ctrl+C to stop.

## macOS / Linux

Install Python 3 if needed. Open Terminal in the extracted project directory and run:

```bash
python3 run-local.py
```

Your browser should open http://127.0.0.1:3000/.

## Troubleshooting

- **Port already in use:** run `py -3 run-local.py --port 8000` on Windows, or `python3 run-local.py --port 8000` on macOS/Linux. Open http://127.0.0.1:8000/.
- **Browser does not open:** paste the printed URL into Chrome, Edge, Firefox, or Safari.
- **Connection refused:** ensure the launcher is still running in your local terminal and use its printed port.
- **Blank page when double-clicking index.html:** use the launcher. JSON content requires an HTTP server.
- **Python command not found:** install Python and reopen your terminal.
- **PDF does not appear inside the page:** use the app's “Open PDF in a new tab” link.

No Node.js, npm install, account, API key, database, or paid service is required. The optional Google Fonts request can fail without preventing the app from working. App content and PDFs are included locally.

Progress stays in your browser's localStorage. The cloud browser's progress does not transfer automatically. Use the same browser and address to retain local progress; changing the port or using private browsing creates a different storage context.

## GitHub clone

The existing remote is https://github.com/anshuman100acress/Gate2027Prepaertion. Clone the complete application:

```bash
git clone https://github.com/anshuman100acress/Gate2027Prepaertion.git
cd Gate2027Prepaertion
```

Then run the Python launcher above.
