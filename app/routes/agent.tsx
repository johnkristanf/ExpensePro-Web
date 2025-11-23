import type { Route } from "./+types/agent";
import { AgentChatbox } from "../agent/agent-chatbox";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ExpensePro" },
    { name: "description", content: "AI Agent Expense Tracker" },
  ];
}

export default function AgentChatRoute() {
  return <AgentChatbox />;
}
