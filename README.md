# Tickets Server - MCP Implementation

A Model Context Protocol (MCP) server for logging and managing patient requests and tickets in a healthcare setting.

## Overview

The Tickets Server provides a simple API for logging patient requests, automatically extracting room and nurse assignments from patient mappings, and maintaining a database of open tickets.

## Features

- **Single Tool**: `logRequest` - Log new patient requests/tickets
- **Automatic Assignment**: Extracts room and nurse information from patient ID mappings
- **Status Tracking**: Initializes tickets with "open" status and timestamps
- **Unique IDs**: Auto-generates unique log IDs for each ticket
- **Persistent Storage**: Saves all tickets to JSON file

## Installation

```bash
npm install
```

## Running the Server

```bash
npm start
```

The server runs on port 3001 by default.

## Endpoints

### Health Check
```bash
GET http://localhost:3001/
```

Returns server status and ticket counts.

### MCP Endpoint
```bash
POST http://localhost:3001/mcp
```

JSON-RPC 2.0 endpoint for MCP protocol communication.

## MCP Tool: logRequest

Log a new patient request to the system.

### Parameters

- **patientID** (required): Patient identifier (e.g., "P001")
- **rawRequest** (required): The original request text from the patient
- **requestSummary** (required): Brief summary of the request
- **assignedDepartment** (required): Department to handle request
  - Options: `nursing`, `hospitality`, `maintenance`, `medical`, `other`
- **priority** (required): Request priority level
  - Options: `low`, `normal`, `high`, `urgent`

### Example Request

```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "logRequest",
      "arguments": {
        "patientID": "P001",
        "rawRequest": "I need help adjusting my bed position",
        "requestSummary": "Patient needs bed position adjustment",
        "assignedDepartment": "nursing",
        "priority": "normal"
      }
    }
  }'
```

### Response Format

```json
{
  "success": true,
  "message": "Request logged successfully",
  "ticket": {
    "logId": 5,
    "patient_id": "P001",
    "room": "201A",
    "requestSummary": "Patient needs bed position adjustment",
    "rawRequest": "I need help adjusting my bed position",
    "status": "open",
    "assignedDepartment": "nursing",
    "assignedNurseID": "nurse_anna",
    "priority": "normal",
    "created_at": "2026-02-22 05:37:44.428+00",
    "updated_at": "2026-02-22 05:37:44.428+00"
  }
}
```

## Data Files

### mock_tickets_data.json
Contains all logged tickets with the following structure:
- `logId`: Unique ticket identifier
- `patient_id`: Patient ID
- `room`: Patient's room (auto-extracted)
- `requestSummary`: Brief summary
- `rawRequest`: Original request text
- `status`: Current status (`open`, `acknowledged`, `completed`)
- `assignedDepartment`: Department handling the request
- `assignedNurseID`: Assigned nurse (auto-extracted)
- `priority`: Priority level
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

### pid_to_map.json
Maps patient IDs to their room numbers and assigned nurses:
```json
{
  "P001": {
    "room": "201A",
    "nurse": "nurse_anna"
  }
}
```

## MCP Protocol Support

- ✅ Initialize
- ✅ Tools (list, call)
- ✅ Notifications handling
- ✅ JSON-RPC 2.0 compliant
- ✅ Proper error handling

## Error Handling

- Invalid patient IDs are rejected with descriptive error messages
- Missing required fields return validation errors
- All errors are logged and returned in MCP-compliant format

## Architecture

Built following the same structure as the mock-ehr-server:
- Express.js HTTP server
- CORS enabled
- Modular tools in `utils/tools.js`
- JSON file-based persistence
- MCP protocol compliance

## Development

```bash
npm run dev
```

Runs the server with auto-reload on file changes.
