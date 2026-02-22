#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getToolsList, handleToolCall } from './utils/tools.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

class TicketsServer {
  constructor() {
    this.tickets = [];
    this.pidMap = {};
    this.ticketsPath = path.join(__dirname, 'mock_tickets_data.json');
    this.pidMapPath = path.join(__dirname, 'pid_to_map.json');
  }

  async loadData() {
    try {
      const ticketsContent = await fs.readFile(this.ticketsPath, 'utf-8');
      this.tickets = JSON.parse(ticketsContent);
      
      const pidMapContent = await fs.readFile(this.pidMapPath, 'utf-8');
      this.pidMap = JSON.parse(pidMapContent);
    } catch (error) {
      console.error('Error loading data:', error.message);
      this.tickets = [];
      this.pidMap = {};
    }
  }

  async saveTickets() {
    try {
      await fs.writeFile(
        this.ticketsPath,
        JSON.stringify(this.tickets, null, 4),
        'utf-8'
      );
    } catch (error) {
      console.error('Error saving tickets:', error.message);
      throw error;
    }
  }

  getNextLogId() {
    if (this.tickets.length === 0) return 1;
    return Math.max(...this.tickets.map(t => t.logId)) + 1;
  }

  async logRequest(patientID, rawRequest, requestSummary, assignedDepartment, priority) {
    // Validate patientID exists in pid_to_map
    if (!this.pidMap[patientID]) {
      throw new Error(`Patient ID ${patientID} not found in system`);
    }

    const patientInfo = this.pidMap[patientID];
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '+00');

    const newTicket = {
      logId: this.getNextLogId(),
      patient_id: patientID,
      room: patientInfo.room,
      requestSummary,
      rawRequest,
      status: 'open',
      assignedDepartment,
      assignedNurseID: patientInfo.nurse,
      priority,
      created_at: now,
      updated_at: now
    };

    this.tickets.push(newTicket);
    await this.saveTickets();

    return newTicket;
  }
}

// MCP Protocol Implementation
async function handleMCPRequest(server, request) {
  const { method, params } = request;

  switch (method) {
    case 'initialize':
      return {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: 'tickets-server',
          version: '1.0.0'
        }
      };

    case 'notifications/initialized':
    case 'notifications/message':
      // Notifications don't require a response
      return null;

    case 'tools/list':
      return getToolsList();

    case 'tools/call':
      const { name, arguments: args } = params;
      return await handleToolCall(server, name, args);

    default:
      throw new Error(`Unknown method: ${method}`);
  }
}

// Main server initialization
async function start() {
  const server = new TicketsServer();
  await server.loadData();

  console.log('Tickets MCP Server started');
  console.log(`Loaded ${server.tickets.length} tickets for ${Object.keys(server.pidMap).length} patients`);

  // Health check endpoint
  app.get('/', (req, res) => {
    res.json({
      status: 'ok',
      server: 'tickets-server',
      version: '1.0.0',
      tickets: server.tickets.length,
      patients: Object.keys(server.pidMap).length
    });
  });

  // MCP endpoint
  app.post('/mcp', async (req, res) => {
    try {
      const request = req.body;
      
      // Check if this is a notification (no id field)
      const isNotification = !request.hasOwnProperty('id');
      
      const result = await handleMCPRequest(server, request);

      // Only send a response if it's not a notification
      if (!isNotification && result !== null) {
        res.json({
          jsonrpc: '2.0',
          id: request.id,
          result
        });
      } else if (!isNotification) {
        // Method returned null but it's not a notification - still send empty response
        res.json({
          jsonrpc: '2.0',
          id: request.id,
          result: {}
        });
      } else {
        // Notification - send 204 No Content
        res.status(204).end();
      }
    } catch (error) {
      console.error('Error processing MCP request:', error.message);
      
      // Only send error response if it's not a notification
      const isNotification = !req.body?.hasOwnProperty('id');
      if (!isNotification) {
        res.status(500).json({
          jsonrpc: '2.0',
          id: req.body?.id ?? null,
          error: {
            code: -32603,
            message: error.message || 'Internal error'
          }
        });
      } else {
        // Notification failed - log but don't respond
        res.status(204).end();
      }
    }
  });

  const PORT = process.env.PORT || 3001;

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 MCP endpoint: http://localhost:${PORT}/mcp`);
    console.log(`❤️  Health check: http://localhost:${PORT}/`);
  });
}

start().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
