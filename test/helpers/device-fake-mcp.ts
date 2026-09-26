// A tiny stand-in for mobile-mcp over stdio, so McpDevice's plumbing (queueing, error detection, retry, respawn
// after a hang) can be tested without an emulator. It answers the same tool names with the same text shapes.
//
// Behaviour switches come as one JSON argument (the client only forwards an allowlist of env vars):
//   log         file to append one JSON line per call ({tool, args})
//   devices     JSON text for the device list (default: one Android emulator)
//   hangMarker  if the file does not exist: create it, then hang forever on the first mobile_get_foreground_app
//               (blocks the event loop, like mobile-mcp stuck in execFileSync)
//   hangTool    this tool hangs on every call
//   flakyTool   this tool answers with an "actionable" text error (no isError) on its first call
import fs from "node:fs";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const TOOLS = [
  "mobile_list_available_devices", "mobile_get_screen_size", "mobile_list_elements_on_screen", "mobile_get_foreground_app",
  "mobile_save_screenshot", "mobile_click_on_screen_at_coordinates", "mobile_type_keys", "mobile_press_button",
  "mobile_swipe_on_screen", "mobile_launch_app", "mobile_terminate_app",
];

const ELEMENTS = [
  { ref: "@e1", type: "android.widget.TextView", text: "Home", coordinates: { x: 42, y: 150, width: 300, height: 80 }, selected: true },
  { ref: "@e2", type: "android.widget.Button", text: "", label: "Send", identifier: "com.example.fake:id/send", coordinates: { x: 930, y: 2210, width: 110, height: 110 }, enabled: false },
  { ref: "@e3", type: "android.widget.EditText", text: "", coordinates: { x: 30, y: 2200, width: 880, height: 120 }, focused: true },
];

// 1x1 transparent PNG
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

export interface FakeMcpConfig { log?: string; devices?: string; hangMarker?: string; hangTool?: string; flakyTool?: string }
const cfg = JSON.parse(process.argv[2] || "{}") as FakeMcpConfig;
let flakyCalls = 0;
const text = (t: string) => ({ content: [{ type: "text", text: t }] });

function hangForever(): never {
  // Block the whole process, exactly like the real server blocked in execFileSync.
  const cell = new Int32Array(new SharedArrayBuffer(4));
  for (;;) Atomics.wait(cell, 0, 0);
}

const server = new Server({ name: "fake-mobile-mcp", version: "0.0.1" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map(name => ({ name, description: name, inputSchema: { type: "object" as const, properties: {} } })),
}));

server.setRequestHandler(CallToolRequestSchema, async req => {
  const tool = req.params.name;
  const args = (req.params.arguments ?? {}) as Record<string, unknown>;
  if (cfg.log) fs.appendFileSync(cfg.log, JSON.stringify({ tool, args }) + "\n");
  if (cfg.hangTool === tool) hangForever();
  if (cfg.flakyTool === tool && flakyCalls++ === 0) return text("Device is busy. Please fix the issue and try again.");
  switch (tool) {
    case "mobile_list_available_devices":
      return text(cfg.devices ?? JSON.stringify({ devices: [{ id: "emulator-5554", name: "Pixel 8", platform: "android", type: "emulator", version: "15", state: "online" }] }));
    case "mobile_get_screen_size":
      return text("Screen size is 1080x2400 pixels");
    case "mobile_list_elements_on_screen":
      return text(`Found these elements on screen: ${JSON.stringify(ELEMENTS)}`);
    case "mobile_get_foreground_app": {
      const marker = cfg.hangMarker;
      if (marker && !fs.existsSync(marker)) { fs.writeFileSync(marker, "hung"); hangForever(); }
      return text("Foreground app: Fake App (com.example.fake)");
    }
    case "mobile_save_screenshot":
      fs.writeFileSync(String(args.saveTo), PNG);
      return text(`Screenshot saved to: ${args.saveTo}`);
    case "mobile_click_on_screen_at_coordinates":
      return text(`Clicked on screen at coordinates: ${args.x}, ${args.y}`);
    case "mobile_type_keys":
      return text(`Typed text: ${args.text}`);
    case "mobile_press_button":
      return text(`Pressed the button: ${args.button}`);
    case "mobile_swipe_on_screen":
      return text(`Swiped ${args.direction} from (${args.x}, ${args.y}) by ${args.distance}`);
    case "mobile_launch_app":
      return text(`Launched app ${args.packageName}`);
    case "mobile_terminate_app":
      return text(`Terminated app ${args.packageName}`);
    default:
      return { content: [{ type: "text", text: `Error: unknown tool ${tool}` }], isError: true };
  }
});

process.stderr.write("fake-mobile-mcp running on stdio\n");
await server.connect(new StdioServerTransport());
