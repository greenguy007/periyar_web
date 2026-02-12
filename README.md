# Periyar Scale Dashboard

Simple, user-friendly web dashboard for real-time weight monitoring and recording.

## 🎯 Features

- ✅ Real-time weight display
- ✅ Auto-detection of stable weight (3-5 seconds)
- ✅ Start/Stop recording sessions
- ✅ Data table with S.No, Weight, Date, Time
- ✅ Session total and item count
- ✅ Export to CSV
- ✅ Clean, professional design
- ✅ Mobile responsive

## 🚀 Quick Start

1. **Open `index.html` in a web browser**
2. **Click "Connect"** to connect to server
3. **Click "Start Recording"** to begin session
4. Place items on scale - system auto-records when weight is stable
5. **Click "Stop Recording"** to end session and see total
6. **Export CSV** to download data

## ⚙️ Settings

- **WebSocket Server URL:** Default is production server
- **Stability Time:** How long weight must be stable (1-10 seconds)
- **Stability Threshold:** Maximum variation allowed (1-100 grams)

## 📊 How It Works

1. Dashboard connects to WebSocket server
2. Server sends real-time weight data from ESP32
3. System monitors weight for stability
4. When weight is stable for set time, it auto-records
5. Each stable weight adds a new row to table
6. Total and count updated in real-time
7. Export all data to CSV when done

## 🌐 Deployment

### Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd dashboard
vercel
```

Or use Vercel website:
1. Go to vercel.com
2. Import project
3. Deploy

### Deploy to Netlify

1. Drag and drop the `dashboard` folder to Netlify
2. Done!

## 🔧 Configuration

Default server: `wss://backend-server-periyar.onrender.com/ws`

To use different server, update the URL in settings.

## 📱 Browser Support

- ✅ Chrome/Edge (Recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers

## 📝 License

MIT
