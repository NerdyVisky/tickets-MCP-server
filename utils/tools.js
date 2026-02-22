// tools.js

export function getToolsList() {
  return {
    tools: [
      {
        name: 'logRequest',
        description: 'Log a new patient request/ticket to the system',
        inputSchema: {
          type: 'object',
          properties: {
            patientID: {
              type: 'string',
              description: 'Patient ID (e.g., P001)'
            },
            rawRequest: {
              type: 'string',
              description: 'The raw/original request text from the patient'
            },
            requestSummary: {
              type: 'string',
              description: 'A brief summary of the request'
            },
            assignedDepartment: {
              type: 'string',
              description: 'Department to handle the request (e.g., nursing, hospitality, maintenance)',
              enum: ['nursing', 'hospitality', 'maintenance', 'medical', 'other']
            },
            priority: {
              type: 'string',
              description: 'Priority level of the request',
              enum: ['low', 'normal', 'high', 'urgent']
            }
          },
          required: ['patientID', 'rawRequest', 'requestSummary', 'assignedDepartment', 'priority']
        }
      }
    ]
  };
}

export async function handleToolCall(server, name, args) {
  try {
    switch (name) {
      case 'logRequest':
        const { patientID, rawRequest, requestSummary, assignedDepartment, priority } = args;
        
        // Validate required fields
        if (!patientID || !rawRequest || !requestSummary || !assignedDepartment || !priority) {
          throw new Error('Missing required fields');
        }

        const newTicket = await server.logRequest(
          patientID,
          rawRequest,
          requestSummary,
          assignedDepartment,
          priority
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Request logged successfully',
                ticket: newTicket
              }, null, 2)
            }
          ]
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message
          }, null, 2)
        }
      ],
      isError: true
    };
  }
}
