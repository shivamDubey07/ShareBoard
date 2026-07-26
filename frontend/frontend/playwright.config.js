import { defineConfig } from "@playwright/test";


export default defineConfig({
    testDir: "./tests",
    timeout: 30_000,
    fullyParallel: false,
    workers: 1,
    reporter: "line",
    use: {
        baseURL: "http://127.0.0.1:5173",
        channel: "chrome",
        headless: true,
    },
    webServer: [
        {
            command: [
                "cd ../../backend &&",
                "DATA_DIR=/tmp/shareboard-e2e-data",
                "SESSION_SECRET=e2e-secret",
                "CORS_ORIGINS=http://127.0.0.1:5173",
                "PYTHONDONTWRITEBYTECODE=1",
                "venv/bin/uvicorn app.main:app",
                "--host 127.0.0.1",
                "--port 8000",
            ].join(" "),
            url: "http://127.0.0.1:8000/health",
            reuseExistingServer: false,
            timeout: 30_000,
        },
        {
            command:
                "npm run dev -- --host 127.0.0.1 --port 5173",
            url: "http://127.0.0.1:5173",
            reuseExistingServer: false,
            timeout: 30_000,
        },
    ],
});
