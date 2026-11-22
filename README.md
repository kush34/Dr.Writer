# Dr.Writer
## Introduction
This project is a fully functional word document editor, designed to provide an intuitive and user-friendly text editing experience. With real-time collaboration, rich formatting options, and seamless document management, it replicates the core features of the original Google Docs.
# Login Page
![Screenshot_2024-12-31_16-30-45(loginPage)](https://github.com/user-attachments/assets/26294ef2-a4c9-42d7-ac95-4f056cb8e744)
# Editor Page
![Screenshot_2024-12-30_23-19-05](https://github.com/user-attachments/assets/f13b818a-5858-467e-a680-c822bf25f83e)
# File/Home Page
![Screenshot_2025-01-01_22-29-17(homepage)](https://github.com/user-attachments/assets/a401ab2b-69ca-4e8e-b1c3-c63311d16a20)
# Adding User
![Screenshot_2024-12-30_23-20-28](https://github.com/user-attachments/assets/fabe3305-393e-4f05-9d9a-16e1acd7b834)
## Features

**Core Functionalities**

1. **Real-Time Collaboration**

 * Collaborate with multiple users simultaneously.

 * Changes are instantly reflected for all participants.

2. **Rich Text Editing**

 * Bold, italic, underline, and other text formatting options.

 * Text alignment, bullet points, and numbering.

3. **Document Management**

  * Create, edit, and save documents.

 * Organize documents into folders for easy access.

4. **Sharing and Permissions**
 
 * Share documents via unique links.

 * Set view, comment, or edit permissions.

5. **Offline Mode**
 * Edit documents offline, and sync changes once reconnected.

## Installtion

### Run locally with Docker (no credentials needed)

Requires Docker and Node.js. This starts MongoDB, a local Firebase Auth emulator and the backend.

```
docker compose up --build -d
```

Then start the frontend:

```
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and click **Create an Account** (email + password; Google sign-in does not work against the emulator).

Credentials live in `backend/.env` and `frontend/.env` (both git-ignored). The defaults are local-only:
MongoDB runs in a container, and Firebase Auth runs in the emulator on port 9099.
MongoDB data and emulator accounts persist in Docker volumes across normal restarts.
The auth emulator saves accounts when it stops cleanly; removing Docker volumes deletes this local data.

Not available without real keys: image upload (Cloudinary) and AI features (OpenRouter).
Leave `CLOUDINARY_*` / `OPEN_ROUTER_API_KEY` empty to keep them disabled, or fill them in to enable.

For Settings → Connect OpenRouter, set `MCP_ENCRYPTION_KEY` in the backend environment to a persistent, random 64-character hexadecimal key (generate one with `openssl rand -hex 32`). It encrypts saved credentials; changing it makes existing OpenRouter and MCP credentials unreadable. Use HTTPS in production. Disconnecting removes the saved key from Dr.Writer; users can also revoke it in OpenRouter settings.

### Run without Docker

# Prerequisites

Ensure you have the following installed on your system:
* Node.js (v14 or higher)
* MongoDB
* A modern web browser (Chrome, Firefox, etc.)

# Steps
1. Clone the Repository
```
git clone https://https://github.com/kush34/Dr.Writer.git
cd Dr.Writer
```
2. Install Dependencies
```
# Start the backend
cd backend
npm install

# Start the frontend
cd frontend
npm install
```
3.Set Up Enviroment Variables
```
#for backend
PORT = 
MongoDb_URI = 
Socket = 3001
Gemini_API = 
databaseURL = 
Frontend_URL = 

#for frontend
VITE_Apikey = ""
VITE_AuthDomain = ""
VITE_ProjectId = ""
VITE_StorageBucket = ""
VITE_MessagingSenderId = ""
VITE_AppId = ""
VITE_MeasurementId = "" 

VITE_Backend_URL = ''
VITE_Socket_URL = ''
```
4. Run the Application
 ```
# Start the backend
cd backend
npm start

# Start the frontend
cd ../frontend
npm start
```

## Credits

The AI dock and chat use components from [Rare UI](https://www.rareui.com/). Web search in chat uses the hosted [Exa MCP server](https://exa.ai/mcp).
