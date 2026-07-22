Deploy notes — serve frontend static + proxy to backend

1) Build the frontend

```bash
cd sunil/ml-service/frontend
npm install
npm run build
```

2) Copy the built files to a web root

```bash
sudo mkdir -p /var/www/myapp
sudo cp -r dist/* /var/www/myapp/
sudo chown -R www-data:www-data /var/www/myapp
```

3) Backend (recommended: run with Gunicorn + Uvicorn workers)

Install Python deps and run:

```bash
cd sunil/ml-service
python -m pip install -r requirements.txt
pip install gunicorn uvicorn

# development (simple)
uvicorn app.main:app --host 127.0.0.1 --port 8000

# production (recommended)
gunicorn -k uvicorn.workers.UvicornWorker -w 4 app.main:app --bind 127.0.0.1:8000
```

4) Example `systemd` unit (save as `/etc/systemd/system/agro-ml.service`)

```
[Unit]
Description=Agro AI ML Service
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/home/username/path/to/sunil/ml-service
Environment=PATH=/home/username/path/to/venv/bin
ExecStart=/home/username/path/to/venv/bin/gunicorn -k uvicorn.workers.UvicornWorker -w 4 app.main:app -b 127.0.0.1:8000
Restart=always

[Install]
WantedBy=multi-user.target
```

5) Enable nginx config

Place `deploy/nginx.conf` into your nginx sites-available (or adapt) and enable:

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/myapp
sudo ln -s /etc/nginx/sites-available/myapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Notes:
- This repo also supports mounting the built frontend from the backend when `frontend/dist` exists; see `app/main.py`.
- Replace paths and usernames above with your server-specific values.
