"use client";
import DocCopilot from "./Copilot";
export default function AskAI({ machine }: { machine?: string }) {
  return <DocCopilot scope="ask" machine={machine} title="Ask AI — multi-document copilot" sub="Drop manuals, P&IDs, test sheets, logs or photos. Get insights, cited standards, a diagram, and follow-ups that remember." defaultQ="My centrifugal pump is noisy and the discharge pressure dropped" />;
}
