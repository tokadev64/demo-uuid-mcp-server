#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, } from '@modelcontextprotocol/sdk/types.js';
import { v4 as uuidv4 } from 'uuid';
class UuidServer {
    constructor() {
        this.server = new Server({
            name: 'uuid-mcp-server',
            version: '1.0.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.setupToolHandlers();
        // Error handling
        this.server.onerror = (error) => console.error('[MCP Error]', error);
        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });
    }
    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'generate_uuid',
                    description: 'Generate a UUID v4',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            count: {
                                type: 'number',
                                description: 'Number of UUIDs to generate (default: 1)',
                                minimum: 1,
                                maximum: 100,
                            },
                            uppercase: {
                                type: 'boolean',
                                description: 'Whether to return UUIDs in uppercase (default: false)',
                            },
                            hyphens: {
                                type: 'boolean',
                                description: 'Whether to include hyphens in the UUIDs (default: true)',
                            }
                        },
                        required: [],
                    },
                },
            ],
        }));
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            if (request.params.name !== 'generate_uuid') {
                throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
            }
            const args = request.params.arguments;
            const count = Math.min(args.count || 1, 100);
            const uppercase = args.uppercase || false;
            const includeHyphens = args.hyphens !== false; // Default to true
            try {
                const uuids = [];
                for (let i = 0; i < count; i++) {
                    let uuid = uuidv4();
                    if (!includeHyphens) {
                        uuid = uuid.replace(/-/g, '');
                    }
                    if (uppercase) {
                        uuid = uuid.toUpperCase();
                    }
                    uuids.push(uuid);
                }
                const result = count === 1 ? uuids[0] : uuids;
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(result, null, 2),
                        },
                    ],
                };
            }
            catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error generating UUID: ${error instanceof Error ? error.message : String(error)}`,
                        },
                    ],
                    isError: true,
                };
            }
        });
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('UUID MCP server running on stdio');
    }
}
const server = new UuidServer();
server.run().catch(console.error);
