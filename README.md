#  Insight Dashboard

SME Insight is a secure, full-stack business analytics enterprise web platform engineered to help Small and Medium Enterprises (SMEs) upload, parse, and visualize data seamlessly. Powered by the **Google Gemini AI** orchestration layer, the application securely interrogates raw datasets to instantly generate clean, contextual executive summaries and actionable analytical takeaways.

The platform utilizes microservices orchestrated entirely via **Docker Compose**, wrapping a React frontend framework, an Express/Node.js backend API gateway, and a highly persistent PostgreSQL database container together in an isolated, secure layer.

---

## System Architecture

The application is split into three decoupled operational core service layers:
1. **Frontend Client:** React SPA powered by HTML5 Drag-and-Drop and dynamic responsive layouts via modern CSS interfaces.
2. **Backend API Gateway:** Express.js server running Node.js that handles secure stream parsing, authentication guardrails, and third-party AI integration routing.
3. **Database Instance:** Relational PostgreSQL layer enforcing entity integrity and row/column security configurations.

---

## Key Functional Modules

* **Session Persistence Architecture:** Leverages browser-native `localStorage` caches securely binding JWT session keys and tokens, preventing state degradation or forced routing redirects upon client-side window reloads.
* **Granular Column Scrubbing (RLS):** Administrative configuration tools that dynamically intercept physical server file streams, scrubbing raw target CSV tables down to only explicitly whitelisted data keys for standard user clearance levels.
* **Google Drive-Inspired Upload Layer:** An advanced HTML5 Drag-and-Drop UX boundary backed by visual dynamic drop states, real-time file-extension validation handlers, and transactional state tracking.
* **HTML-Rerendered AI Insights Agent:** Interchanges aggregated data configurations to the `gemini-3.5-flash` telemetry layer, mapping specific raw analytical values into browser-ready HTML blocks (utilizing safe semantic markup strings while scrubbing out raw Markdown blocks).

---
## Getting Started

Follow these steps step by step to run the website on your own computer.

### 1. Clone the Repository

Open a terminal (Command Prompt on Windows, Terminal on macOS/Linux or terminal in Visual Studio Code) and run:

```bash 
git clone https://github.com/fadtdm/Insight.git
```

Then move into the project folder:
```bash 
cd Insight
```

### 2. Install Docker

If you haven't already, download and install Docker Desktop from https://www.docker.com. After installation, start Docker Desktop. You should see the Docker icon in your system tray or menu bar – this means Docker is running.

### 3. Build and Run the Container

This project uses docker-compose to simplify building and running the server. In the project folder, run:

```bash
docker-compose up --build
```

--The --build flag tells Docker to build the image (the blueprint for the container) before starting it.

--The first time you run this, it will download base images and install dependencies – this may take a few minutes.

--Once ready, you'll see log output ending with something like Server running on http://0.0.0.0:3000 or Listening on port 80.

    Note: The terminal will now show live logs. To keep the server running, leave this terminal window open. You can open a second terminal for other commands.

### 4. Access the Website

Open your web browser and go to: http://localhost:3000

The default login credentials for admin would be:

    Username: admin
    Password: hashed_pw_here

You can add, and edit credentials later in the website.

---
## Stopping the Container
To stop the server, go back to the terminal where docker-compose up is running and press:
text

Ctrl + C

Wait a few seconds for Docker to shut down gracefully. The terminal will return to the command prompt.