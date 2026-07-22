# Agro AI ML Service

This repository contains the backend FastAPI service and a React + Vite frontend for plant disease prediction.

## Prerequisites

- Python 3.10
- Node.js + npm

## Backend setup

1. Open a terminal in the project root:
   ```powershell
   cd "e:\ANIket AGRI UPdates\update2\aniket_agri\sunil\ml-service"
   ```

2. Activate the Python 3.10 virtual environment:
   ```powershell
   .\venv310\Scripts\Activate.ps1
   ```

3. Install backend dependencies (if not already installed):
   ```powershell
   python -m pip install -r requirements.txt
   ```

4. Make sure your `.env` file contains the required settings:
   ```text
   OPENROUTER_API_KEY=your_openrouter_api_key
   OPENROUTER_MODEL=your_openrouter_model
   ```

5. Run the backend server:
   ```powershell
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --env-file .env
   ```

The backend will be available at:

- `http://127.0.0.1:8000`
- API root: `http://127.0.0.1:8000/api/v1`

## Frontend setup

1. Open a new terminal in the frontend folder:
   ```powershell
   cd e:\aniket_agri\sunil\ml-service\frontend
   ```

2. Install the frontend dependencies:
   ```powershell
   npm install
   ```

3. Start the frontend development server:
   ```powershell
   npm run dev
   ```

The frontend will be available at:

- `http://localhost:5173`

It is configured to proxy API requests to the backend at `http://127.0.0.1:8000`.

## Running both together

1. Start the backend first.
2. Then start the frontend.
3. Open the frontend app at `http://localhost:5173`.

## Notes

- If the backend fails due to missing environment variables, add them to `.env` in the project root.
- Use `http://127.0.0.1:8000` or `http://localhost:8000` in the browser instead of `0.0.0.0`.
