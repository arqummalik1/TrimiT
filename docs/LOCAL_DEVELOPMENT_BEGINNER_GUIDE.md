# TrimiT Local Development — Beginner Guide

Last verified: 2026-09-01  
Repository: `/Users/arqummalik/Software-Development/Trimit/TrimiT`

This guide explains how to run the TrimiT backend and client applications on a
Mac, how each command works, how to confirm that the app is really using the
local backend, and how to stop and undo the local setup safely.

## 1. First understand what “running locally” means

TrimiT has three application layers:

1. **Backend** — the FastAPI server in `backend/`.
2. **Mobile frontend** — the Expo/React Native app in `mobile/`.
3. **Web frontend** — the Vite/React website in `frontend/`.

It also has a fourth layer: **Supabase**, which provides the database and
authentication.

For the workflow documented here:

- the backend runs on the Mac;
- the mobile app or website runs locally;
- the existing hosted Supabase project is still used.

You do **not** need to run Supabase locally for a focused read-only check such as
opening My Bookings. However, this is not a completely isolated environment.
Signing in uses hosted authentication, and normal app behavior may update the
device push token. Creating, cancelling, rescheduling, verifying, deleting, or
editing records would change hosted Supabase data.

Use a dedicated staging Supabase project before performing unrestricted
end-to-end mutation testing. The repository contains
`mobile/supabase/config.toml`, but it currently does not contain the complete
local migration set or seed data required to reproduce the production database
locally.

## 2. Use visible Terminal windows

Open the macOS **Terminal** application. Create one tab for each long-running
process:

- Terminal tab 1: backend;
- Terminal tab 2: mobile Metro server;
- Terminal tab 3: web frontend, only when testing the website.

A server keeps control of its terminal while it is running. That is normal. Do
not close the terminal tab; open another tab with **Command+T** when another
command must run.

Stop a server by selecting its terminal tab and pressing **Control+C**.

## 3. Run the backend locally

### 3.1 Move into the backend folder

```bash
cd /Users/arqummalik/Software-Development/Trimit/TrimiT/backend
```

Command explanation:

- `cd` means **change directory**.
- A directory is a folder.
- The path after `cd` is the backend folder's full absolute path.
- An absolute path begins with `/` and does not depend on the terminal's current
  folder.

You can confirm the current folder with:

```bash
pwd
```

- `pwd` means **print working directory**.

### 3.2 Start FastAPI

```bash
./.venv/bin/python -m uvicorn server:app --port 8000
```

Every part of this command has a purpose:

- `.` means the current folder.
- `/` separates folders in a path.
- `.venv` is a hidden folder containing the backend's Python virtual
  environment.
- `venv` is short for **virtual environment**. It keeps this project's Python
  and packages separate from the Mac's system Python.
- `.venv/bin/python` is the Python executable inside that virtual environment.
- `./.venv/bin/python` therefore means “run this project's Python.”
- `-m` tells Python to run an installed Python **module** by name.
- `uvicorn` is the development web server that runs FastAPI.
- `server:app` means “load the object named `app` from `server.py`.”
- `--port 8000` tells Uvicorn to listen for HTTP requests on port `8000`.
- A port is a numbered local network doorway used by one server process.

The successful message is:

```text
Uvicorn running on http://127.0.0.1:8000
```

`127.0.0.1` means **this computer**, also called `localhost`.

### 3.3 Optional development flags

The smallest command above does not need these flags, but they are useful to
understand:

```bash
./.venv/bin/python -m uvicorn server:app --host 127.0.0.1 --port 8000 --reload
```

- `--host 127.0.0.1` allows connections only from the same Mac and its iOS
  Simulator.
- `--host 0.0.0.0` allows devices on the local network to connect, subject to
  macOS firewall and Wi-Fi settings. Use this for a physical Android device.
- `--reload` watches Python files and restarts the backend after a source change.
  It is convenient for development but not used in production.

### 3.4 Check backend health

Open another Terminal tab and run:

```bash
curl http://127.0.0.1:8000/health
```

- `curl` sends an HTTP request from the command line.
- The URL targets the backend running on the Mac.
- A successful health response proves that the backend is reachable.

## 4. Run the mobile app in the iOS Simulator

### 4.1 Temporarily point the mobile app to the local backend

Open `mobile/.env` and change only this line:

```env
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000
```

Important:

- `.env` is a local environment file and is ignored by Git.
- Never commit `.env` because it may contain credentials.
- Do not change `mobile/app.config.js` or production source defaults for a local
  test.
- Restore the production URL when testing is complete; the cleanup section gives
  the exact value.

### 4.2 First run, or after changing the API URL

Keep the backend running in terminal tab 1. Open terminal tab 2 and run:

```bash
cd /Users/arqummalik/Software-Development/Trimit/TrimiT/mobile
npm run ios -- --device "iPhone 17 Pro"
```

Command explanation:

- `npm` is the Node.js package manager command.
- `run ios` runs the `ios` script declared in `mobile/package.json`.
- That script runs `expo run:ios`, which builds and installs the native iOS
  development app.
- The first `--` tells npm, “the remaining options belong to the underlying
  Expo command.”
- `--device` tells Expo which simulator or Apple device to use.
- `"iPhone 17 Pro"` is inside quotes because its name contains spaces.

The first native build may take several minutes. Later builds are usually
faster.

This project may finish building and installing successfully but show a macOS
AppleScript permission error while Expo tries to focus Simulator. If the build
says `Build Succeeded`, open Simulator manually and tap TrimiT.

### 4.3 Later runs when the local development app is already installed

Backend in terminal tab 1:

```bash
cd /Users/arqummalik/Software-Development/Trimit/TrimiT/backend
./.venv/bin/python -m uvicorn server:app --port 8000
```

Metro in terminal tab 2:

```bash
cd /Users/arqummalik/Software-Development/Trimit/TrimiT/mobile
npm run start -- --dev-client
```

Command explanation:

- `npm run start` starts Expo's Metro development server.
- Metro converts the TypeScript/JavaScript app code into a bundle the device can
  run.
- Metro normally listens on port `8081`.
- `--dev-client` says to use the installed TrimiT development build rather than
  Expo Go.

After Metro is ready, open TrimiT manually in Simulator. Pressing `r` in the
Metro terminal reloads the JavaScript app.

### 4.4 Verify that mobile is really using the local backend

Do not rely only on the screen. Read the Metro request log.

Correct local request:

```text
http://127.0.0.1:8000/api/v1/bookings/
```

Wrong for a local-backend test:

```text
https://trimit-az5h.onrender.com/api/v1/bookings/
```

Also inspect the backend terminal. A successful customer booking read should
contain:

```text
GET /api/v1/bookings/ HTTP/1.1 200 OK
```

If Metro shows the production Render URL and the backend terminal shows no
booking request, the local backend was not tested. Stop Metro, verify
`mobile/.env`, rebuild the development app, and try again.

### 4.5 Set an iOS Simulator location manually

TrimiT currently needs a serviceable location to show Jammu salons.

1. Open Simulator.
2. In the Mac menu bar, choose **Features → Location → Custom Location…**
3. Enter latitude `32.7266`.
4. Enter longitude `74.8570`.
5. Click **OK**.
6. In the simulated iPhone, open **Settings → Privacy & Security → Location
   Services**.
7. Ensure Location Services is on.
8. Set TrimiT to **While Using the App** and enable **Precise Location**.
9. Force-close and reopen TrimiT, or press `r` in the Metro terminal.

Remove the simulated location afterward with **Features → Location → None**.

The command-line equivalents are:

```bash
xcrun simctl location booted set 32.7266,74.8570
xcrun simctl location booted clear
```

- `xcrun` finds and runs an Apple/Xcode developer tool.
- `simctl` means **Simulator control**.
- `location` selects the simulated-location feature.
- `booted` means the currently running simulator.
- `set` applies the latitude/longitude pair.
- `clear` removes the simulated location.

## 5. Run the web frontend locally

Keep the backend running. In terminal tab 3, run:

```bash
cd /Users/arqummalik/Software-Development/Trimit/TrimiT/frontend
VITE_BACKEND_URL=http://127.0.0.1:8000 npm run dev
```

Command explanation:

- `VITE_BACKEND_URL=http://127.0.0.1:8000` creates an environment variable for
  this one command only.
- It tells the web application to send API requests to the local backend.
- `npm run dev` starts Vite's development web server.
- Vite normally prints a local browser URL such as `http://localhost:5173`.
- Stopping the command removes the temporary inline environment variable; no
  file is edited.

Open the exact URL printed by Vite. Confirm API requests target
`http://127.0.0.1:8000/api/v1`.

## 6. Use a physical Android device

`127.0.0.1` on a physical phone means the phone itself, not the Mac. The phone
must use the Mac's private Wi-Fi address.

### 6.1 Find the Mac's Wi-Fi address

```bash
ipconfig getifaddr en0
```

- `ipconfig` reads network-interface configuration on macOS.
- `getifaddr` means “get interface address.”
- `en0` is commonly the Mac's Wi-Fi interface.
- The result may look like `192.168.1.186` and can change when reconnecting to
  Wi-Fi.

If the command prints nothing, check the active interface in macOS network
settings rather than guessing.

### 6.2 Start the backend for network access

```bash
cd /Users/arqummalik/Software-Development/Trimit/TrimiT/backend
./.venv/bin/python -m uvicorn server:app --host 0.0.0.0 --port 8000
```

`0.0.0.0` tells the backend to listen on all Mac network interfaces. It does not
mean the Android app should use `0.0.0.0` as its URL.

### 6.3 Configure mobile for the Mac address

For example, if the Mac address is `192.168.1.186`, set in `mobile/.env`:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.186:8000
```

Then build/run the Android development app. The Mac and phone must be on the
same Wi-Fi network, and the macOS firewall must allow the backend connection.

Restore the production URL after testing.

## 7. Understand and resolve “port already in use”

Only one process can listen on a particular port. Metro displays a port conflict
when another Metro process already owns `8081`.

Check port `8081`:

```bash
lsof -nP -iTCP:8081 -sTCP:LISTEN
```

Check backend port `8000`:

```bash
lsof -nP -iTCP:8000 -sTCP:LISTEN
```

Command explanation:

- `lsof` means **list open files**. On Unix-like systems, network sockets are
  represented like open files, so `lsof` can show processes using ports.
- `-n` prevents conversion of numeric network addresses into host names. This
  makes the result faster and clearer.
- `-P` prevents conversion of port numbers into service names, so the output
  continues to show `8000` or `8081`.
- `-iTCP:8081` filters results to TCP network activity on port `8081`.
- `-sTCP:LISTEN` shows only processes waiting for incoming TCP connections.
- `COMMAND` is the program name.
- `PID` means **process identifier**, a unique number assigned to a running
  process.

The preferred way to stop a known server is **Control+C in the terminal where
it is running**.

If the terminal is lost, first identify the exact PID with `lsof`. Then stop that
specific process:

```bash
kill 12345
```

Replace `12345` with the PID printed by `lsof`.

- `kill` sends a normal termination signal to a process.
- Do not copy a PID from an old session; PIDs are reused.
- Avoid `kill -9` unless normal termination repeatedly fails, because `-9`
  prevents the process from cleaning up normally.

When Expo asks “Use port 8082 instead?”, choose **No** when the goal is to fix a
stale `8081` server. Find and stop the existing Metro process first.

## 8. Complete cleanup after local testing

### 8.1 Stop every visible server

In each Terminal tab, press **Control+C**:

1. Metro/mobile terminal.
2. Backend terminal.
3. Vite/web terminal, if it was started.

### 8.2 Confirm ports are free

```bash
lsof -nP -iTCP:8000 -sTCP:LISTEN
lsof -nP -iTCP:8081 -sTCP:LISTEN
lsof -nP -iTCP:5173 -sTCP:LISTEN
```

No output means no process is listening on that port.

### 8.3 Restore the production mobile API URL

Set this line in `mobile/.env`:

```env
EXPO_PUBLIC_API_URL=https://trimit-az5h.onrender.com
```

Do not change production defaults in source files.

### 8.4 Clear Simulator-only state

Choose **Features → Location → None** or run:

```bash
xcrun simctl location booted clear
```

If desired, terminate only the TrimiT simulator app:

```bash
xcrun simctl terminate booted online.trimit.app
```

- `terminate` stops the app process.
- `online.trimit.app` is the iOS bundle identifier.

To shut down the active simulator device:

```bash
xcrun simctl shutdown booted
```

### 8.5 Check Git before committing or pushing

From the repository root:

```bash
cd /Users/arqummalik/Software-Development/Trimit/TrimiT
git status --short
git diff --check
```

Command explanation:

- `git status` displays changed and untracked files.
- `--short` uses a compact two-column format.
- `git diff` displays changes that are not committed.
- `--check` looks for whitespace errors and conflict markers.

Confirm that `.env` is ignored:

```bash
git check-ignore mobile/.env
```

- `git check-ignore` prints the path when Git's ignore rules cover it.

Never push, merge, or deploy only because an automated test passed. Review the
diff and perform the relevant local smoke test first.

## 9. Minimum booking smoke test

For a customer read-only verification:

1. Confirm mobile logs use `http://127.0.0.1:8000`.
2. Sign in as a customer.
3. Open My Bookings.
4. Confirm Metro reports HTTP `200` for `/api/v1/bookings/`.
5. Confirm the backend reports `GET /api/v1/bookings/ ... 200 OK`.
6. Confirm the booking list or correct empty state renders.
7. Sign out.

For an owner verification, use an approved test owner and only view Manage
Bookings unless mutation testing has been explicitly authorized.

When using hosted Supabase, remember that authentication and automatic device
push-token registration can still update hosted account data even when the
booking page itself performs only a read.

## 10. Fast troubleshooting table

| Symptom | Meaning | Action |
| --- | --- | --- |
| `Address already in use` | Another process owns the port | Use `lsof`, identify the exact PID, and stop the existing server |
| Expo asks to use `8082` | Port `8081` is occupied | Choose No and stop the existing Metro process |
| Mobile log shows `onrender.com` | App is using production backend | Stop Metro, update local `.env`, rebuild the development app |
| Mobile log shows `127.0.0.1:8000`, but request fails | Local backend is stopped or unreachable | Start backend and run the health check |
| Physical Android cannot reach `127.0.0.1` | That address points to the phone | Use the Mac's Wi-Fi IP and backend host `0.0.0.0` |
| Simulator says area is unsupported | Simulator location is outside Jammu or stale | Set Custom Location, verify permissions, then restart/reload TrimiT |
| Backend starts but auth fails | Backend environment does not match the Supabase session | Verify the intended environment without printing or sharing secrets |
| Booking works locally but fails live | The repaired backend has not deployed, or production runs an older revision | Confirm deployment revision and inspect production backend logs |

## 11. The shortest repeatable iOS workflow

1. Set `mobile/.env` API URL to `http://127.0.0.1:8000`.
2. Open two visible macOS Terminal tabs.
3. Start the backend in tab 1.
4. Start Metro in tab 2.
5. Open TrimiT manually in Simulator.
6. Verify the request URL before testing.
7. Test the intended flow.
8. Press Control+C in both tabs.
9. Restore the production API URL.
10. Clear the Simulator location.
11. Run `git status --short` before committing.

