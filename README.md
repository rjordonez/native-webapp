# Teacher Reports Processing System

This system helps process and analyze teacher reports that haven't been properly processed through the main system. It includes functionality for both pending reports and zero-score reports.

## Prerequisites

- Node.js installed on your system
- Access to the Supabase database
- Local development backend server running

## Environment Setup

1. Create a `.env` file in the root directory with the following variables:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Development Backend Server

Before processing reports, you need to start the development backend server:

```bash
# Start the development backend server
npm run dev:backend
# or
yarn dev:backend
```

The backend server should be running on `http://localhost:8081` for the report processing to work correctly.

## Available Scripts

### 1. Check for Pending Reports

This script checks for reports that haven't been processed yet:

```bash
# Check for pending reports
npm run check-reports
# or
yarn check-reports

# Check for zero-score reports
npm run check-reports -- --0
# or
yarn check-reports -- --0
```

This will generate either `pending-reports.json` or `zero-score-reports.json` depending on the command used.

### 2. Process Reports

After checking for reports, you can process them using:

```bash
# Process all pending reports
npm run process-reports -- --all
# or
yarn process-reports -- --all

# Process reports for a specific teacher
npm run process-reports -- teacher_id_here
# or
yarn process-reports -- teacher_id_here

# Process zero-score reports
npm run process-reports -- --all --zero
# or
yarn process-reports -- --all --zero
```

## Report Processing Flow

1. First, run the check script to identify pending or zero-score reports
2. Review the generated JSON file to ensure the reports are correct
3. Start the development backend server
4. Run the process script to analyze and process the reports

## Troubleshooting

- If you encounter any errors, ensure the development backend server is running
- Check that your Supabase credentials are correctly set in the `.env` file
- Verify that the generated report files exist before running the process script
- Make sure you have proper permissions to access the Supabase database

## File Structure

- `scripts/checkPendingReports.ts` - Script to identify pending/zero-score reports
- `scripts/processTeacherReports.ts` - Script to process the identified reports
- Generated report files:
  - `pending-reports.json` - Contains pending reports
  - `zero-score-reports.json` - Contains zero-score reports

## Test Workflow

The system includes Playwright end-to-end tests that cover the main user workflows:

1. **Create Assignment** (`create.spec.ts`):
   - Logs in as a teacher
   - Creates a new assignment with title and due date
   - Saves and assigns the assignment

2. **Record Responses** (`record.spec.ts`):
   - Logs in as a student
   - Finds and starts an assignment
   - Records responses for multiple questions
   - Submits the assignment

3. **Rerecord Responses** (`rerecord.spec.ts`):
   - Logs in as a student
   - Finds an existing assignment submission
   - Rerecords responses for specific questions
   - Submits the updated assignment

To run the Playwright tests:
```bash
npx playwright test
# or to run a specific test file
npx playwright test src/tests/e2e/record.spec.ts
```

Note: The tests require the development server to be running on `http://localhost:8080` and proper microphone permissions for recording tests.
