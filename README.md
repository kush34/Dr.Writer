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
