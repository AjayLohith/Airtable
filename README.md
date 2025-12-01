# Airtable-Connected Dynamic Form Builder

A full-stack MERN application that allows users to create dynamic forms connected to Airtable bases, with conditional logic, real-time validation, and automatic synchronization via webhooks.

## Tech Stack

- **Frontend**: React (Vite), JavaScript, Axios
- **Backend**: Node.js + Express, JavaScript
- **Database**: MongoDB
- **Auth**: Airtable OAuth 2.0
- **Deployment**: Frontend (Vercel/Netlify), Backend (Render/Railway)

## Features

- ✅ Airtable OAuth authentication with token refresh
- ✅ Dynamic form builder based on Airtable table fields
- ✅ Conditional logic (show/hide fields based on answers)
- ✅ Form submission to Airtable with validation
- ✅ Response tracking in MongoDB
- ✅ Webhook support for Airtable record updates/deletes
- ✅ Real-time conditional field visibility
- ✅ Support for: text, long text, single select, multi-select, attachments

## Project Structure

```
.
├── backend/
│   ├── models/          # MongoDB models (User, Form, Response)
│   ├── routes/          # Express routes (auth, forms, webhooks)
│   ├── utils/           # Utilities (Airtable API, conditional logic)
│   ├── middleware/      # Auth middleware
│   ├── server.js        # Express server entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/       # React pages (Login, Dashboard, FormBuilder, etc.)
│   │   ├── utils/       # Client-side utilities
│   │   ├── App.jsx      # Main app component
│   │   └── main.jsx     # React entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── sample.env.example   # Environment variables template
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- MongoDB (local or MongoDB Atlas)
- Airtable account with OAuth app created

### 1. Airtable OAuth Setup

1. Go to [Airtable Developers](https://airtable.com/developers/web/guides/oauth-integrations)
2. Create a new OAuth integration
3. Set the redirect URI to: `http://localhost:3000/auth/airtable/callback` (for local dev)
4. Note your Client ID and Client Secret
5. Required scopes: `data.records:read`, `data.records:write`, `schema.bases:read`

### 2. Backend Setup

```bash
cd backend
npm install
cp ../sample.env.example .env
# Edit .env with your values
npm start
# or for development: npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:5173` and proxy API requests to the backend.

### 4. Environment Variables

Copy `sample.env.example` to `backend/.env` and fill in:

- `MONGODB_URI`: Your MongoDB connection string
- `AIRTABLE_CLIENT_ID`: From Airtable OAuth app
- `AIRTABLE_CLIENT_SECRET`: From Airtable OAuth app
- `AIRTABLE_OAUTH_CALLBACK_URL`: `http://localhost:3000/auth/airtable/callback`
- `JWT_SECRET`: Random string for JWT signing
- `BASE_URL`: Backend URL (for webhooks)
- `FRONTEND_URL`: Frontend URL (for redirects)

## Data Models

### User
- `airtableUserId`: Unique Airtable user identifier
- `profile`: User profile from Airtable
- `accessToken`: OAuth access token (encrypted in production)
- `refreshToken`: OAuth refresh token
- `lastLoginAt`: Last login timestamp

### Form
- `ownerUserId`: Reference to User
- `airtableBaseId`: Airtable base ID
- `airtableTableId`: Airtable table ID
- `title`: Form title
- `questions`: Array of question objects with:
  - `questionKey`: Unique identifier (q1, q2, etc.)
  - `airtableFieldId`: Airtable field ID
  - `label`: Display label
  - `type`: Field type (singleLineText, longText, singleSelect, etc.)
  - `required`: Boolean
  - `conditionalRules`: Conditional logic rules (see below)

### Response
- `formId`: Reference to Form
- `airtableRecordId`: Airtable record ID
- `answers`: JSON object with form answers
- `status`: 'active' or 'deletedInAirtable'
- Timestamps: `createdAt`, `updatedAt`

## Conditional Logic

The `shouldShowQuestion` function evaluates whether a field should be visible based on previous answers.

### Rule Structure

```javascript
{
  logic: "AND" | "OR",
  conditions: [
    {
      questionKey: "q1",
      operator: "equals" | "notEquals" | "contains",
      value: "some value"
    }
  ]
}
```

### Behavior

- `rules === null` → field always visible
- `logic: "AND"` → all conditions must be true
- `logic: "OR"` → at least one condition must be true
- Operators:
  - `equals`: Exact match
  - `notEquals`: Not equal
  - `contains`: String contains (works with arrays too)

### Example

Show field `q3` only if `q1` equals "yes" AND `q2` contains "option":

```javascript
{
  questionKey: "q3",
  conditionalRules: {
    logic: "AND",
    conditions: [
      { questionKey: "q1", operator: "equals", value: "yes" },
      { questionKey: "q2", operator: "contains", value: "option" }
    ]
  }
}
```

## Webhook Configuration

1. In Airtable, set up a webhook for your base/table
2. Webhook URL: `https://your-backend-domain.com/webhooks/airtable`
3. Events: `record.created`, `record.updated`, `record.deleted`
4. If Airtable provides webhook signing, set `AIRTABLE_WEBHOOK_SECRET` in `.env`

The webhook handler will:
- Update local responses when Airtable records change
- Mark responses as `deletedInAirtable` when records are deleted (soft delete)

## API Endpoints

### Authentication
- `GET /auth/airtable` - Redirect to Airtable OAuth
- `GET /auth/airtable/callback` - OAuth callback handler
- `GET /auth/me` - Get current user
- `POST /auth/logout` - Logout

### Forms
- `GET /forms/me/bases` - List user's Airtable bases
- `GET /forms/me/bases/:baseId/tables` - List tables in a base
- `GET /forms/me/bases/:baseId/tables/:tableId/fields` - Get table fields
- `POST /forms/forms` - Create a new form
- `GET /forms/forms` - List user's forms
- `GET /forms/forms/:formId` - Get form schema
- `POST /forms/forms/:formId/submit` - Submit form response
- `GET /forms/forms/:formId/responses` - List form responses

### Webhooks
- `POST /webhooks/airtable` - Airtable webhook handler

## Running Tests

```bash
cd backend
npm test
```

Tests cover the `shouldShowQuestion` conditional logic function with various scenarios.

## Deployment

### Backend (Render/Railway)

1. Push code to GitHub
2. Connect repository to Render/Railway
3. Set environment variables
4. Set build command: `cd backend && npm install`
5. Set start command: `cd backend && npm start`
6. Ensure `BASE_URL` points to your deployed backend URL

### Frontend (Vercel/Netlify)

1. Connect repository to Vercel/Netlify
2. Set build command: `cd frontend && npm install && npm run build`
3. Set publish directory: `frontend/dist`
4. Set environment variable: `VITE_API_URL=https://your-backend-domain.com`
5. Update backend `FRONTEND_URL` to your frontend URL
6. Update Airtable OAuth callback URL to: `https://your-backend-domain.com/auth/airtable/callback`

### Production Checklist

- [ ] Update `BASE_URL` to production backend URL
- [ ] Update `FRONTEND_URL` to production frontend URL
- [ ] Update Airtable OAuth callback URL
- [ ] Set secure cookie flags in production
- [ ] Use MongoDB Atlas or secure MongoDB instance
- [ ] Set strong `JWT_SECRET`
- [ ] Configure webhook URL in Airtable
- [ ] Enable HTTPS for both frontend and backend

## Supported Field Types

The app supports these Airtable field types:

- `singleLineText` → Text input
- `multilineText` → Textarea
- `singleSelect` → Dropdown select
- `multipleSelects` → Multi-select checkboxes
- `attachment` → File URL input (public URLs)

Other field types are filtered out during form creation.

## Troubleshooting

**OAuth redirect fails**: Check that callback URL matches exactly in Airtable app settings.

**Token refresh fails**: Ensure `AIRTABLE_CLIENT_SECRET` is correct and tokens haven't been revoked.

**Webhook not working**: Verify webhook URL is accessible and `BASE_URL` is set correctly.

**Form submission fails**: Check that user's access token is valid and has write permissions to the Airtable base.

## License

MIT


