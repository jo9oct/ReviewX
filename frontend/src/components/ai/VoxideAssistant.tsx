// STATUS: CREATED

import { VoxideWidget } from "@voxide/react";
import { voxide } from "../../services/voxide";

export default function VoxideAssistant() {
  return <VoxideWidget client={voxide} />;
}