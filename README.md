# Workcohol Trading Platform

A real-time trading platform built with Next.js, Python, and WebSocket integration for live market data visualization.

## Features

- Real-time trading chart with candlestick patterns
- Live market data updates via Binance WebSocket
- User authentication system
- Trade management and tracking
- Responsive design with Tailwind CSS
- Dark theme optimized for trading
- Interactive chart controls (zoom, scroll, fit content)

## Tech Stack

### Frontend
- Next.js 13+ (App Router)
- TypeScript
- Tailwind CSS
- Lightweight Charts™
- WebSocket for real-time data
- Shadcn UI components

### Backend
- Python
- Flask
- SQLAlchemy
- PostgreSQL

## Prerequisites

- Node.js 16.8 or later
- Python 3.11 or later
- PostgreSQL database

## Getting Started

1. Clone the repository:
```bash
git clone [repository-url]
cd workcohol
```

2. Install frontend dependencies:
```bash
npm install
```

3. Set up Python virtual environment:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
```

4. Set up environment variables:
Create a `.env.local` file in the root directory and add:
```
DATABASE_URL=your_database_url
NEXT_PUBLIC_API_URL=http://localhost:5000
```

5. Start the development servers:

Frontend:
```bash
npm run dev
```

Backend:
```bash
cd backend
python app.py
```

## Project Structure

- `/app` - Next.js pages and API routes
- `/backend` - Python Flask backend
- `/components` - React components
- `/contexts` - React context providers
- `/hooks` - Custom React hooks
- `/lib` - Utility functions
- `/public` - Static assets

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details

## Acknowledgments

- [Lightweight Charts™](https://tradingview.github.io/lightweight-charts/) by TradingView
- [Binance WebSocket API](https://binance-docs.github.io/apidocs/spot/en/)