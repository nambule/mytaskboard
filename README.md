# My Task Board

A modern, full-featured task management application built with React, Supabase, and TailwindCSS. Features a clean, professional interface with advanced task management capabilities and real-time collaboration.

## ✨ Features

### Core Functionality
- 🎯 **Drag & Drop Task Board** - Intuitive task management with smooth animations
- 📊 **Multiple View Modes** - Group tasks by compartment, priority, or status
- 🔍 **Advanced Filtering** - Filter by priority, status with quick reset options
- ⚡ **Quick Tasks** - Express task creation for rapid capture
- 📝 **Rich Task Details** - Comprehensive task information with progress tracking
- 🎨 **Multiple Display Modes** - Compact, Standard, and Full view options
- 🌙 **Dark Mode** - Beautiful dark theme with smooth transitions

### Task Management
- ✅ **Subtasks** - Break down complex tasks with completion tracking (X/Y format)
- 📅 **Due Dates** - Visual indicators with overdue highlighting
- ⚠️ **Risk Flagging** - Mark tasks as at-risk with warning indicators  
- 📊 **Progress Tracking** - Visual progress bars with percentage completion
- 📋 **Task Notes** - Internal notes and documentation
- ⏰ **Time Planning** - "When" scheduling with color-coded indicators
- 🗓️ **Macro Planning** - Weekly roadmap with 1, 3, 6, 12 and 24-month zoom levels
- 🟪 **Planning Periods** - Independent movable and resizable time windows on a shared timeline
- 🏷️ **Priority System** - 5-level priority system (P1-P5) with visual badges
- 📏 **Size Estimation** - T-shirt sizing (S, M, L, XL, XXL)

### User Experience
- 🔐 **Authentication** - Secure user accounts with Supabase Auth
- 💾 **Real-time Sync** - Automatic saving with cloud persistence
- 📱 **Responsive Design** - Works beautifully on all screen sizes
- ⌨️ **Keyboard Navigation** - Full keyboard support for accessibility
- 🎭 **Theme Switching** - Light/dark mode with persistent preferences

## 🏗️ Architecture

The application follows modern React best practices with a clean, modular architecture:

```
src/
├── components/              # Reusable UI components
│   ├── ui/                 # Base UI components
│   │   ├── Select.jsx      # Custom select dropdown
│   │   └── DateRangePicker.jsx # Date range picker
│   ├── TaskCard.jsx        # Individual task display
│   ├── TaskModal.jsx       # Task creation/editing modal
│   ├── QuickTasksModal.jsx # Quick task creation
│   ├── AuthModal.jsx       # Authentication modal
│   └── AccountMenu.jsx     # User account management
├── hooks/                  # Custom React hooks
│   ├── useTasks.js         # Task management logic
│   ├── useQuickTasks.js    # Quick tasks management
│   └── useAuth.js          # Authentication logic
├── services/               # API and external services
│   ├── supabase.js         # Supabase client configuration
│   └── taskService.js      # Task CRUD operations
├── utils/                  # Utilities and helpers
│   ├── constants.js        # App-wide constants
│   └── helpers.js          # Utility functions
└── App.jsx                # Main application component
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Supabase account

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <your-repo-url>
   cd my-task-board
   npm install
   ```

2. **Set up Supabase:**
   - Create a new project at [Supabase](https://supabase.com)
   - Run the SQL schema files in the Supabase SQL editor:
     - `supabase-schema.sql` (main tables)
     - `supabase-setup.sql` (additional setup)
     - `migration-planning-view.sql` (task planning dates and reminders)
     - `migration-planning-periods.sql` (independent planning periods)
     - `migration-user-preferences.sql` (interface preferences synchronized between browsers)
   - Copy `.env.example` to `.env` and add your credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:5173`

## 📊 Database Schema

### Main Tables

**`tasks`** - Primary task storage:
```sql
- id (UUID, Primary Key)
- title (TEXT) - Task title
- priority (TEXT) - P1, P2, P3, P4, P5
- compartment (TEXT) - PM, CPO, FER, NOVAE, MRH, CDA
- status (TEXT) - To Do, To Analyze, In Progress, Done
- size (TEXT) - S, M, L, XL, XXL
- note (TEXT) - Internal notes
- when (TEXT) - Time planning
- due_date (DATE) - Due date
- start_date (DATE) - Start date
- planning_start_date (DATE) - Weekly roadmap start
- planning_end_date (DATE) - Weekly roadmap end
- hours (NUMERIC) - Estimated hours
- time_allocation (TEXT) - one shot, per week, per 2 weeks
- flagged (BOOLEAN) - Risk flag
- subtasks (JSONB) - Subtasks array
- completion (INTEGER) - Progress percentage (0-100)
- user_id (UUID) - User reference
- created_at, updated_at (TIMESTAMP)
```

**`quick_tasks`** - Quick task capture:
```sql
- id (UUID, Primary Key)
- title (TEXT) - Task title
- user_id (UUID) - User reference
- created_at (TIMESTAMP)
```

## 🎨 Customization

### View Modes
- **Compact**: Title + Priority + Progress only
- **Standard**: All elements except "when" selector
- **Full**: All elements including interactive "when" planning

### Theme System
- **Light Mode**: Clean, professional appearance
- **Dark Mode**: Easy on the eyes with high contrast
- **System Integration**: Respects user OS preferences

### Color Coding
All colors and styles are centralized in `src/utils/constants.js`:
- Priority colors (P1-P5)
- Status colors (To Do, In Progress, etc.)
- Compartment colors (PM, CPO, etc.)
- Size indicators
- Time planning colors

## 🛠️ Development

### Key Hooks

- **`useTasks()`**: Complete task management (CRUD, drag & drop, filtering)
- **`useQuickTasks()`**: Quick task capture and classification
- **`useAuth()`**: User authentication and session management

### Core Services

- **`taskService`**: Supabase API interface for all task operations
- **`supabase`**: Configured client with authentication

### Component Architecture

- **Modular Design**: Each component has a single responsibility
- **Prop Drilling Avoided**: Uses custom hooks for state management
- **Performance Optimized**: Memoization and efficient re-renders
- **Accessible**: Full keyboard navigation and screen reader support

## 🔒 Security & Authentication

- **Row Level Security (RLS)**: Supabase policies ensure users only see their own data
- **JWT Authentication**: Secure, stateless authentication
- **SQL Injection Protection**: Parameterized queries through Supabase client
- **CORS Configured**: Proper cross-origin request handling

## 📱 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on every push

### Manual Deployment
```bash
npm run build
# Upload dist/ folder to your hosting provider
```

## 🎯 Usage Tips

### Workflow Optimization
1. **Start with Quick Tasks** - Capture ideas rapidly
2. **Classify Quick Tasks** - Convert to full tasks when ready
3. **Use View Modes** - Switch between compact/full based on needs
4. **Leverage Filtering** - Focus on what matters most
5. **Track Progress** - Update completion percentages regularly

### Keyboard Shortcuts
- **Enter/Space**: Open task details when focused
- **Escape**: Close modals and dropdowns
- **Tab**: Navigate through interface elements

## 🤝 Contributing

This is a professional task management application. For feature requests or bug reports:

1. Check existing issues
2. Create detailed bug reports with steps to reproduce
3. Suggest improvements with clear use cases
4. Follow the existing code style and architecture

## 📄 License

This project is private and proprietary. All rights reserved.

## 🆘 Support

For technical support or questions about implementation:
- Review the code documentation
- Check the database schema files
- Examine the component structure in `/src`

---

**Built with ❤️ using React, Supabase, and TailwindCSS**
