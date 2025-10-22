# 🎯 Router Configuration - מיר Project

## 📁 File Structure

```
backendapp/
└── realtime/
    └── router.py          # 📋 Centralized Router Configuration
```

## 🚀 Usage

The centralized router configuration file (`backendapp/realtime/router.py`) contains all API routes organized by functionality, similar to Django's `urls.py` pattern.

### 🔧 How it works:

1. **Import individual routers** from each module
2. **Organize routes by functionality** with clear prefixes
3. **Include all routers** in the main router
4. **Document all endpoints** for easy reference

### 📋 Route Categories:

- **Authentication & Users** (`/api/auth`, `/api/users`)
- **Event Management** (`/api/events`, `/api/permissions`)
- **Guest Management** (`/api/guests`)
- **Table & Seating** (`/api/tables`, `/api/table-heads`, `/api/seatings`)
- **Communication** (`/api/greetings`)
- **Real-time & Bot** (`/api/realtime`, `/api/bot`)
- **System & Audit** (`/api/audit`)

### 🔄 Integration:

The main application (`backend/app/main.py`) imports and uses this centralized router:

```python
from backendapp.realtime.router import router
app.include_router(router)
```

### 📖 Documentation:

Each route category includes comprehensive documentation with:
- HTTP methods (GET, POST, PUT, DELETE)
- Endpoint paths
- Purpose descriptions
- Parameter requirements

### ✨ Benefits:

- **Centralized management** of all routes
- **Clear organization** by functionality
- **Easy maintenance** and updates
- **Comprehensive documentation**
- **Django-like structure** for familiarity

---

*This configuration follows FastAPI best practices while maintaining a Django-like URL structure for easy understanding and maintenance.*
