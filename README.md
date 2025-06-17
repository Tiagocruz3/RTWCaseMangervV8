# RTW Case Management System

A comprehensive Return-to-Work case management system built with React, TypeScript, and Supabase.

## Features

- **Case Management**: Complete case lifecycle management with worker and employer information
- **Document Storage**: Secure document upload and management with Supabase Storage
- **Real-time Collaboration**: Live updates and notifications using Supabase real-time
- **AI-Powered Insights**: Case analysis and recommendations using OpenRouter AI
- **PIAWE Calculator**: Jurisdiction-specific Pre-Injury Average Weekly Earnings calculations
- **Stakeholder Management**: Track all case stakeholders including medical providers and legal representatives
- **Communication Logs**: Comprehensive communication tracking and history
- **Supervisor Notes**: Hierarchical feedback and instruction system
- **Quality Control**: Performance monitoring and case quality assurance
- **Reports**: Comprehensive case reporting and analytics

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Real-time)
- **State Management**: Zustand
- **Routing**: React Router v6
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **AI Integration**: OpenRouter API

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account

### Setup

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Set up Supabase**:
   - Create a new Supabase project at [supabase.com](https://supabase.com)
   - Copy your project URL and anon key
   - Run the migration in the Supabase SQL editor:
     ```sql
     -- Copy and paste the contents of supabase/migrations/001_initial_schema.sql
     ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_OPENROUTER_API_KEY=your_openrouter_api_key (optional)
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

### Initial Setup

1. **Create your first user**:
   - Go to your Supabase project dashboard
   - Navigate to Authentication > Users
   - Create a new user with email and password
   - Add a profile record in the `profiles` table with the user's ID

2. **Test the application**:
   - Visit `http://localhost:5173`
   - Log in with your created user credentials
   - Start creating cases and exploring features

## Database Schema

The application uses a comprehensive PostgreSQL schema with the following main tables:

- `profiles` - User profiles and roles
- `cases` - Main case records with worker/employer data
- `communications` - Communication logs
- `documents` - Document storage references
- `case_notes` - Internal case notes
- `supervisor_notes` - Supervisor feedback system
- `stakeholders` - Case stakeholders
- `notifications` - System notifications

All tables include Row Level Security (RLS) policies for secure data access.

## Key Features

### Case Management
- Complete case lifecycle from injury to return-to-work
- Worker and employer information management
- RTW plan creation and tracking
- Review date scheduling and management

### Document Management
- Secure file upload to Supabase Storage
- Document categorization (medical, legal, correspondence)
- File preview and download capabilities
- Automatic file organization by case

### Real-time Features
- Live case updates across multiple users
- Real-time notifications for important events
- Instant communication log updates
- Live supervisor note updates

### AI Integration
- Case analysis and risk assessment
- Intelligent recommendations
- Document text extraction and analysis
- Chat assistant for case queries

### PIAWE Calculator
- Jurisdiction-specific calculations (NSW, VIC, QLD, WA, SA, TAS, NT, ACT)
- Comprehensive payslip data entry
- Validation and compliance checking
- Detailed calculation reports

## Security

- Row Level Security (RLS) on all database tables
- Secure file storage with access controls
- JWT-based authentication via Supabase Auth
- Role-based access control (consultant, admin, support)
- API key protection for external services

## Deployment

The application is designed for easy deployment to platforms like Vercel, Netlify, or any static hosting service:

1. Build the application:
   ```bash
   npm run build
   ```

2. Deploy the `dist` folder to your hosting platform

3. Ensure environment variables are configured in your hosting platform

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.