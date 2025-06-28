# Authentication System Documentation

## Overview

The Protein Pipeline now includes a comprehensive user authentication system that secures access to the fine-tuning functionality. Users must register and sign in to access the fine-tuning features.

## Features

### Backend Authentication

- **User Registration**: Create new accounts with username, email, password, full name, and optional institution
- **User Login**: Secure authentication with session management
- **Password Security**: Hashed passwords with salt for security
- **Session Management**: Server-side session handling with Flask sessions
- **Protected Routes**: All fine-tuning endpoints require authentication
- **User Credits System**: Track user credits for resource usage

### Frontend Authentication

- **Modern Login/Register Page**: Clean, responsive design with form validation
- **Authentication Context**: React context for managing user state across the app
- **Protected Routes**: Fine-tuning page requires authentication
- **User Profile Component**: Shows user info, credits, and logout option
- **Automatic Session Restoration**: Remembers logged-in users across browser sessions

## API Endpoints

### Authentication Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Authenticate user and create session
- `POST /api/auth/logout` - Logout user and clear session
- `GET /api/auth/me` - Get current authenticated user
- `POST /api/auth/change-password` - Change user password
- `GET /api/auth/credits` - Get current user's credits

### Protected Fine-tuning Endpoints

All fine-tuning endpoints now require authentication:

- `GET /api/finetune/models/base` - Get available base models
- `GET /api/finetune/models/user/current` - Get current user's models
- `GET /api/finetune/jobs/user/current` - Get current user's jobs
- `POST /api/finetune/start` - Start fine-tuning job
- `POST /api/finetune/generate` - Generate sequences
- `GET /api/finetune/status/<job_id>` - Get job status
- `DELETE /api/finetune/models/current/<job_id>` - Delete user's model

## Database Schema

### user_account Table

```sql
- user_name (PRIMARY KEY): Unique username
- email (UNIQUE): User's email address
- full_name: User's full name
- hashed_password: Securely hashed password with salt
- institution: Optional institution/organization
- credits: Available credits for API usage
- is_active: Account status (active/inactive)
- created_at: Account creation timestamp
- updated_at: Last modification timestamp
```

## Security Features

### Password Security
- Minimum 8 characters
- Must contain uppercase, lowercase, and numbers
- Hashed with SHA-256 and random salt
- Salt stored with hash for verification

### Session Security
- Server-side session storage
- Session-based authentication
- Automatic session expiration
- CORS configured for secure cross-origin requests

### Access Control
- Users can only access their own data
- API endpoints validate user ownership
- Protected routes require valid session

## Frontend Components

### AuthPage
- Combined login and registration form
- Input validation and error handling
- Responsive design with modern UI
- Password visibility toggle

### AuthContext
- React context for user state management
- Automatic authentication checking
- Session restoration on app load
- User logout functionality

### ProtectedRoute
- Wrapper component for protected pages
- Redirects to login if not authenticated
- Shows loading state during auth check

### UserProfile
- User information display
- Credits balance
- Logout functionality
- Settings access (future feature)

## Usage

### For Users

1. **Registration**: Visit the fine-tuning page and click "Create Account"
2. **Login**: Enter username and password to access fine-tuning features
3. **Fine-tuning**: Once logged in, access all fine-tuning functionality
4. **Logout**: Use the user profile dropdown to sign out

### For Developers

1. **Database Setup**: The system uses SQL Server for user authentication
2. **Authentication**: Import and use `useAuth()` hook in components
3. **Protected Routes**: Wrap components with `<ProtectedRoute>`
4. **API Calls**: All fine-tuning API calls now include authentication

## Environment Setup

### Database
- Uses SQL Server as configured in the database connection settings
- Database tables created automatically using the schema.sql file
- Supports full SQL Server features and security

### Configuration
- Configure SQL Server connection in environment variables
- Set SQL_SERVER, SQL_DATABASE, SQL_USERNAME, SQL_PASSWORD as needed
- Uses SQL Server authentication or Windows authentication

## Migration Notes

### From Previous Version
- Old user ID input system removed
- Fine-tuning now uses authenticated user automatically
- Session-based authentication replaces manual user ID entry
- All existing fine-tuning functionality preserved

### Breaking Changes
- Fine-tuning page now requires authentication
- API endpoints require valid session
- User ID parameter removed from frontend forms

## Future Enhancements

- Password reset functionality
- Email verification
- User settings management
- Role-based access control
- OAuth integration
- Credit purchase system
